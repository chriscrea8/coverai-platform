import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from '../users/user.entity';
import { Policy, PolicyStatus } from '../policies/policy.entity';
import { Claim, ClaimStatus } from '../claims/claim.entity';
import { InsuranceProvider } from '../insurance-providers/insurance-provider.entity';
import { InsuranceProduct } from '../insurance-products/insurance-product.entity';
import { Payment } from '../payments/payment.entity';
import { CommissionsService } from '../commissions/commissions.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(User)              private userRepo:     Repository<User>,
    @InjectRepository(Policy)            private policyRepo:   Repository<Policy>,
    @InjectRepository(Claim)             private claimRepo:    Repository<Claim>,
    @InjectRepository(InsuranceProvider) private providerRepo: Repository<InsuranceProvider>,
    @InjectRepository(InsuranceProduct)  private productRepo:  Repository<InsuranceProduct>,
    @InjectRepository(Payment)           private paymentRepo:  Repository<Payment>,
    private readonly commissionsService: CommissionsService,
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
  ) {}

  // ── STATS ─────────────────────────────────────────────────
  async getStats() {
    const [totalUsers, totalPolicies, totalClaims, totalProviders, totalProducts] = await Promise.all([
      this.userRepo.count(),
      this.policyRepo.count(),
      this.claimRepo.count(),
      this.providerRepo.count(),
      this.productRepo.count(),
    ]);
    const activePolicies = await this.policyRepo.count({ where: { policyStatus: PolicyStatus.ACTIVE } });
    const openClaims = await this.claimRepo.count({ where: [
      { status: ClaimStatus.SUBMITTED },
      { status: ClaimStatus.UNDER_REVIEW },
    ]});
    const payments = await this.paymentRepo.find({ where: { paymentStatus: 'successful' as any } });
    const totalRevenue = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    return { totalUsers, totalPolicies, activePolicies, totalClaims, openClaims, totalProviders, totalProducts, totalRevenue };
  }

  // ── USERS ─────────────────────────────────────────────────
  async getUsers(filters: { role?: string }) {
    const qb = this.userRepo.createQueryBuilder('u').orderBy('u.createdAt', 'DESC').take(100);
    if (filters.role) qb.andWhere('u.role = :role', { role: filters.role });
    const users = await qb.getMany();
    return users.map(u => { const { passwordHash, refreshTokenHash, passwordResetToken, emailVerificationOtp, emailOtpExpires, kycIdNumber, ...safe } = u as any; return safe; });
  }

  async suspendUser(userId: string) {
    await this.userRepo.update(userId, { status: UserStatus.SUSPENDED });
    return { message: 'User suspended', id: userId };
  }

  async activateUser(userId: string) {
    await this.userRepo.update(userId, { status: UserStatus.ACTIVE });
    return { message: 'User activated', id: userId };
  }

  async changeUserRole(userId: string, role: string) {
    await this.userRepo.update(userId, { role: role as any });
    return { message: 'Role updated', id: userId, role };
  }

  // ── POLICIES ──────────────────────────────────────────────
  async getPolicies(filters: { status?: string }) {
    const qb = this.policyRepo.createQueryBuilder('p')
      .leftJoinAndSelect('p.user', 'user')
      .orderBy('p.createdAt', 'DESC').take(100);
    if (filters.status) qb.andWhere('p.policyStatus = :s', { s: filters.status });
    const policies = await qb.getMany();
    return policies.map(p => ({
      ...p,
      user: p.user ? { id: p.user.id, name: p.user.name, email: p.user.email } : null,
    }));
  }

  async activatePolicy(policyId: string) {
    const policy = await this.policyRepo.findOne({ where: { id: policyId } });
    if (!policy) throw new NotFoundException('Policy not found');
    await this.policyRepo.update(policyId, {
      policyStatus: PolicyStatus.ACTIVE,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });
    return { message: 'Policy activated', id: policyId };
  }

  async cancelPolicy(policyId: string) {
    const policy = await this.policyRepo.findOne({ where: { id: policyId } });
    if (!policy) throw new NotFoundException('Policy not found');
    await this.policyRepo.update(policyId, { policyStatus: PolicyStatus.CANCELLED });
    return { message: 'Policy cancelled', id: policyId };
  }

  // ── CLAIMS ────────────────────────────────────────────────
  async getClaims(filters: { status?: string }) {
    const qb = this.claimRepo.createQueryBuilder('c')
      .leftJoinAndSelect('c.user', 'user')
      .leftJoinAndSelect('c.policy', 'policy')
      .orderBy('c.createdAt', 'DESC').take(100);
    if (filters.status) qb.andWhere('c.status = :s', { s: filters.status });
    const claims = await qb.getMany();
    return claims.map(c => ({
      ...c,
      user: c.user ? {
        id: c.user.id, name: c.user.name, email: c.user.email,
        bankName: (c.user as any).bankName || null,
        bankAccountName: (c.user as any).bankAccountName || null,
        bankAccountNumber: (c.user as any).bankAccountNumber
          ? '••••••' + (c.user as any).bankAccountNumber.slice(-4) : null,
      } : null,
    }));
  }

  async markClaimUnderReview(claimId: string) {
    const claim = await this.claimRepo.findOne({ where: { id: claimId } });
    if (!claim) throw new NotFoundException('Claim not found');
    await this.claimRepo.update(claimId, { status: ClaimStatus.UNDER_REVIEW });
    return { message: 'Claim moved to under review', id: claimId };
  }

  async approveClaim(claimId: string, reviewerId: string, note?: string) {
    const claim = await this.claimRepo.findOne({ where: { id: claimId } });
    if (!claim) throw new NotFoundException('Claim not found');
    await this.claimRepo.update(claimId, {
      status: ClaimStatus.APPROVED,
      reviewerId,
      reviewedAt: new Date(),
      reviewerNotes: note || 'Approved by admin',
    });
    // Notify user
    try {
      const user = await this.usersService.findById(claim.userId);
      if (user) await this.notificationsService.sendEmail(user, {
        subject: `✅ Claim Approved — ${claim.claimNumber}`,
        message: [
          `Hello ${user.name},`,
          '',
          `Great news! Your claim ${claim.claimNumber} has been approved.`,
          claim.approvedAmount ? `Approved Amount: ₦${Number(claim.approvedAmount).toLocaleString()}` : '',
          note ? `Reviewer Note: ${note}` : '',
          '',
          'Our payments team will process your payout within 5–7 business days.',
          'You will receive a separate notification when the payment is initiated.',
          '',
          'Track your claim at coverai.ng/dashboard',
        ].filter(Boolean).join('\n'),
        entityType: 'claim',
        entityId: claim.id,
        metadata: { claimNumber: claim.claimNumber, status: 'approved' },
      });
    } catch {}
    return { message: 'Claim approved', id: claimId };
  }

  async rejectClaim(claimId: string, reviewerId: string, note?: string) {
    const claim = await this.claimRepo.findOne({ where: { id: claimId } });
    if (!claim) throw new NotFoundException('Claim not found');
    await this.claimRepo.update(claimId, {
      status: ClaimStatus.REJECTED,
      reviewerId,
      reviewedAt: new Date(),
      reviewerNotes: note || 'Rejected by admin',
      rejectionReason: note || null,
    });
    // Notify user
    try {
      const user = await this.usersService.findById(claim.userId);
      if (user) await this.notificationsService.sendEmail(user, {
        subject: `❌ Claim Decision — ${claim.claimNumber}`,
        message: [
          `Hello ${user.name},`,
          '',
          `After careful review, your claim ${claim.claimNumber} could not be approved at this time.`,
          note ? `Reason: ${note}` : '',
          '',
          'If you believe this decision is incorrect, please contact our support team at claims@coverai.ng with your claim number and any additional documentation.',
        ].filter(Boolean).join('\n'),
        entityType: 'claim',
        entityId: claim.id,
        metadata: { claimNumber: claim.claimNumber, status: 'rejected' },
      });
    } catch {}
    return { message: 'Claim rejected', id: claimId };
  }

  async markClaimPaid(claimId: string, reviewerId: string, note?: string) {
    const claim = await this.claimRepo.findOne({ where: { id: claimId } });
    if (!claim) throw new NotFoundException('Claim not found');
    if (claim.status !== ClaimStatus.APPROVED) throw new NotFoundException('Claim must be approved first');
    await this.claimRepo.update(claimId, {
      status: ClaimStatus.PAID,
      resolvedAt: new Date(),
      reviewerNotes: note ? `${claim.reviewerNotes || ''}\nPayout: ${note}`.trim() : claim.reviewerNotes,
    });
    // Notify user
    try {
      const user = await this.usersService.findById(claim.userId);
      if (user) await this.notificationsService.sendEmail(user, {
        subject: `💰 Claim Payout Sent — ${claim.claimNumber}`,
        message: [
          `Hello ${user.name},`,
          '',
          `Your claim payout for ${claim.claimNumber} has been processed.`,
          claim.approvedAmount ? `Amount: ₦${Number(claim.approvedAmount).toLocaleString()}` : '',
          note ? `Reference: ${note}` : '',
          '',
          'Funds should appear in your account within 1–2 business days depending on your bank.',
          '',
          'Thank you for choosing CoverAI.',
        ].filter(Boolean).join('\n'),
        entityType: 'claim',
        entityId: claim.id,
        metadata: { claimNumber: claim.claimNumber, status: 'paid' },
      });
    } catch {}
    return { message: 'Claim marked as paid', id: claimId };
  }

  // ── PROVIDERS ─────────────────────────────────────────────
  async getProviders() {
    const providers = await this.providerRepo.find({ order: { createdAt: 'DESC' } });
    return providers.map(p => ({
      ...p,
      email: p.contactEmail,
      phone: p.contactPhone,
      licenseNumber: p.naicomLicense,
      hasApiKey: !!p.apiKeyEncrypted,
      // Never expose the actual key
      apiKeyEncrypted: undefined,
    }));
  }

  async createProvider(data: any) {
    const provider = this.providerRepo.create({
      name: data.name,
      contactEmail: data.email,
      contactPhone: data.phone,
      naicomLicense: data.licenseNumber,
      description: data.description,
      apiBaseUrl: data.apiBaseUrl || null,
      apiKeyEncrypted: data.apiKey || null, // stored as-is; swap for real encryption in prod
      slug: data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now(),
      status: 'active',
      syncStatus: data.apiKey ? 'idle' : null,
    });
    const saved = await this.providerRepo.save(provider);
    return { ...saved, hasApiKey: !!saved.apiKeyEncrypted, apiKeyEncrypted: undefined };
  }

  async setProviderStatus(id: string, status: string) {
    await this.providerRepo.update(id, { status } as any);
    return { message: `Provider ${status}`, id };
  }

  async updateProvider(id: string, data: any) {
    const update: any = {
      name: data.name,
      contactEmail: data.email,
      contactPhone: data.phone,
      naicomLicense: data.licenseNumber,
      description: data.description,
      apiBaseUrl: data.apiBaseUrl ?? undefined,
    };
    // Only update key if a new one was explicitly provided
    if (data.apiKey !== undefined && data.apiKey !== '') {
      update.apiKeyEncrypted = data.apiKey;
      update.syncStatus = 'idle';
    }
    await this.providerRepo.update(id, update);
    return { message: 'Provider updated', id };
  }

  /**
   * Calls the provider's API and upserts their products into our DB.
   * Supports two response shapes:
   *   - Array at root: [ { name, description, category, premium_min, premium_max, ... } ]
   *   - Wrapped:       { data: [...] } | { products: [...] } | { results: [...] }
   */
  async syncProviderProducts(providerId: string) {
    const provider = await this.providerRepo.findOne({ where: { id: providerId } });
    if (!provider) throw new NotFoundException('Provider not found');
    if (!provider.apiKeyEncrypted || !provider.apiBaseUrl) {
      throw new Error('Provider has no API key or base URL configured');
    }

    await this.providerRepo.update(providerId, { syncStatus: 'syncing' });

    try {
      // Normalise base URL
      const base = provider.apiBaseUrl.replace(/\/$/, '');
      const url = `${base}/products`;

      this.logger.log(`Syncing products from ${url} for provider ${provider.name}`);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${provider.apiKeyEncrypted}`,
          'X-API-Key': provider.apiKeyEncrypted,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        throw new Error(`Provider API returned ${response.status}: ${await response.text()}`);
      }

      const raw = await response.json();

      // Normalise to array
      const items: any[] = Array.isArray(raw)
        ? raw
        : raw.data ?? raw.products ?? raw.results ?? raw.items ?? [];

      if (!items.length) throw new Error('Provider API returned no products');

      let created = 0, updated = 0;

      for (const item of items) {
        // Flexible field mapping — handle different provider naming conventions
        const productName = item.name || item.product_name || item.productName || item.title;
        const category    = item.category || item.type || item.product_type || item.productType || 'business';
        const premiumMin  = Number(item.premium_min ?? item.premiumMin ?? item.min_premium ?? item.minPremium ?? 0) || undefined;
        const premiumMax  = Number(item.premium_max ?? item.premiumMax ?? item.max_premium ?? item.maxPremium ?? 0) || undefined;
        const description = item.description || item.desc || `${productName} by ${provider.name}`;
        const code        = item.code || item.product_code || item.productCode || item.id || `${provider.id.slice(0,8)}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
        const commRate    = Number(item.commission_rate ?? item.commissionRate ?? 0.10);
        const duration    = Number(item.duration_months ?? item.durationMonths ?? 12);
        const coverage    = item.coverage_details ?? item.coverageDetails ?? item.coverage ?? {};

        if (!productName) continue; // skip malformed entries

        // Upsert by product_code + provider_id
        const existing = await this.productRepo.findOne({ where: { productCode: String(code), providerId } });

        if (existing) {
          await this.productRepo.update(existing.id, {
            productName, description, category,
            premiumMin, premiumMax, commissionRate: commRate,
            durationMonths: duration, coverageDetails: coverage,
          });
          updated++;
        } else {
          await this.productRepo.save(this.productRepo.create({
            productName, description, category,
            premiumMin, premiumMax, commissionRate: commRate,
            durationMonths: duration, coverageDetails: coverage,
            providerId, productCode: String(code),
            status: 'active', isSmeProduct: true,
          }));
          created++;
        }
      }

      await this.providerRepo.update(providerId, {
        syncStatus: 'success',
        lastSyncedAt: new Date(),
        syncedProductCount: created + updated,
      });

      this.logger.log(`Sync complete for ${provider.name}: ${created} created, ${updated} updated`);
      return { success: true, created, updated, total: created + updated };

    } catch (err: any) {
      await this.providerRepo.update(providerId, { syncStatus: 'error' });
      this.logger.error(`Sync failed for provider ${provider.name}: ${err.message}`);
      throw new Error(err.message || 'Sync failed');
    }
  }


  // ── PRODUCTS ──────────────────────────────────────────────
  async getProducts() {
    const products = await this.productRepo.find({ order: { createdAt: 'DESC' } });
    // Map to frontend-friendly shape
    return products.map(p => ({
      ...p,
      name: p.productName,
      productType: p.category,
      minPremium: p.premiumMin,
      maxPremium: p.premiumMax,
    }));
  }

  async createProduct(data: any) {
    const product = this.productRepo.create({
      productName: data.name,
      description: data.description,
      category: data.productType || 'business',
      premiumMin: data.minPremium,
      premiumMax: data.maxPremium,
      coverageDetails: data.coverageDetails ? { details: data.coverageDetails } : {},
      providerId: data.providerId,
      productCode: 'PROD-' + Date.now(),
      status: 'active',
      isSmeProduct: true,
    });
    return this.productRepo.save(product);
  }

  async setProductStatus(id: string, status: string) {
    await this.productRepo.update(id, { status } as any);
    return { message: `Product ${status}`, id };
  }

  async updateProduct(id: string, data: any) {
    await this.productRepo.update(id, {
      productName: data.name,
      description: data.description,
      category: data.productType,
      premiumMin: data.minPremium,
      premiumMax: data.maxPremium,
      commissionRate: data.commissionRate,
      durationMonths: data.durationMonths,
      coverageDetails: data.coverageDetails ? { details: data.coverageDetails } : undefined,
      providerId: data.providerId,
    });
    return { message: 'Product updated', id };
  }

  // ── ANALYTICS ─────────────────────────────────────────────
  async getRevenueAnalytics(filters: { startDate?: string; endDate?: string; providerId?: string; status?: string }) {
    return this.commissionsService.getReport({
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate:   filters.endDate   ? new Date(filters.endDate)   : undefined,
      providerId: filters.providerId,
      status:     filters.status,
    });
  }

  async markCommissionPaid(id: string, notes?: string) {
    return this.commissionsService.markAsPaid(id, notes);
  }

  async markCommissionProcessing(id: string) {
    return this.commissionsService.markAsProcessing(id);
  }

  async bulkMarkCommissionsPaid(ids: string[]) {
    return this.commissionsService.bulkMarkAsPaid(ids);
  }

}
