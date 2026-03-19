import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { UserVerification, VerificationType, VerificationStatus } from './user-verification.entity';
import { User } from '../users/user.entity';

// ─────────────────────────────────────────────────────────────────────────────
// KYC SERVICE — POWERED BY VERIFYME NIGERIA (verifyme.ng)
//
// API Base: https://vapi.verifyme.ng/v1
// Auth: Bearer token in Authorization header
//
// TEST PERSONA (works with test key):
//   NIN: 10000000001  | Name: John Doe | DOB: 04-04-1944
//   BVN: 10000000001  | Name: John Doe | DOB: 04-04-1944
//
// Endpoints used:
//   NIN:     POST /verifications/identities/nin/:ninNumber
//   BVN:     POST /verifications/identities/bvn/:bvnNumber
//   Licence: POST /verifications/identities/dl/:licenceNumber
//
// To activate:
//   1. Sign up at app.verifyme.ng
//   2. Add VERIFYME_API_KEY to Railway environment variables
//   3. For production use live key; for testing use test key with test persona above
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);
  private readonly apiKey: string | null;
  private readonly sandboxMode: boolean;
  private readonly baseUrl = 'https://vapi.verifyme.ng/v1';

  constructor(
    @InjectRepository(UserVerification)
    private readonly verificationRepo: Repository<UserVerification>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('VERIFYME_API_KEY') || null;
    this.sandboxMode = !this.apiKey;
    if (this.sandboxMode) {
      this.logger.warn('KYC running in SANDBOX MODE — no VERIFYME_API_KEY set. Add key to Railway for real verification.');
    } else {
      this.logger.log('✅ VerifyMe KYC active');
    }
  }

  // ── PHONE OTP ─────────────────────────────────────────────────────────────
  async sendPhoneOtp(userId: string, phone: string): Promise<{ message: string; expiresIn: number; devOtp?: string }> {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

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

    this.logger.log(`Phone OTP for ${phone}: ${otp}`);
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
      verificationStatus: VerificationStatus.VERIFIED, verifiedAt: new Date(),
    });
    await this.userRepo.update(userId, { phoneVerified: true });
    return { success: true, message: 'Phone number verified successfully.' };
  }

  // ── NIN VERIFICATION via VerifyMe ─────────────────────────────────────────
  async verifyNIN(userId: string, nin: string, dob?: string, firstname?: string, lastname?: string): Promise<{ success: boolean; message: string; data?: any }> {
    if (!/^\d{11}$/.test(nin)) throw new BadRequestException('NIN must be exactly 11 digits.');

    try {
      let result: any;
      if (this.sandboxMode) {
        // Simulate VerifyMe test persona
        result = {
          status: 'success',
          data: { nin: Number(nin), firstname: 'John', lastname: 'Doe', phone: '08066676673', gender: 'male', birthdate: '04-04-1944' }
        };
        this.logger.warn(`NIN sandbox mode — test persona returned for ${nin}`);
      } else {
        const body: Record<string, string> = {};
        if (dob) body.dob = dob;
        if (firstname) body.firstname = firstname;
        if (lastname) body.lastname = lastname;

        const response = await fetch(`${this.baseUrl}/verifications/identities/nin/${nin}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: Object.keys(body).length ? JSON.stringify(body) : '{}',
          signal: AbortSignal.timeout(15000),
        });
        result = await response.json();
      }

      const success = result?.status === 'success';
      await this.saveVerification(userId, VerificationType.NIN, success, nin.slice(-4), result);

      if (success) {
        await this.userRepo.update(userId, { kycStatus: 'nin_verified' });
        const d = result.data;
        return {
          success: true,
          message: 'NIN verified successfully.',
          data: {
            nin: nin.slice(0, 3) + '****' + nin.slice(-2),
            name: `${d.firstname || ''} ${d.lastname || ''}`.trim(),
            gender: d.gender,
            phone: d.phone ? d.phone.slice(0, 4) + '****' + d.phone.slice(-3) : undefined,
          }
        };
      }
      return { success: false, message: result?.message || 'NIN not found. Please check and try again.' };
    } catch (error) {
      this.logger.error('NIN verification error', error);
      throw new BadRequestException('Verification service temporarily unavailable.');
    }
  }

  // ── BVN VERIFICATION via VerifyMe ─────────────────────────────────────────
  async verifyBVN(userId: string, bvn: string, dob?: string, firstname?: string, lastname?: string): Promise<{ success: boolean; message: string; data?: any }> {
    if (!/^\d{11}$/.test(bvn)) throw new BadRequestException('BVN must be exactly 11 digits.');

    try {
      let result: any;
      if (this.sandboxMode) {
        result = {
          status: 'success',
          data: { bvn: Number(bvn), firstname: 'John', lastname: 'Doe', phone: '08066676673', gender: 'male', birthdate: '04-04-1944' }
        };
        this.logger.warn(`BVN sandbox mode — test persona returned for ${bvn}`);
      } else {
        const body: Record<string, string> = {};
        if (dob) body.dob = dob;
        if (firstname) body.firstname = firstname;
        if (lastname) body.lastname = lastname;

        const response = await fetch(`${this.baseUrl}/verifications/identities/bvn/${bvn}?type=premium`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: Object.keys(body).length ? JSON.stringify(body) : '{}',
          signal: AbortSignal.timeout(15000),
        });
        result = await response.json();
      }

      const success = result?.status === 'success';
      await this.saveVerification(userId, VerificationType.BVN, success, bvn.slice(-4), result);

      if (success) {
        await this.userRepo.update(userId, { kycStatus: 'bvn_verified' });
        const d = result.data;
        return {
          success: true,
          message: 'BVN verified successfully.',
          data: {
            bvn: bvn.slice(0, 3) + '****' + bvn.slice(-2),
            name: `${d.firstname || ''} ${d.lastname || ''}`.trim(),
            gender: d.gender,
          }
        };
      }
      return { success: false, message: result?.message || 'BVN not found. Please check and try again.' };
    } catch (error) {
      this.logger.error('BVN verification error', error);
      throw new BadRequestException('Verification service temporarily unavailable.');
    }
  }

  // ── DRIVER'S LICENCE VERIFICATION via VerifyMe ───────────────────────────
  async verifyDriversLicence(userId: string, licenceNumber: string, dob?: string): Promise<{ success: boolean; message: string; data?: any }> {
    if (!licenceNumber || licenceNumber.length < 6) throw new BadRequestException('Invalid licence number.');

    try {
      let result: any;
      if (this.sandboxMode) {
        result = { status: 'success', data: { licenceNumber, firstname: 'John', lastname: 'Doe' } };
      } else {
        const response = await fetch(`${this.baseUrl}/verifications/identities/dl/${licenceNumber}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: dob ? JSON.stringify({ dob }) : '{}',
          signal: AbortSignal.timeout(15000),
        });
        result = await response.json();
      }

      const success = result?.status === 'success';
      await this.saveVerification(userId, VerificationType.NIN, success, licenceNumber.slice(-4), { ...result, type: 'drivers_licence' });

      if (success) {
        return {
          success: true,
          message: "Driver's licence verified successfully.",
          data: { licenceNumber: '****' + licenceNumber.slice(-4), name: `${result.data?.firstname || ''} ${result.data?.lastname || ''}`.trim() }
        };
      }
      return { success: false, message: result?.message || 'Licence not found.' };
    } catch (error) {
      this.logger.error('Drivers licence verification error', error);
      throw new BadRequestException('Verification service temporarily unavailable.');
    }
  }

  // ── HELPERS ───────────────────────────────────────────────────────────────
  private async saveVerification(userId: string, type: VerificationType, success: boolean, maskedValue: string, rawResponse: any) {
    const existing = await this.verificationRepo.findOne({ where: { userId, verificationType: type } });
    const status = success ? VerificationStatus.VERIFIED : VerificationStatus.FAILED;
    if (existing) {
      await this.verificationRepo.update(existing.id, {
        verificationStatus: status, verifiedValue: maskedValue, metadata: rawResponse,
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
      provider: 'VerifyMe Nigeria',
      sandboxMode: this.sandboxMode,
      testPersona: this.sandboxMode ? { nin: '10000000001', bvn: '10000000001', name: 'John Doe' } : undefined,
    };
  }
}
