import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from '../users/user.entity';
import { Policy, PolicyStatus } from '../policies/policy.entity';
import { Claim, ClaimStatus } from '../claims/claim.entity';
import { InsuranceProvider } from '../insurance-providers/insurance-provider.entity';
import { InsuranceProduct } from '../insurance-products/insurance-product.entity';
import { Payment } from '../payments/payment.entity';
import { CommissionsService } from '../commissions/commissions.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)              private userRepo:     Repository<User>,
    @InjectRepository(Policy)            private policyRepo:   Repository<Policy>,
    @InjectRepository(Claim)             private claimRepo:    Repository<Claim>,
    @InjectRepository(InsuranceProvider) private providerRepo: Repository<InsuranceProvider>,
    @InjectRepository(InsuranceProduct)  private productRepo:  Repository<InsuranceProduct>,
    @InjectRepository(Payment)           private paymentRepo:  Repository<Payment>,
    private readonly commissionsService: CommissionsService,
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
      user: c.user ? { id: c.user.id, name: c.user.name, email: c.user.email } : null,
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
      reviewerId: reviewerId,
      reviewedAt: new Date(),
      reviewerNotes: note || 'Approved by admin',
    });
    return { message: 'Claim approved', id: claimId };
  }

  async rejectClaim(claimId: string, reviewerId: string, note?: string) {
    const claim = await this.claimRepo.findOne({ where: { id: claimId } });
    if (!claim) throw new NotFoundException('Claim not found');
    await this.claimRepo.update(claimId, {
      status: ClaimStatus.REJECTED,
      reviewerId: reviewerId,
      reviewedAt: new Date(),
      reviewerNotes: note || 'Rejected by admin',
    });
    return { message: 'Claim rejected', id: claimId };
  }

  // ── PROVIDERS ─────────────────────────────────────────────
  async getProviders() {
    const providers = await this.providerRepo.find({ order: { createdAt: 'DESC' } });
    return providers.map(p => ({
      ...p,
      email: p.contactEmail,
      phone: p.contactPhone,
      licenseNumber: p.naicomLicense,
    }));
  }

  async createProvider(data: any) {
    const provider = this.providerRepo.create({
      name: data.name,
      contactEmail: data.email,
      contactPhone: data.phone,
      address: data.address,
      naicomLicense: data.licenseNumber,
      description: data.description,
      slug: data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      status: 'active',
    });
    return this.providerRepo.save(provider);
  }

  async setProviderStatus(id: string, status: string) {
    await this.providerRepo.update(id, { status } as any);
    return { message: `Provider ${status}`, id };
  }

  async updateProvider(id: string, data: any) {
    await this.providerRepo.update(id, {
      name: data.name,
      contactEmail: data.email,
      contactPhone: data.phone,
      address: data.address,
      naicomLicense: data.licenseNumber,
      description: data.description,
    });
    return { message: 'Provider updated', id };
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
  async getRevenueAnalytics(filters: { startDate?: string; endDate?: string }) {
    return this.commissionsService.getReport({
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
    });
  }
}
