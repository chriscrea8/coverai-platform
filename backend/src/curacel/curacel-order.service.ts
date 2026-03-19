import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { CuracelService } from './curacel.service';
import { Policy, PolicyStatus } from '../policies/policy.entity';
import { User } from '../users/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { v4 as uuidv4 } from 'uuid';
import { InsuranceProduct } from '../insurance-products/insurance-product.entity';
import { InsuranceProvider } from '../insurance-providers/insurance-provider.entity';

// ─────────────────────────────────────────────────────────────────────────────
// CURACEL ORDER SERVICE
//
// Handles the full purchase lifecycle:
//   1. createOrder()     → create customer on Curacel, place order, store locally
//   2. handleWebhook()   → process Curacel events and keep our DB in sync
//   3. syncPolicies()    → pull all Curacel policies and reconcile with our DB
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class CuracelOrderService {
  private readonly logger = new Logger(CuracelOrderService.name);
  private readonly partnerKey: string | null;

  constructor(
    @InjectRepository(Policy) private readonly policyRepo: Repository<Policy>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(InsuranceProduct) private readonly productRepo: Repository<InsuranceProduct>,
    @InjectRepository(InsuranceProvider) private readonly providerRepo: Repository<InsuranceProvider>,
    private readonly curacelService: CuracelService,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
  ) {
    this.partnerKey = this.configService.get<string>('CURACEL_PARTNER_KEY') || null;
  }

  // ── FULL PURCHASE FLOW ─────────────────────────────────────────────────────
  async createOrder(userId: string, dto: {
    product_code: string;
    policy_start_date: string;
    payment_type?: string;
    asset_value?: number;
    asset_ref?: string;
    premium_frequency?: string;
    vehicle_value?: number;
    registration_number?: string;
    vehicle_make?: string;
    vehicle_model?: string;
    vehicle_year?: string;
    vehicle_color?: string;
    vehicle_class?: string;
    preferred_hospital_location?: string;
    beneficiaries?: any[];
    metadata?: Record<string, any>;
  }) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    // Step 1: Get or create customer on Curacel
    const nameParts = (user.name || 'Unknown User').split(' ');
    const customerRef = `coverai-${userId.slice(0, 8)}`;
    const customerResult = await this.curacelService.createCustomer({
      first_name: nameParts[0] || 'Customer',
      last_name: nameParts.slice(1).join(' ') || 'User',
      email: user.email,
      phone: user.phone || '',
    });

    const actualRef = customerResult?.data?.ref || customerRef;

    // Step 2: Build the order payload
    const orderPayload: Record<string, any> = {
      product_code: dto.product_code,
      customer_ref: actualRef,
      payment_type: dto.payment_type || 'wallet',
      policy_start_date: dto.policy_start_date,
      premium_frequency: dto.premium_frequency || 'annually',
      asset_ref: dto.asset_ref || `coverai-user-${userId.slice(0, 8)}`,
    };

    // Add product-specific fields
    if (dto.vehicle_value || dto.asset_value) orderPayload.asset_value = dto.vehicle_value || dto.asset_value;
    if (dto.registration_number) orderPayload.registration_number = dto.registration_number;
    if (dto.vehicle_make) orderPayload.vehicle_make = dto.vehicle_make;
    if (dto.vehicle_model) orderPayload.vehicle_model = dto.vehicle_model;
    if (dto.vehicle_year) orderPayload.vehicle_year = dto.vehicle_year;
    if (dto.vehicle_color) orderPayload.vehicle_color = dto.vehicle_color;
    if (dto.vehicle_class) orderPayload.vehicle_class = dto.vehicle_class;
    if (dto.preferred_hospital_location) orderPayload.preferred_hospital_location = dto.preferred_hospital_location;
    if (dto.beneficiaries) orderPayload.beneficiaries = dto.beneficiaries;
    if (this.partnerKey) orderPayload.child_partner_id = this.partnerKey;

    // Step 3: Place the order on Curacel
    this.logger.log(`Creating Curacel order for user ${userId}: product=${dto.product_code}`);
    const order = await this.curacelService.createOrder(orderPayload);

    // Step 4: Create internal policy record
    const policyNumber = `POL-CURACEL-${new Date().getFullYear()}-${uuidv4().split('-')[0].toUpperCase()}`;
    const startDate = new Date(dto.policy_start_date);
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);

    const policy = this.policyRepo.create({
      policyNumber,
      userId,
      premiumAmount: order?.order?.amount_due || order?.order?.product_price || 0,
      commissionAmount: order?.order?.partner_commission || 0,
      policyStatus: PolicyStatus.PENDING,
      startDate,
      endDate,
      coverageDetails: {
        curacelOrderId: order?.order?.id,
        curacelProductCode: dto.product_code,
        curacelCustomerRef: actualRef,
        paymentType: dto.payment_type || 'wallet',
        ...dto.metadata,
      },
    });

    await this.policyRepo.save(policy);
    this.logger.log(`Internal policy created: ${policyNumber} (Curacel order: ${order?.order?.id})`);

    // Step 5: Notify user
    try {
      await this.notificationsService.createInApp(userId, {
        subject: `🛡️ Insurance Order Placed`,
        message: `Your insurance order has been placed with Curacel. Policy: ${policyNumber}. ${order?.order?.payment_instructions?.message || 'Complete payment to activate.'}`,
        entityType: 'policy',
        entityId: policy.id,
      });
    } catch {}

    return {
      success: true,
      policyNumber,
      policyId: policy.id,
      curacelOrder: order?.order || order,
      paymentInstructions: order?.order?.payment_instructions,
      amountDue: order?.order?.amount_due,
      currency: order?.order?.currency || 'NGN',
      message: order?.order?.payment_instructions?.message || 'Order placed. Complete payment to activate policy.',
    };
  }

  // ── WEBHOOK EVENT HANDLER ─────────────────────────────────────────────────
  async handleWebhookEvent(payload: any) {
    // Curacel sends different event structures — normalise them
    const event = payload?.event || payload?.type || payload?.action || '';
    const data = payload?.data || payload?.order || payload?.policy || payload;

    this.logger.log(`Processing Curacel event: ${event}`);

    try {
      if (event.includes('order') && (event.includes('paid') || event.includes('success') || data?.status === 'paid')) {
        await this.onOrderPaid(data);
      } else if (event.includes('policy') && (event.includes('issued') || event.includes('active') || data?.status === 'active')) {
        await this.onPolicyIssued(data);
      } else if (event.includes('claim')) {
        await this.onClaimUpdated(data);
      } else if (event.includes('order') && (event.includes('failed') || data?.status === 'failed')) {
        await this.onOrderFailed(data);
      } else {
        // Log unknown events but don't fail
        this.logger.log(`Unhandled Curacel event: ${event} — stored for audit`);
      }
    } catch (e) {
      this.logger.error(`Webhook event processing failed: ${e.message}`);
      // Never throw from webhook — always return 200 to Curacel
    }
  }

  // ── EVENT: Order Paid ─────────────────────────────────────────────────────
  private async onOrderPaid(data: any) {
    const orderId = data?.id || data?.order_id;
    const assetRef = data?.asset_ref || data?.metadata?.asset_ref;

    this.logger.log(`Order paid: Curacel order ID=${orderId}, asset_ref=${assetRef}`);

    // Find our internal policy linked to this Curacel order
    const policy = await this.findPolicyByCuracelOrder(orderId, assetRef);
    if (!policy) {
      this.logger.warn(`Order paid but no matching internal policy found for Curacel order ${orderId}`);
      return;
    }

    // Activate the policy
    await this.policyRepo.update(policy.id, {
      policyStatus: PolicyStatus.ACTIVE,
      startDate: data?.policy_start_date ? new Date(data.policy_start_date) : policy.startDate,
      coverageDetails: {
        ...(policy.coverageDetails as Record<string, any> || {}),
        curacelOrderStatus: 'paid',
        paidAt: new Date().toISOString(),
      },
    });

    this.logger.log(`Policy ${policy.policyNumber} ACTIVATED via Curacel webhook`);

    // Notify user
    const user = await this.userRepo.findOne({ where: { id: policy.userId } });
    if (user) {
      await this.notificationsService.createInApp(policy.userId, {
        subject: '✅ Insurance Policy Activated!',
        message: `Your policy ${policy.policyNumber} is now active. You are covered! View your policy in the dashboard.`,
        entityType: 'policy',
        entityId: policy.id,
      }).catch(() => {});

      // Send email
      await this.notificationsService.sendEmail(user, {
        subject: `✅ Your Insurance is Active — ${policy.policyNumber}`,
        message: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
            <div style="background:linear-gradient(135deg,#0A0F1E,#1A3A8F);padding:24px;border-radius:12px 12px 0 0;text-align:center">
              <h2 style="color:#F4A623;margin:0">🛡️ You're Covered!</h2>
            </div>
            <div style="background:#f9f9f9;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e0e0e0">
              <p>Hi ${user.name},</p>
              <p>Great news — your insurance policy is now <strong style="color:#2EC97E">active</strong>.</p>
              <table style="width:100%;border-collapse:collapse;margin:16px 0">
                <tr style="border-bottom:1px solid #eee"><td style="padding:8px;color:#666">Policy Number</td><td style="padding:8px;font-weight:bold">${policy.policyNumber}</td></tr>
                <tr style="border-bottom:1px solid #eee"><td style="padding:8px;color:#666">Status</td><td style="padding:8px;color:#2EC97E;font-weight:bold">ACTIVE ✅</td></tr>
                <tr><td style="padding:8px;color:#666">Valid Until</td><td style="padding:8px;font-weight:bold">${new Date(policy.endDate).toDateString()}</td></tr>
              </table>
              <div style="text-align:center;margin-top:24px">
                <a href="https://coverai-platform.vercel.app/dashboard" style="background:#F4A623;color:#0A0F1E;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold">View My Policy →</a>
              </div>
            </div>
          </div>`,
        entityType: 'policy',
        entityId: policy.id,
      }).catch(() => {});

      // WhatsApp notification
      await this.sendWhatsAppNotification(user, `✅ *CoverAI — Policy Activated!*\n\nHi ${user.name}, your insurance is now active! 🛡️\n\nPolicy: *${policy.policyNumber}*\nValid until: ${new Date(policy.endDate).toDateString()}\n\nView your dashboard: coverai-platform.vercel.app/dashboard`).catch(() => {});
    }
  }

  // ── EVENT: Policy Issued ──────────────────────────────────────────────────
  private async onPolicyIssued(data: any) {
    const curacelPolicyNumber = data?.number || data?.policy_number;
    const orderId = data?.order?.id || data?.order_id;
    const documentUrl = data?.document_url;

    this.logger.log(`Policy issued: Curacel policy=${curacelPolicyNumber}, order=${orderId}`);

    const policy = await this.findPolicyByCuracelOrder(orderId, null);
    if (!policy) return;

    // Store real Curacel policy number + document URL
    await this.policyRepo.update(policy.id, {
      policyStatus: PolicyStatus.ACTIVE,
      documentUrl: documentUrl || policy.documentUrl,
      startDate: data?.start_date ? new Date(data.start_date) : policy.startDate,
      endDate: data?.end_date ? new Date(data.end_date) : policy.endDate,
      coverageDetails: {
        ...(policy.coverageDetails as Record<string, any> || {}),
        curacelPolicyNumber,
        curacelPolicyId: data?.id,
        documentUrl,
        insurer: data?.insurer?.name,
        issuedAt: new Date().toISOString(),
      },
    });

    this.logger.log(`Policy ${policy.policyNumber} updated with Curacel policy number: ${curacelPolicyNumber}`);
  }

  // ── EVENT: Claim Updated ──────────────────────────────────────────────────
  private async onClaimUpdated(data: any) {
    this.logger.log(`Claim updated from Curacel: ${JSON.stringify(data).slice(0, 200)}`);
    // Claim sync logic — find claim by Curacel reference and update status
    // This is handled by the claims module when it gets the webhook
  }

  // ── EVENT: Order Failed ───────────────────────────────────────────────────
  private async onOrderFailed(data: any) {
    const orderId = data?.id || data?.order_id;
    this.logger.warn(`Order failed on Curacel: order=${orderId}`);

    const policy = await this.findPolicyByCuracelOrder(orderId, null);
    if (!policy) return;

    await this.policyRepo.update(policy.id, {
      coverageDetails: {
        ...(policy.coverageDetails as Record<string, any> || {}),
        curacelOrderStatus: 'failed',
        failedAt: new Date().toISOString(),
        failureReason: data?.message || 'Order failed on Curacel side',
      },
    });

    const user = await this.userRepo.findOne({ where: { id: policy.userId } });
    if (user) {
      await this.notificationsService.createInApp(policy.userId, {
        subject: '⚠️ Insurance Order Failed',
        message: `Your insurance order for policy ${policy.policyNumber} could not be completed. Please try again or contact support.`,
        entityType: 'policy',
        entityId: policy.id,
      }).catch(() => {});
    }
  }

  // ── GET ORDER ─────────────────────────────────────────────────────────────
  async getOrder(orderId: string) {
    return this.curacelService.getOrderById(orderId);
  }

  // ── SYNC POLICIES FROM CURACEL ────────────────────────────────────────────
  async syncPoliciesFromCuracel(): Promise<{ synced: number; message: string }> {
    try {
      const response = await this.curacelService.getPolicies({ page: 1 });
      const curacelPolicies: any[] = response?.data || [];
      let synced = 0;

      for (const cp of curacelPolicies) {
        // Find matching internal policy by Curacel order ID
        const orderId = cp?.order?.id;
        if (!orderId) continue;

        const policy = await this.policyRepo
          .createQueryBuilder('p')
          .where(`p.coverage_details->>'curacelOrderId' = :orderId`, { orderId: String(orderId) })
          .getOne();

        if (policy) {
          await this.policyRepo.update(policy.id, {
            policyStatus: cp.status === 'active' ? PolicyStatus.ACTIVE : policy.policyStatus,
            documentUrl: cp.document_url || policy.documentUrl,
            startDate: cp.start_date ? new Date(cp.start_date) : policy.startDate,
            endDate: cp.end_date ? new Date(cp.end_date) : policy.endDate,
            coverageDetails: {
              ...(policy.coverageDetails as Record<string, any> || {}),
              curacelPolicyNumber: cp.number,
              curacelPolicyId: cp.id,
              documentUrl: cp.document_url,
              insurer: cp.insurer?.name,
              syncedAt: new Date().toISOString(),
            },
          });
          synced++;
        }
      }

      return { synced, message: `Synced ${synced} of ${curacelPolicies.length} Curacel policies` };
    } catch (e) {
      this.logger.error('Policy sync failed: ' + e.message);
      return { synced: 0, message: 'Sync failed: ' + e.message };
    }
  }

  // ── HELPERS ───────────────────────────────────────────────────────────────
  private async findPolicyByCuracelOrder(orderId: string | number, assetRef?: string): Promise<Policy | null> {
    if (orderId) {
      const policy = await this.policyRepo
        .createQueryBuilder('p')
        .where(`p.coverage_details->>'curacelOrderId' = :orderId`, { orderId: String(orderId) })
        .getOne();
      if (policy) return policy;
    }

    if (assetRef) {
      // Try matching by asset_ref which we embed in coverageDetails
      const policy = await this.policyRepo
        .createQueryBuilder('p')
        .where(`p.coverage_details->>'asset_ref' = :ref`, { ref: assetRef })
        .getOne();
      if (policy) return policy;
    }

    return null;
  }

  private async sendWhatsAppNotification(user: User, text: string) {
    if (!user.phone) return;
    const token = this.configService.get<string>('WHATSAPP_TOKEN');
    const phoneId = this.configService.get<string>('WHATSAPP_PHONE_ID');
    if (!token || !phoneId) return;
    const phone = user.phone.replace(/\D/g, '').replace(/^0/, '234');
    await fetch(`https://graph.facebook.com/v22.0/${phoneId}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: phone, type: 'text', text: { body: text } }),
    });
  }
  // ── SYNC CURACEL CATALOGUE TO INTERNAL DB ───────────────────────────────
  // This makes Curacel products visible in the Admin Products & Providers tabs
  async syncCatalogueToInternalDB(): Promise<{ providers: number; products: number; message: string }> {
    this.logger.log('Starting Curacel catalogue sync to internal DB...');
    let providerCount = 0;
    let productCount = 0;

    try {
      // Step 1: Fetch all products from Curacel
      const allProducts: any[] = [];
      for (const typeId of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]) {
        try {
          const res = await this.curacelService.getProducts({ type: typeId, calculate_premium: 1 });
          const prods = res?.data || [];
          allProducts.push(...prods);
        } catch {}
      }

      // Deduplicate by code
      const seen = new Set<string>();
      const unique = allProducts.filter(p => {
        if (seen.has(p.code)) return false;
        seen.add(p.code);
        return true;
      });

      // Step 2: Sync providers (insurers)
      const insurerMap = new Map<string, string>(); // code -> internal UUID
      const insurers = [...new Map(unique.map(p => [p.insurer?.code, p.insurer])).values()].filter(Boolean);

      for (const insurer of insurers) {
        if (!insurer?.code) continue;
        const slug = `curacel-${insurer.code.toLowerCase()}`;
        let provider = await this.providerRepo.findOne({ where: { slug } });

        if (!provider) {
          provider = this.providerRepo.create({
            name: insurer.name,
            slug,
            logoUrl: insurer.logo_url,
            contactEmail: 'support@curacel.ai',
            description: `${insurer.name} — via Curacel Grow API`,
            status: 'active',
            syncStatus: 'success',
            lastSyncedAt: new Date(),
          });
        } else {
          provider.name = insurer.name;
          provider.logoUrl = insurer.logo_url || provider.logoUrl;
          provider.status = 'active';
          provider.syncStatus = 'success';
          provider.lastSyncedAt = new Date();
        }

        await this.providerRepo.save(provider);
        insurerMap.set(insurer.code, provider.id);
        providerCount++;
      }

      // Step 3: Sync products
      for (const p of unique) {
        if (!p.code || !p.title) continue;
        const productCode = `curacel-${p.code}`;
        const providerId = insurerMap.get(p.insurer?.code) || null;

        // Map Curacel type to internal category
        const categoryMap: Record<string, string> = {
          'Health': 'health', '3rd Party Auto': 'motor', 'Comprehensive Auto': 'motor',
          'Life': 'life', 'Goods in Transit': 'property', 'Marine': 'property',
          'Credit Life': 'life', 'Gadget': 'property', 'Fire and Burglary': 'property',
          'Travel': 'health', 'Personal Accident': 'health', 'Micro Health': 'health',
          'Investment Life': 'life', 'Education investment': 'life',
        };
        const category = categoryMap[p.product_type?.name] || 'general';

        // Calculate premiums
        const isRelative = p.premium_type === 'relative';
        const premiumMin = isRelative ? (p.min_premium || 0) : (p.price || p.premium_rate || 0);
        const premiumMax = isRelative ? 0 : (p.price || p.premium_rate || 0);

        let product = await this.productRepo.findOne({ where: { productCode } });

        if (!product) {
          product = this.productRepo.create({
            productCode,
            providerId: providerId || undefined,
            productName: p.title,
            category,
            description: `${p.title} by ${p.insurer?.name || 'Curacel'}. ${p.product_type?.name || ''} insurance.`,
            premiumMin,
            premiumMax,
            commissionRate: parseFloat(p.partner_commission_rate || '0') / 100,
            durationMonths: 12,
            isSmeProduct: ['Goods in Transit', 'Marine', 'Fire and Burglary'].includes(p.product_type?.name),
            status: 'active',
            tags: [p.product_type?.name, p.insurer?.name].filter(Boolean),
            coverageDetails: {
              curacelCode: p.code,
              curacelId: p.id,
              premiumType: p.premium_type,
              premiumRate: p.premium_rate,
              premiumRateUnit: p.premium_rate_unit,
              frequencies: p.premium_frequencies,
              benefits: p.cover_benefits || [],
            },
          });
        } else {
          product.productName = p.title;
          product.premiumMin = premiumMin;
          product.premiumMax = premiumMax;
          product.commissionRate = parseFloat(p.partner_commission_rate || '0') / 100;
          product.status = 'active';
          product.tags = [p.product_type?.name, p.insurer?.name].filter(Boolean);
          if (providerId) product.providerId = providerId;
        }

        await this.productRepo.save(product);
        productCount++;
      }

      // Update provider product counts
      for (const [code, id] of insurerMap.entries()) {
        const count = await this.productRepo.count({ where: { providerId: id } });
        await this.providerRepo.update(id, { syncedProductCount: count });
      }

      this.logger.log(`Curacel sync complete: ${providerCount} providers, ${productCount} products`);
      return { providers: providerCount, products: productCount, message: `✅ Synced ${productCount} products from ${providerCount} insurers into admin catalogue` };

    } catch (e) {
      this.logger.error('Curacel catalogue sync error: ' + e.message);
      return { providers: providerCount, products: productCount, message: 'Sync failed: ' + e.message };
    }
  }
}
