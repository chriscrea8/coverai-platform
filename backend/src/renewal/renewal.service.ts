import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Policy, PolicyStatus } from '../policies/policy.entity';
import { User } from '../users/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RenewalService {
  private readonly logger = new Logger(RenewalService.name);

  constructor(
    @InjectRepository(Policy) private readonly policyRepo: Repository<Policy>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
  ) {}

  // ── CRON: Run daily at 8AM WAT (7AM UTC) ─────────────────────────────────
  @Cron('0 7 * * *', { name: 'policy-renewal-reminders', timeZone: 'Africa/Lagos' })
  async sendRenewalReminders() {
    this.logger.log('Running policy renewal reminder cron...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await Promise.all([
      this.sendRemindersForDaysLeft(30),
      this.sendRemindersForDaysLeft(7),
      this.sendRemindersForDaysLeft(1),
    ]);

    // Also auto-lapse expired policies
    await this.autoLapseExpiredPolicies();

    this.logger.log('Renewal reminder cron complete.');
  }

  private async sendRemindersForDaysLeft(daysLeft: number) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysLeft);
    targetDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const expiringPolicies = await this.policyRepo
      .createQueryBuilder('policy')
      .where('policy.policy_status = :status', { status: PolicyStatus.ACTIVE })
      .andWhere('policy.end_date >= :start', { start: targetDate.toISOString().split('T')[0] })
      .andWhere('policy.end_date < :end', { end: nextDay.toISOString().split('T')[0] })
      .getMany();

    this.logger.log(`Found ${expiringPolicies.length} policies expiring in ${daysLeft} days`);

    for (const policy of expiringPolicies) {
      try {
        const user = await this.userRepo.findOne({ where: { id: policy.userId } });
        if (!user) continue;

        await this.sendRenewalNotification(user, policy, daysLeft);
      } catch (e) {
        this.logger.warn(`Renewal reminder failed for policy ${policy.policyNumber}: ${e.message}`);
      }
    }
  }

  private async sendRenewalNotification(user: User, policy: Policy, daysLeft: number) {
    const urgency = daysLeft === 1 ? '🚨 URGENT' : daysLeft === 7 ? '⚠️ Important' : '📅 Reminder';
    const subject = `${urgency}: Your insurance policy expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0A0F1E, #1A3A8F); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h2 style="color: #F4A623; margin: 0;">CoverAI — Policy Renewal Reminder</h2>
        </div>
        <div style="background: #f9f9f9; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #e0e0e0;">
          <p>Hello ${user.name},</p>
          <div style="background: ${daysLeft === 1 ? '#FEE2E2' : daysLeft === 7 ? '#FEF3C7' : '#EFF6FF'}; border-left: 4px solid ${daysLeft === 1 ? '#EF4444' : daysLeft === 7 ? '#F59E0B' : '#3B82F6'}; padding: 16px; border-radius: 4px; margin: 16px 0;">
            <strong style="font-size: 18px;">${urgency}: ${daysLeft} day${daysLeft !== 1 ? 's' : ''} until expiry!</strong>
            <p style="margin: 8px 0 0;">Your policy <strong>${policy.policyNumber}</strong> expires on <strong>${new Date(policy.endDate).toDateString()}</strong>.</p>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px; color: #666;">Policy Number</td><td style="padding: 8px; font-weight: bold;">${policy.policyNumber}</td></tr>
            <tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px; color: #666;">Expiry Date</td><td style="padding: 8px; color: #EF4444; font-weight: bold;">${new Date(policy.endDate).toDateString()}</td></tr>
            <tr><td style="padding: 8px; color: #666;">Premium Amount</td><td style="padding: 8px; font-weight: bold;">₦${Number(policy.premiumAmount).toLocaleString()}</td></tr>
          </table>
          <div style="text-align: center; margin-top: 24px;">
            <a href="${this.configService.get('app.frontendUrl') || 'https://coverai-platform.vercel.app'}/dashboard" style="background: #F4A623; color: #0A0F1E; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
              Renew My Policy →
            </a>
          </div>
          <p style="color: #999; font-size: 12px; margin-top: 24px; text-align: center;">
            Don't let your coverage lapse. An uninsured period could expose you to significant financial risk.
          </p>
        </div>
      </div>
    `;

    // Send email via Resend
    await this.notificationsService.sendEmail(user, {
      subject,
      message: html,
      entityType: 'policy',
      entityId: policy.id,
    }).catch(e => this.logger.warn('Renewal email failed: ' + e.message));

    // Send WhatsApp notification
    await this.sendWhatsAppRenewalNotice(user, policy, daysLeft);

    // Save in-app notification
    await this.notificationsService.createInApp(user.id, {
      subject: `Policy expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
      message: `Your policy ${policy.policyNumber} expires on ${new Date(policy.endDate).toDateString()}. Renew now to stay protected.`,
      entityType: 'policy',
      entityId: policy.id,
    }).catch(() => {});

    this.logger.log(`Renewal reminder sent to ${user.email} for policy ${policy.policyNumber} (${daysLeft} days)`);
  }

  private async sendWhatsAppRenewalNotice(user: User, policy: Policy, daysLeft: number) {
    if (!user.phone) return;
    const token = this.configService.get<string>('WHATSAPP_TOKEN');
    const phoneId = this.configService.get<string>('WHATSAPP_PHONE_ID');
    if (!token || !phoneId) return;

    const phone = user.phone.replace(/\D/g, '').replace(/^0/, '234');
    const urgency = daysLeft === 1 ? '🚨 URGENT' : daysLeft === 7 ? '⚠️' : '📅';
    const text = `${urgency} *CoverAI Renewal Reminder*\n\nHello ${user.name},\n\nYour policy *${policy.policyNumber}* expires in *${daysLeft} day${daysLeft !== 1 ? 's' : ''}* on ${new Date(policy.endDate).toDateString()}.\n\n💰 Premium: ₦${Number(policy.premiumAmount).toLocaleString()}\n\nRenew now to stay protected 👉 coverai-platform.vercel.app/dashboard\n\nReply *RENEW* to get started or ask ARIA for help.`;

    try {
      await fetch(`https://graph.facebook.com/v22.0/${phoneId}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', to: phone, type: 'text', text: { body: text } }),
      });
    } catch (e) {
      this.logger.warn('WhatsApp renewal notice failed: ' + e.message);
    }
  }

  private async autoLapseExpiredPolicies() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const result = await this.policyRepo
      .createQueryBuilder()
      .update(Policy)
      .set({ policyStatus: PolicyStatus.LAPSED, lapsedAt: new Date() })
      .where('policy_status = :status', { status: PolicyStatus.ACTIVE })
      .andWhere('end_date < :date', { date: yesterday.toISOString().split('T')[0] })
      .execute();

    if (result.affected > 0) {
      this.logger.log(`Auto-lapsed ${result.affected} expired policies`);
    }
  }

  // Manual trigger for testing
  async triggerRenewalCheck(): Promise<{ message: string; processed: number }> {
    let count = 0;
    for (const days of [30, 7, 1]) {
      const policies = await this.getPoliciesExpiringInDays(days);
      count += policies.length;
      for (const policy of policies) {
        const user = await this.userRepo.findOne({ where: { id: policy.userId } });
        if (user) await this.sendRenewalNotification(user, policy, days);
      }
    }
    return { message: `Renewal check complete`, processed: count };
  }

  private async getPoliciesExpiringInDays(days: number): Promise<Policy[]> {
    const date = new Date();
    date.setDate(date.getDate() + days);
    const dateStr = date.toISOString().split('T')[0];
    const nextStr = new Date(date.setDate(date.getDate() + 1)).toISOString().split('T')[0];

    return this.policyRepo
      .createQueryBuilder('p')
      .where('p.policy_status = :s', { s: PolicyStatus.ACTIVE })
      .andWhere('p.end_date >= :d', { d: dateStr })
      .andWhere('p.end_date < :n', { n: nextStr })
      .getMany();
  }

  async getExpiringPolicies(days = 30): Promise<Policy[]> {
    const future = new Date();
    future.setDate(future.getDate() + days);
    return this.policyRepo
      .createQueryBuilder('p')
      .where('p.policy_status = :s', { s: PolicyStatus.ACTIVE })
      .andWhere('p.end_date <= :d', { d: future.toISOString().split('T')[0] })
      .andWhere('p.end_date >= :today', { today: new Date().toISOString().split('T')[0] })
      .orderBy('p.end_date', 'ASC')
      .getMany();
  }
}
