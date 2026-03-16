import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';

const REFERRAL_COMMISSION_RATE = 0.05; // 5% of first policy premium
const REFERRAL_FLAT_BONUS = 500;        // ₦500 flat bonus per successful referral

@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  // Generate unique referral code for a user
  async generateCode(userId: string): Promise<string> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new Error('User not found');
    if (user.referralCode) return user.referralCode;

    // Generate code: first 4 chars of name + random 4 digits
    const nameSlug = (user.name || 'USER').replace(/\s+/g, '').toUpperCase().slice(0, 4);
    const code = `${nameSlug}${Math.floor(1000 + Math.random() * 9000)}`;

    await this.userRepo.update(userId, { referralCode: code });
    return code;
  }

  // Look up who owns a referral code
  async findByCode(code: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { referralCode: code.toUpperCase() } });
  }

  // Apply referral when a new user registers with a ref code
  async applyReferral(newUserId: string, refCode: string): Promise<void> {
    const referrer = await this.findByCode(refCode);
    if (!referrer || referrer.id === newUserId) return;

    await this.userRepo.update(newUserId, { referredBy: referrer.id });
    this.logger.log(`Referral applied: user ${newUserId} referred by ${referrer.id} (${refCode})`);
  }

  // Credit commission when a referred user makes their first policy payment
  async creditCommission(referredUserId: string, policyPremium: number): Promise<void> {
    const referred = await this.userRepo.findOne({ where: { id: referredUserId } });
    if (!referred?.referredBy) return;

    const referrer = await this.userRepo.findOne({ where: { id: referred.referredBy } });
    if (!referrer) return;

    const commission = Math.round(policyPremium * REFERRAL_COMMISSION_RATE) + REFERRAL_FLAT_BONUS;

    await this.userRepo.update(referrer.id, {
      referralEarnings: Number(referrer.referralEarnings || 0) + commission,
      referralCount: (referrer.referralCount || 0) + 1,
    });

    this.logger.log(`Referral commission: ₦${commission} credited to ${referrer.id} for referring ${referredUserId}`);
  }

  // Get referral stats for a user
  async getStats(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return null;

    // Ensure they have a code
    const code = user.referralCode || await this.generateCode(userId);

    // Count referred users
    const referredUsers = await this.userRepo.find({ where: { referredBy: userId } });

    return {
      referralCode: code,
      referralLink: `https://coverai-platform.vercel.app/auth?mode=register&ref=${code}`,
      totalReferrals: referredUsers.length,
      earnings: Number(user.referralEarnings || 0),
      pendingPayout: Number(user.referralEarnings || 0), // simplified — all earned is pending
      referredUsers: referredUsers.map(u => ({
        name: u.name,
        joinedAt: u.createdAt,
        hasPolicy: false, // could be enriched
      })),
      commissionRate: `${REFERRAL_COMMISSION_RATE * 100}%`,
      flatBonus: `₦${REFERRAL_FLAT_BONUS.toLocaleString()}`,
      howItWorks: [
        'Share your unique referral link with friends and colleagues',
        'They register on CoverAI using your link',
        'When they buy their first policy, you earn 5% commission + ₦500 bonus',
        'Earnings accumulate in your account and can be withdrawn to your bank',
      ],
    };
  }
}
