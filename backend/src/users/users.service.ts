// ── users/users.service.ts ───────────────────────────────────
import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { UpdateProfileDto, ChangePasswordDto } from './users.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async getProfile(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return this.sanitize(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (dto.email && dto.email !== user.email) {
      const existing = await this.userRepo.findOne({ where: { email: dto.email } });
      if (existing) throw new BadRequestException('Email already in use');
    }

    Object.assign(user, dto);
    await this.userRepo.save(user);
    return this.sanitize(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const isValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isValid) throw new BadRequestException('Current password is incorrect');

    user.passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.userRepo.save(user);
    return { message: 'Password updated successfully' };
  }

  async saveBankDetails(userId: string, dto: { bankName: string; bankAccountNumber: string; bankAccountName: string; bankCode?: string }) {
    await this.userRepo.update(userId, {
      bankName: dto.bankName,
      bankAccountNumber: dto.bankAccountNumber,
      bankAccountName: dto.bankAccountName,
      bankCode: dto.bankCode || null,
    });
    return { message: 'Bank details saved successfully' };
  }

  async findById(id: string): Promise<User> {
    return this.userRepo.findOne({ where: { id } });
  }

  async submitKyc(userId: string, dto: any) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.kycStatus === 'verified') throw new BadRequestException('KYC already verified');
    // Security: never store raw ID number — store only last 4 digits for display
    const maskedId = dto.idNumber.slice(0, -4).replace(/./g, '*') + dto.idNumber.slice(-4);
    await this.userRepo.update(userId, {
      kycIdType: dto.idType,
      kycIdNumber: maskedId, // masked for storage — real verification done via API
      kycDocumentUrl: dto.idDocumentUrl || null,
      kycSelfieUrl: dto.selfieUrl || null,
      kycStatus: 'pending',
      kycSubmittedAt: new Date(),
    });
    return { message: 'KYC submitted for review', status: 'pending' };
  }

  private sanitize(user: User) {
    const { passwordHash, refreshTokenHash, passwordResetToken, emailVerificationOtp, emailOtpExpires, ...safe } = user as any;
    // Mask account number for display: show only last 4 digits
    if (safe.bankAccountNumber) {
      safe.bankAccountNumberMasked = '••••••' + safe.bankAccountNumber.slice(-4);
    }
    return safe;
  }
}
