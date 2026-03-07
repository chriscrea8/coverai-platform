// ── admin/admin.service.ts ───────────────────────────────────
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from '../users/user.entity';
import { Policy } from '../policies/policy.entity';
import { Claim } from '../claims/claim.entity';
import { Commission } from '../commissions/commissions.module';
import { ClaimsService } from '../claims/claims.service';
import { CommissionsService } from '../commissions/commissions.service';
import { ReviewClaimDto } from '../claims/claims.module';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Policy) private readonly policyRepo: Repository<Policy>,
    @InjectRepository(Claim) private readonly claimRepo: Repository<Claim>,
    private readonly claimsService: ClaimsService,
    private readonly commissionsService: CommissionsService,
  ) {}

  async getUsers(filters: { role?: string; page?: number }) {
    const take = 20;
    const skip = ((filters.page || 1) - 1) * take;
    const qb = this.userRepo.createQueryBuilder('u').skip(skip).take(take).orderBy('u.created_at', 'DESC');
    if (filters.role) qb.andWhere('u.role = :role', { role: filters.role });
    const [users, total] = await qb.getManyAndCount();
    return { users: users.map(u => { const { passwordHash, ...safe } = u as any; return safe; }), total, page: filters.page || 1 };
  }

  async suspendUser(userId: string) {
    await this.userRepo.update(userId, { status: UserStatus.SUSPENDED });
    return { message: 'User suspended' };
  }

  async getPolicies(filters: { status?: string }) {
    const where: any = {};
    if (filters.status) where.policyStatus = filters.status;
    return this.policyRepo.find({ where, order: { createdAt: 'DESC' }, take: 50 });
  }

  async getClaims(filters: { status?: string }) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    return this.claimRepo.find({ where, order: { createdAt: 'DESC' }, take: 50 });
  }

  async reviewClaim(claimId: string, reviewerId: string, dto: ReviewClaimDto) {
    return this.claimsService.review(claimId, reviewerId, dto);
  }

  async getProviders() {
    // Stub — InsuranceProvidersService injected in full impl
    return [];
  }

  async approveProvider(id: string) {
    return { message: 'Provider approved', id };
  }

  async getRevenueAnalytics(filters: { startDate?: string; endDate?: string }) {
    return this.commissionsService.getReport({
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
    });
  }

  async getDashboardKpis() {
    const [totalUsers, totalPolicies, totalClaims] = await Promise.all([
      this.userRepo.count(),
      this.policyRepo.count(),
      this.claimRepo.count(),
    ]);
    const { summary } = await this.commissionsService.getReport();
    return { totalUsers, totalPolicies, totalClaims, revenue: summary };
  }
}

// ── admin/admin.module.ts ────────────────────────────────────
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Policy } from '../policies/policy.entity';
import { Claim } from '../claims/claim.entity';
import { ClaimsModule } from '../claims/claims.module';
import { CommissionsModule } from '../commissions/commissions.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Policy, Claim]),
    ClaimsModule,
    CommissionsModule,
    UsersModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
