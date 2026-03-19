import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { UserVerification, VerificationType, VerificationStatus } from './user-verification.entity';
import { User } from '../users/user.entity';

// ─────────────────────────────────────────────────────────────────────────────
// KYC SERVICE — POWERED BY QOREID (qoreid.com)
//
// Auth: Basic Auth — base64(CLIENT_ID:SECRET_KEY) in every request
// Base URL: https://api.qoreid.com
//
// Endpoints:
//   NIN:      POST /v1/ng/identities/nin/{idNumber}
//   BVN:      POST /v1/ng/identities/bvn-basic/{idNumber}
//   Driver's: POST /v1/ng/identities/frsc/{idNumber}  (FRSC driver's licence)
//   Plate:    POST /v1/ng/identities/license-plate-basic/{plateNumber}
//
// To activate:
//   1. Sign up at dashboard.qoreid.com → create a collection
//   2. Copy Test Client ID Key → QOREID_CLIENT_ID in Railway
//   3. Copy Test Secret Key   → QOREID_SECRET_KEY in Railway
//   4. For live: click "Go Live" in QoreID dashboard
//
// Test data (works with test keys):
//   NIN: 12345678901  BVN: 12345678901  Plate: MLZ823ZZ
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);
  private readonly baseUrl = 'https://api.qoreid.com';
  private readonly authHeader: string | null;
  private readonly sandboxMode: boolean;

  constructor(
    @InjectRepository(UserVerification)
    private readonly verificationRepo: Repository<UserVerification>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly configService: ConfigService,
  ) {
    const clientId = this.configService.get<string>('QOREID_CLIENT_ID');
    const secretKey = this.configService.get<string>('QOREID_SECRET_KEY');

    if (clientId && secretKey) {
      const encoded = Buffer.from(`${clientId}:${secretKey}`).toString('base64');
      this.authHeader = `Basic ${encoded}`;
      this.sandboxMode = false;
      this.logger.log('✅ QoreID KYC active (live API)');
    } else {
      this.authHeader = null;
      this.sandboxMode = true;
      this.logger.warn('⚠️  QoreID running in SANDBOX MODE — add QOREID_CLIENT_ID + QOREID_SECRET_KEY to Railway');
    }
  }

  // ── INTERNAL: call QoreID API ─────────────────────────────────────────────
  private async callQoreID(endpoint: string, body: Record<string, any> = {}): Promise<any> {
    if (!this.authHeader) return null;
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.authHeader,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.message || `QoreID error: ${response.status}`);
    }
    return response.json();
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

    this.logger.log(`Phone OTP for user ${userId}: ${otp}`);
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

  // ── NIN VERIFICATION via QoreID ───────────────────────────────────────────
  async verifyNIN(userId: string, nin: string, dob?: string, firstname?: string, lastname?: string): Promise<{ success: boolean; message: string; data?: any }> {
    if (!/^\d{11}$/.test(nin)) throw new BadRequestException('NIN must be exactly 11 digits.');

    try {
      let result: any;

      if (this.sandboxMode) {
        this.logger.warn('NIN sandbox mode');
        result = {
          status: { state: 'complete', status: 'verified' },
          nin: { nin, firstname: firstname || 'John', lastname: lastname || 'Doe', gender: 'm', birthdate: dob || '01-01-1990', phone: '08000000000' },
        };
      } else {
        const body: Record<string, string> = { firstname: firstname || '', lastname: lastname || '' };
        if (dob) body.dob = dob;
        result = await this.callQoreID(`/v1/ng/identities/nin/${nin}`, body);
      }

      const success = result?.status?.status === 'verified' || result?.nin?.nin;
      await this.saveVerification(userId, VerificationType.NIN, !!success, nin.slice(-4), result);

      if (success) {
        await this.userRepo.update(userId, { kycStatus: 'nin_verified' });
        const d = result.nin || {};
        return {
          success: true,
          message: 'NIN verified successfully.',
          data: {
            nin: nin.slice(0, 3) + '****' + nin.slice(-2),
            name: `${d.firstname || ''} ${d.lastname || ''}`.trim(),
            gender: d.gender,
            address: d.address,
            ...(this.sandboxMode ? { note: 'Sandbox mode — add QoreID keys for real verification' } : {}),
          },
        };
      }
      return { success: false, message: result?.message || 'NIN not found. Check and try again.' };
    } catch (e) {
      this.logger.error('NIN verification error: ' + e.message);
      throw new BadRequestException('Verification service temporarily unavailable. Please try again.');
    }
  }

  // ── BVN VERIFICATION via QoreID ───────────────────────────────────────────
  async verifyBVN(userId: string, bvn: string, dob?: string, firstname?: string, lastname?: string): Promise<{ success: boolean; message: string; data?: any }> {
    if (!/^\d{11}$/.test(bvn)) throw new BadRequestException('BVN must be exactly 11 digits.');

    try {
      let result: any;

      if (this.sandboxMode) {
        this.logger.warn('BVN sandbox mode');
        result = {
          status: { state: 'complete', status: 'verified' },
          bvn: { bvn, firstname: firstname || 'John', lastname: lastname || 'Doe', gender: 'Male', birthdate: dob || '07-07-1990', phone: '08000000000' },
        };
      } else {
        const body: Record<string, string> = { firstname: firstname || '', lastname: lastname || '' };
        if (dob) body.dob = dob;
        result = await this.callQoreID(`/v1/ng/identities/bvn-basic/${bvn}`, body);
      }

      const success = result?.status?.status === 'verified' || result?.bvn?.bvn;
      await this.saveVerification(userId, VerificationType.BVN, !!success, bvn.slice(-4), result);

      if (success) {
        await this.userRepo.update(userId, { kycStatus: 'bvn_verified' });
        const d = result.bvn || {};
        return {
          success: true,
          message: 'BVN verified successfully.',
          data: {
            bvn: bvn.slice(0, 3) + '****' + bvn.slice(-2),
            name: `${d.firstname || ''} ${d.lastname || ''}`.trim(),
            gender: d.gender,
            ...(this.sandboxMode ? { note: 'Sandbox mode — add QoreID keys for real verification' } : {}),
          },
        };
      }
      return { success: false, message: result?.message || 'BVN not found. Check and try again.' };
    } catch (e) {
      this.logger.error('BVN verification error: ' + e.message);
      throw new BadRequestException('Verification service temporarily unavailable. Please try again.');
    }
  }

  // ── DRIVER'S LICENCE via QoreID (FRSC) ────────────────────────────────────
  async verifyDriversLicence(userId: string, licenceNumber: string, dob?: string): Promise<{ success: boolean; message: string; data?: any }> {
    if (!licenceNumber || licenceNumber.length < 6) throw new BadRequestException('Invalid licence number.');

    try {
      let result: any;

      if (this.sandboxMode) {
        result = {
          status: { state: 'complete', status: 'verified' },
          frsc: { licenceNo: licenceNumber, firstname: 'John', lastname: 'Doe', stateOfIssue: 'Lagos' },
        };
      } else {
        const body: Record<string, string> = {};
        if (dob) body.dob = dob;
        result = await this.callQoreID(`/v1/ng/identities/frsc/${licenceNumber}`, body);
      }

      const success = result?.status?.status === 'verified' || result?.frsc?.licenceNo;
      await this.saveVerification(userId, VerificationType.NIN, !!success, licenceNumber.slice(-4), { ...result, type: 'drivers_licence' });

      if (success) {
        const d = result.frsc || {};
        return {
          success: true,
          message: "Driver's licence verified successfully.",
          data: {
            licenceNumber: '****' + licenceNumber.slice(-4),
            name: `${d.firstname || ''} ${d.lastname || ''}`.trim(),
            state: d.stateOfIssue,
          },
        };
      }
      return { success: false, message: result?.message || 'Licence not found.' };
    } catch (e) {
      this.logger.error("Driver's licence verification error: " + e.message);
      throw new BadRequestException('Verification service temporarily unavailable. Please try again.');
    }
  }

  // ── VEHICLE PLATE VERIFICATION via QoreID ────────────────────────────────
  // Endpoint: POST /v1/ng/identities/license-plate-basic/{plateNumber}
  // Returns: owner name, vehicle make/model, chassis number, category
  async verifyPlateNumber(plateNumber: string): Promise<{
    found: boolean;
    plate: string;
    owner?: string;
    vehicle?: string;
    chassis?: string;
    category?: string;
    source: string;
    raw?: any;
  }> {
    const clean = plateNumber.toUpperCase().replace(/\s+/g, '');

    try {
      let result: any;

      if (this.sandboxMode) {
        // QoreID sandbox: returns test data for any plate
        result = {
          status: { state: 'complete', status: 'verified' },
          license_plate: {
            plateNumber: clean,
            chassisNumber: 'JTJBARBZ8G20355542',
            vehicleMake: 'Toyota',
            vehicleModel: 'Camry',
            vehicleCategory: 'Private',
            firstname: 'John',
            middlename: '',
            lastname: 'Doe',
          },
        };
        this.logger.warn(`Plate verification SANDBOX — test data for ${clean}`);
      } else {
        // QoreID requires firstname+lastname in the body for matching
        // We pass empty strings to just get vehicle data without owner matching
        result = await this.callQoreID(`/v1/ng/identities/license-plate-basic/${encodeURIComponent(clean)}`, {
          firstname: '',
          lastname: '',
        });
      }

      if (result?.status?.status === 'verified' || result?.license_plate?.plateNumber) {
        const d = result.license_plate || {};
        const ownerName = [d.firstname, d.middlename, d.lastname].filter(Boolean).join(' ') || 'N/A';
        const vehicle = [d.vehicleMake, d.vehicleModel].filter(Boolean).join(' ') || 'N/A';

        return {
          found: true,
          plate: clean,
          owner: ownerName,
          vehicle,
          chassis: d.chassisNumber,
          category: d.vehicleCategory,
          source: this.sandboxMode ? 'QoreID Sandbox (FRSC/MVAA)' : 'QoreID (FRSC/MVAA)',
        };
      }

      return { found: false, plate: clean, source: 'QoreID (FRSC/MVAA)' };
    } catch (e) {
      this.logger.error('Plate verification error: ' + e.message);
      return { found: false, plate: clean, source: 'QoreID (FRSC/MVAA)' };
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
      provider: 'QoreID',
      sandboxMode: this.sandboxMode,
      ...(this.sandboxMode ? { note: 'Add QOREID_CLIENT_ID + QOREID_SECRET_KEY to Railway to enable live verification' } : {}),
    };
  }
}
