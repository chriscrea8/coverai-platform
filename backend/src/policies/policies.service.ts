import {
  Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Policy, PolicyStatus } from './policy.entity';
import { PurchasePolicyDto } from './policies.dto';
import { CommissionsService } from '../commissions/commissions.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class PoliciesService {
  private readonly logger = new Logger(PoliciesService.name);

  constructor(
    @InjectRepository(Policy) private readonly policyRepo: Repository<Policy>,
    private readonly commissionsService: CommissionsService,
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
  ) {}

  // ── PURCHASE ───────────────────────────────────────────────
  async purchase(userId: string, dto: PurchasePolicyDto): Promise<Policy> {
    // Generate unique policy number
    const policyNumber = `POL-${new Date().getFullYear()}-${uuidv4().split('-')[0].toUpperCase()}`;

    const commissionRate = 0.10; // 10% default; fetched from product in real impl
    const commissionAmount = Number(dto.premiumAmount) * commissionRate;

    const startDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);

    const policy = this.policyRepo.create({
      policyNumber,
      userId,
      smeId: dto.smeId,
      productId: dto.productId,
      providerId: dto.providerId,
      premiumAmount: dto.premiumAmount,
      commissionAmount,
      coverageAmount: dto.coverageAmount,
      policyStatus: PolicyStatus.PENDING,
      startDate,
      endDate,
      policyDetails: dto.policyDetails || {},
      autoRenew: dto.autoRenew || false,
    });

    await this.policyRepo.save(policy);
    this.logger.log(`Policy created: ${policyNumber} for user ${userId}`);

    // Create commission record
    await this.commissionsService.create({
      policyId: policy.id,
      providerId: policy.providerId,
      grossPremium: policy.premiumAmount,
      commissionRate,
      commissionAmount,
    });

    // Notify user
    const user = await this.usersService.findById(userId);
    if (user) {
      await this.notificationsService.sendEmail(user, {
        subject: 'Policy Created — Payment Required',
        message: `Your policy ${policyNumber} has been created. Complete payment to activate it.`,
      }).catch(() => {});
    }

    return policy;
  }

  // ── ACTIVATE (called after payment) ───────────────────────
  async activate(policyId: string, paymentId?: string): Promise<Policy> {
    const policy = await this.findById(policyId);
    policy.policyStatus = PolicyStatus.ACTIVE;
    await this.policyRepo.save(policy);

    const user = await this.usersService.findById(policy.userId);
    if (user) {
      await this.notificationsService.sendEmail(user, {
        subject: '🎉 Policy Activated!',
        message: `Congratulations! Your policy ${policy.policyNumber} is now active.`,
      }).catch(() => {});
    }

    return policy;
  }

  async findByUser(userId: string): Promise<Policy[]> {
    return this.policyRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<Policy> {
    const policy = await this.policyRepo.findOne({ where: { id } });
    if (!policy) throw new NotFoundException('Policy not found');
    return policy;
  }

  async findByIdForUser(id: string, userId: string): Promise<Policy> {
    const policy = await this.policyRepo.findOne({ where: { id } });
    if (!policy) throw new NotFoundException('Policy not found');
    // Security: users can only view their own policies
    if (policy.userId !== userId) throw new NotFoundException('Policy not found');
    return policy;
  }

  async findAll(filters?: any): Promise<Policy[]> {
    return this.policyRepo.find({
      order: { createdAt: 'DESC' },
      take: filters?.limit || 50,
    });
  }

  // Cron: expire policies past end date
  async expirePolicies() {
    const now = new Date();
    await this.policyRepo
      .createQueryBuilder()
      .update(Policy)
      .set({ policyStatus: PolicyStatus.EXPIRED })
      .where('end_date < :now', { now })
      .andWhere('policy_status = :status', { status: PolicyStatus.ACTIVE })
      .execute();
    this.logger.log('Expired stale policies');
  }
}
