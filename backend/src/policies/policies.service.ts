import {
  Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { v4 as uuidv4 } from 'uuid';
import { Policy, PolicyStatus, PaymentFrequency, FREQUENCY_CONFIG } from './policy.entity';
import { PurchasePolicyDto } from './policies.dto';
import { CommissionsService } from '../commissions/commissions.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';

// ── Installment pricing helper ─────────────────────────────────────────────
export function calcInstallment(annualPremium: number, frequency: PaymentFrequency) {
  const cfg = FREQUENCY_CONFIG[frequency];
  const annualWithMarkup = annualPremium * cfg.discount;
  const installmentAmount = Math.ceil(annualWithMarkup / cfg.periods);
  const savingsVsMonthly = frequency === PaymentFrequency.ANNUALLY
    ? Math.round(annualPremium * (FREQUENCY_CONFIG[PaymentFrequency.MONTHLY].discount - 1.0))
    : 0;
  return { installmentAmount, annualEquivalent: installmentAmount * cfg.periods, paymentsTotal: cfg.periods, savingsVsMonthly };
}

function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function addWeeks(d: Date, n: number) { return addDays(d, n * 7); }
function addMonths(d: Date, n: number) { const r = new Date(d); r.setMonth(r.getMonth() + n); return r; }

function nextInstallmentDate(from: Date, freq: PaymentFrequency): Date {
  switch (freq) {
    case PaymentFrequency.WEEKLY:    return addWeeks(from, 1);
    case PaymentFrequency.MONTHLY:   return addMonths(from, 1);
    case PaymentFrequency.QUARTERLY: return addMonths(from, 3);
    case PaymentFrequency.ANNUALLY:  return addMonths(from, 12);
  }
}

@Injectable()
export class PoliciesService {
  private readonly logger = new Logger(PoliciesService.name);

  constructor(
    @InjectRepository(Policy) private readonly policyRepo: Repository<Policy>,
    private readonly commissionsService: CommissionsService,
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
  ) {}

  async purchase(userId: string, dto: PurchasePolicyDto): Promise<Policy> {
    const policyNumber = `POL-${new Date().getFullYear()}-${uuidv4().split('-')[0].toUpperCase()}`;
    const freq = dto.paymentFrequency || PaymentFrequency.ANNUALLY;
    const { installmentAmount, annualEquivalent, paymentsTotal } = calcInstallment(Number(dto.premiumAmount), freq);
    const commissionAmount = annualEquivalent * 0.10;
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const safeId = (v?: string) => (v && uuidRe.test(v) ? v : undefined);
    const startDate = new Date();
    const endDate = addMonths(startDate, 12);
    const cfg = FREQUENCY_CONFIG[freq];

    const policy = this.policyRepo.create({
      policyNumber, userId,
      smeId: safeId(dto.smeId), productId: safeId(dto.productId), providerId: safeId(dto.providerId),
      premiumAmount: installmentAmount,
      commissionAmount, coverageAmount: dto.coverageAmount,
      policyStatus: PolicyStatus.PENDING,
      paymentFrequency: freq, installmentAmount, paymentsTotal, paymentsMade: 0,
      startDate, endDate,
      policyDetails: {
        ...(dto.policyDetails || {}),
        annualEquivalent, baseAnnualPremium: dto.premiumAmount,
        frequencyLabel: cfg.label, paymentFrequency: freq,
      },
      autoRenew: dto.autoRenew || false,
    });

    await this.policyRepo.save(policy);
    this.logger.log(`Policy created: ${policyNumber} [${freq}] ₦${installmentAmount}/installment`);

    if (policy.providerId) {
      await this.commissionsService.create({
        policyId: policy.id, providerId: policy.providerId,
        grossPremium: annualEquivalent, commissionRate: 0.10, commissionAmount,
      }).catch(e => this.logger.warn('Commission create failed: ' + e.message));
    }

    const user = await this.usersService.findById(userId);
    if (user) {
      await this.notificationsService.sendEmail(user, {
        subject: 'Policy Created — Complete Your First Payment',
        message: `Your policy ${policyNumber} is ready. Pay ₦${installmentAmount.toLocaleString()} to activate coverage. Plan: ${cfg.label}.`,
        entityType: 'policy', entityId: policy.id,
      }).catch(() => {});
    }
    return policy;
  }

  async activate(policyId: string, paymentId?: string): Promise<Policy> {
    const policy = await this.findById(policyId);
    const now = new Date();
    const freq = policy.paymentFrequency || PaymentFrequency.ANNUALLY;
    const cfg = FREQUENCY_CONFIG[freq];
    const newPaymentsMade = (Number(policy.paymentsMade) || 0) + 1;
    const nextDate = freq !== PaymentFrequency.ANNUALLY ? nextInstallmentDate(now, freq) : null;
    const gracePeriodEnd = nextDate && cfg.graceDays > 0 ? addDays(nextDate, cfg.graceDays) : null;

    await this.policyRepo.update(policyId, {
      policyStatus: PolicyStatus.ACTIVE,
      paymentsMade: newPaymentsMade,
      nextPaymentDate: nextDate,
      gracePeriodEnd,
      lapsedAt: null,
    });

    const updated = await this.findById(policyId);
    const user = await this.usersService.findById(policy.userId);
    if (user) {
      const isFirst = newPaymentsMade === 1;
      await this.notificationsService.sendEmail(user, {
        subject: isFirst ? `🎉 You're Covered! Policy ${policy.policyNumber} is Active` : `✅ Payment Received — Coverage Continues`,
        message: [
          `Hello ${user.name},`, '',
          isFirst ? '🎉 Your insurance policy is now active!' : '✅ Installment received — your coverage continues!', '',
          `Policy: ${policy.policyNumber}`,
          `Payment: ₦${Number(policy.installmentAmount || policy.premiumAmount).toLocaleString()} (${cfg.label})`,
          `Payments: ${newPaymentsMade} of ${policy.paymentsTotal}`,
          policy.coverageAmount ? `Coverage: ₦${Number(policy.coverageAmount).toLocaleString()}` : null,
          nextDate ? `Next payment: ${nextDate.toLocaleDateString('en-NG', { dateStyle: 'long' })}` : null,
          policy.endDate ? `Covered until: ${new Date(policy.endDate).toLocaleDateString('en-NG', { dateStyle: 'long' })}` : null,
          '', 'Thank you for choosing CoverAI.',
        ].filter(l => l !== null).join('\n'),
        entityType: 'policy', entityId: policy.id,
      }).catch(() => {});
    }
    return updated;
  }

  async reactivate(policyId: string, userId: string): Promise<{ policy: Policy; paymentAmount: number }> {
    const policy = await this.findById(policyId);
    if (policy.userId !== userId) throw new NotFoundException('Policy not found');
    if (policy.policyStatus !== PolicyStatus.LAPSED) throw new BadRequestException('Policy is not lapsed');
    if (policy.endDate && new Date(policy.endDate) < new Date()) {
      throw new BadRequestException('Policy has expired — please purchase a new policy');
    }
    return { policy, paymentAmount: Number(policy.installmentAmount || policy.premiumAmount) };
  }

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async checkLapsedPolicies() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Remind policies due today
    const dueToday = await this.policyRepo.query(
      `SELECT * FROM policies WHERE policy_status = 'active' AND next_payment_date = $1`, [today],
    );
    for (const policy of dueToday) {
      const user = await this.usersService.findById(policy.user_id).catch(() => null);
      if (user) {
        const cfg = FREQUENCY_CONFIG[policy.payment_frequency as PaymentFrequency] || FREQUENCY_CONFIG[PaymentFrequency.MONTHLY];
        await this.notificationsService.sendEmail(user, {
          subject: `⏰ Payment Due — ${policy.policy_number}`,
          message: `Your ${cfg.label.toLowerCase()} payment of ₦${Number(policy.installment_amount).toLocaleString()} is due today. You have a ${cfg.graceDays}-day grace period before coverage lapses.`,
          entityType: 'policy', entityId: policy.id,
        }).catch(() => {});
      }
    }

    // Lapse policies past grace period
    const toLapse = await this.policyRepo.query(
      `SELECT * FROM policies WHERE policy_status = 'active' AND grace_period_end IS NOT NULL AND grace_period_end < $1 AND payment_frequency != 'annually'`,
      [today],
    );
    for (const p of toLapse) {
      await this.policyRepo.query(
        `UPDATE policies SET policy_status = 'lapsed', lapsed_at = NOW() WHERE id = $1`, [p.id],
      );
      const user = await this.usersService.findById(p.user_id).catch(() => null);
      if (user) {
        await this.notificationsService.sendEmail(user, {
          subject: `⚠️ Policy Lapsed — ${p.policy_number}`,
          message: `Your policy ${p.policy_number} has lapsed due to a missed payment. Log in to reactivate by paying ₦${Number(p.installment_amount).toLocaleString()}.`,
          entityType: 'policy', entityId: p.id,
        }).catch(() => {});
      }
      this.logger.warn(`Policy lapsed: ${p.policy_number}`);
    }
    if (toLapse.length) this.logger.log(`Lapsed ${toLapse.length} policies`);
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async expirePolicies() {
    await this.policyRepo.query(
      `UPDATE policies SET policy_status = 'expired' WHERE end_date < NOW() AND policy_status IN ('active','lapsed')`,
    );
    this.logger.log('Expired stale policies');
  }

  async findByUser(userId: string) { return this.policyRepo.find({ where: { userId }, order: { createdAt: 'DESC' } }); }
  async findById(id: string) {
    const p = await this.policyRepo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Policy not found');
    return p;
  }
  async findByIdForUser(id: string, userId: string) {
    const p = await this.findById(id);
    if (p.userId !== userId) throw new NotFoundException('Policy not found');
    return p;
  }
  async findAll(filters?: any) { return this.policyRepo.find({ order: { createdAt: 'DESC' }, take: filters?.limit || 50 }); }
}
