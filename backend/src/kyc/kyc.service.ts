import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { UserVerification, VerificationType, VerificationStatus } from './user-verification.entity';
import { User } from '../users/user.entity';

// ─────────────────────────────────────────────────────────────────────────────
// NIN & BVN VERIFICATION — PREMBLY (identitypass.io)
// Nigeria's most popular KYC API. Trusted by Flutterwave, Paystack, etc.
//
// To activate real NIN/BVN verification:
//   1. Sign up at app.myidentitypass.com
//   2. Get your API key from Settings → API Keys
//   3. Add PREMBLY_API_KEY to Railway environment variables
//
// Without the key, the service runs in SANDBOX MODE which accepts any input
// and returns mock verified responses (safe for testing/demo).
// ─────────────────────────────────────────────────────────────────────────────

const SANDBOX_MODE_RESPONSE = {
  nin: { status: true, detail: { firstname: 'MOCK', lastname: 'USER', nin: '00000000000', dob: '1990-01-01' } },
  bvn: { status: true, detail: { first_name: 'MOCK', last_name: 'USER', bvn: '00000000000', date_of_birth: '1990-01-01' } },
};

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);
  private readonly premblyKey: string | null;
  private readonly sandboxMode: boolean;

  constructor(
    @InjectRepository(UserVerification)
    private readonly verificationRepo: Repository<UserVerification>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly configService: ConfigService,
  ) {
    this.premblyKey = this.configService.get<string>('PREMBLY_API_KEY') || null;
    this.sandboxMode = !this.premblyKey;
    if (this.sandboxMode) {
      this.logger.warn('KYC running in SANDBOX MODE — no PREMBLY_API_KEY set. Add key for real NIN/BVN verification.');
    }
  }

  // ── PHONE OTP VERIFICATION ────────────────────────────────────────────────
  async sendPhoneOtp(userId: string, phone: string): Promise<{ message: string; expiresIn: number }> {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    // Save or update verification record
    let record = await this.verificationRepo.findOne({
      where: { userId, verificationType: VerificationType.PHONE_OTP },
    });
    if (!record) {
      record = this.verificationRepo.create({
        userId, verificationType: VerificationType.PHONE_OTP,
        verificationStatus: VerificationStatus.PENDING,
      });
    }
    record.otp = otpHash;
    record.otpExpires = otpExpires;
    record.verificationStatus = VerificationStatus.PENDING;
    record.attemptCount = 0;
    await this.verificationRepo.save(record);

    // TODO: Send OTP via Africa's Talking SMS
    // For now, log it (in dev) — in production integrate SMS gateway
    this.logger.log(`Phone OTP for user ${userId}: ${otp} (send via SMS to ${phone})`);

    // In sandbox/demo, return the OTP in the response so it can be tested
    const isSandbox = this.configService.get('NODE_ENV') !== 'production';

    return {
      message: `OTP sent to ${phone.slice(0, 4)}****${phone.slice(-3)}`,
      expiresIn: 600,
      ...(isSandbox ? { devOtp: otp } : {}),
    };
  }

  async verifyPhoneOtp(userId: string, otp: string): Promise<{ success: boolean; message: string }> {
    const record = await this.verificationRepo.findOne({
      where: { userId, verificationType: VerificationType.PHONE_OTP },
    });

    if (!record || record.verificationStatus === VerificationStatus.VERIFIED) {
      return { success: false, message: 'No pending phone verification found.' };
    }
    if (record.otpExpires < new Date()) {
      await this.verificationRepo.update(record.id, { verificationStatus: VerificationStatus.EXPIRED });
      return { success: false, message: 'OTP has expired. Please request a new one.' };
    }
    if (record.attemptCount >= 5) {
      return { success: false, message: 'Too many attempts. Please request a new OTP.' };
    }

    const inputHash = crypto.createHash('sha256').update(otp.trim()).digest('hex');
    if (inputHash !== record.otp) {
      await this.verificationRepo.update(record.id, { attemptCount: record.attemptCount + 1 });
      return { success: false, message: `Invalid OTP. ${4 - record.attemptCount} attempts remaining.` };
    }

    await this.verificationRepo.update(record.id, {
      verificationStatus: VerificationStatus.VERIFIED,
      verifiedAt: new Date(),
    });
    await this.userRepo.update(userId, { phoneVerified: true });

    return { success: true, message: 'Phone number verified successfully.' };
  }

  // ── NIN VERIFICATION ──────────────────────────────────────────────────────
  async verifyNIN(userId: string, nin: string): Promise<{ success: boolean; message: string; data?: any }> {
    if (!/^\d{11}$/.test(nin)) {
      throw new BadRequestException('NIN must be exactly 11 digits.');
    }

    try {
      let result: any;

      if (this.sandboxMode) {
        this.logger.warn('NIN verification in sandbox mode');
        result = SANDBOX_MODE_RESPONSE.nin;
      } else {
        const response = await fetch('https://api.myidentitypass.com/api/v1/biometrics/merchant/data/verification/nin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.premblyKey!,
          },
          body: JSON.stringify({ number: nin }),
          signal: AbortSignal.timeout(15000),
        });
        result = await response.json();
      }

      const success = result?.status === true;
      await this.saveVerification(userId, VerificationType.NIN, success, nin.slice(-4), result);

      if (success) {
        await this.userRepo.update(userId, { kycStatus: 'nin_verified' });
        return { success: true, message: 'NIN verified successfully.', data: { nin: nin.slice(0, 3) + '****' + nin.slice(-2) } };
      }

      return { success: false, message: result?.message || 'NIN verification failed. Please check your NIN and try again.' };
    } catch (error) {
      this.logger.error('NIN verification error', error);
      throw new BadRequestException('Verification service temporarily unavailable.');
    }
  }

  // ── BVN VERIFICATION ──────────────────────────────────────────────────────
  async verifyBVN(userId: string, bvn: string): Promise<{ success: boolean; message: string; data?: any }> {
    if (!/^\d{11}$/.test(bvn)) {
      throw new BadRequestException('BVN must be exactly 11 digits.');
    }

    try {
      let result: any;

      if (this.sandboxMode) {
        this.logger.warn('BVN verification in sandbox mode');
        result = SANDBOX_MODE_RESPONSE.bvn;
      } else {
        const response = await fetch('https://api.myidentitypass.com/api/v1/biometrics/merchant/data/verification/bvn', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.premblyKey!,
          },
          body: JSON.stringify({ number: bvn }),
          signal: AbortSignal.timeout(15000),
        });
        result = await response.json();
      }

      const success = result?.status === true;
      await this.saveVerification(userId, VerificationType.BVN, success, bvn.slice(-4), result);

      if (success) {
        await this.userRepo.update(userId, { kycStatus: 'bvn_verified' });
        return { success: true, message: 'BVN verified successfully.', data: { bvn: bvn.slice(0, 3) + '****' + bvn.slice(-2) } };
      }

      return { success: false, message: result?.message || 'BVN verification failed.' };
    } catch (error) {
      this.logger.error('BVN verification error', error);
      throw new BadRequestException('Verification service temporarily unavailable.');
    }
  }

  // ── HELPERS ───────────────────────────────────────────────────────────────
  private async saveVerification(
    userId: string, type: VerificationType,
    success: boolean, maskedValue: string, rawResponse: any,
  ) {
    const existing = await this.verificationRepo.findOne({ where: { userId, verificationType: type } });
    const status = success ? VerificationStatus.VERIFIED : VerificationStatus.FAILED;

    if (existing) {
      await this.verificationRepo.update(existing.id, {
        verificationStatus: status,
        verifiedValue: maskedValue,
        metadata: rawResponse,
        verifiedAt: success ? new Date() : undefined,
      });
    } else {
      await this.verificationRepo.save(this.verificationRepo.create({
        userId, verificationType: type, verificationStatus: status,
        verifiedValue: maskedValue, metadata: rawResponse,
        verifiedAt: success ? new Date() : undefined,
      }));
    }
  }

  async getVerificationStatus(userId: string) {
    const verifications = await this.verificationRepo.find({ where: { userId } });
    return {
      phone: verifications.find(v => v.verificationType === VerificationType.PHONE_OTP)?.verificationStatus || 'not_started',
      nin: verifications.find(v => v.verificationType === VerificationType.NIN)?.verificationStatus || 'not_started',
      bvn: verifications.find(v => v.verificationType === VerificationType.BVN)?.verificationStatus || 'not_started',
      sandboxMode: this.sandboxMode,
    };
  }
}
