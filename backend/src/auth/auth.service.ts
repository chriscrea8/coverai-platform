import {
  Injectable, UnauthorizedException, ConflictException,
  BadRequestException, NotFoundException, Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { User, UserStatus } from '../users/user.entity';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto } from './auth.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly SALT_ROUNDS = 12;

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ── REGISTER ───────────────────────────────────────────────
  async register(dto: RegisterDto) {
    const existing = await this.userRepo.findOne({
      where: [{ email: dto.email }, { phone: dto.phone }],
    });
    if (existing) {
      throw new ConflictException('Email or phone number already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);
    // Generate 6-digit email OTP
    const emailOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const user = this.userRepo.create({
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      passwordHash,
      role: dto.role,
      emailVerificationOtp: emailOtp,
      emailOtpExpires: otpExpires,
    });

    await this.userRepo.save(user);
    this.logger.log(`New user registered: ${user.email} [${user.role}]`);

    // Send OTP email (non-blocking)
    await this.notificationsService.sendEmail(user, {
      subject: 'Verify your CoverAI email — OTP inside',
      message: `Hello ${user.name},\n\nYour email verification code is: ${emailOtp}\n\nThis code expires in 15 minutes. Do not share it with anyone.\n\n— CoverAI Team`,
    }).catch(() => {});

    const tokens = await this.generateTokens(user);
    return { user: this.sanitizeUser(user), ...tokens, emailVerified: false };
  }

  // ── LOGIN ──────────────────────────────────────────────────
  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) throw new UnauthorizedException('Invalid credentials');

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Account suspended. Contact support.');
    }

    // Update last login
    await this.userRepo.update(user.id, { lastLogin: new Date() });
    this.logger.log(`User logged in: ${user.email}`);

    const tokens = await this.generateTokens(user);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  // ── REFRESH TOKEN (safe — verifies signature) ──────────────
  async refreshTokenSafe(refreshToken: string) {
    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    const user = await this.userRepo.findOne({ where: { id: payload.sub } });
    if (!user || !user.refreshTokenHash) throw new UnauthorizedException('Access denied');
    const isValid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!isValid) throw new UnauthorizedException('Invalid refresh token');
    return this.generateTokens(user);
  }

  // ── REFRESH TOKEN ──────────────────────────────────────────
  async refreshToken(userId: string, refreshToken: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || !user.refreshTokenHash) throw new UnauthorizedException('Access denied');

    const isValid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!isValid) throw new UnauthorizedException('Invalid refresh token');

    const tokens = await this.generateTokens(user);
    return tokens;
  }

  // ── LOGOUT ─────────────────────────────────────────────────
  async logout(userId: string) {
    await this.userRepo.update(userId, { refreshTokenHash: null });
    return { message: 'Logged out successfully' };
  }

  // ── FORGOT PASSWORD ────────────────────────────────────────
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    // Always return success to prevent email enumeration
    if (!user) return { message: 'If this email exists, a reset link has been sent.' };

    const token = uuidv4();
    const expires = new Date(Date.now() + 3600000); // 1 hour

    await this.userRepo.update(user.id, {
      passwordResetToken: token,
      passwordResetExpires: expires,
    });

    const resetUrl = `${this.configService.get('app.frontendUrl')}/auth/reset-password?token=${token}`;
    await this.notificationsService.sendEmail(user, {
      subject: 'Password Reset Request',
      message: `Click here to reset your password: ${resetUrl}\n\nThis link expires in 1 hour.`,
    }).catch(() => {});

    return { message: 'If this email exists, a reset link has been sent.' };
  }

  // ── RESET PASSWORD ─────────────────────────────────────────
  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.userRepo.findOne({
      where: { passwordResetToken: dto.token },
    });

    if (!user) throw new BadRequestException('Invalid or expired reset token');
    if (user.passwordResetExpires < new Date()) {
      throw new BadRequestException('Reset token has expired');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);
    await this.userRepo.update(user.id, {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpires: null,
      refreshTokenHash: null,
    });

    return { message: 'Password reset successfully. Please login.' };
  }

  // ── VERIFY EMAIL OTP ───────────────────────────────────────
  async verifyEmail(userId: string, otp: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.emailVerified) return { message: 'Email already verified' };
    if (!user.emailVerificationOtp || user.emailVerificationOtp !== otp) {
      throw new BadRequestException('Invalid verification code');
    }
    if (user.emailOtpExpires && user.emailOtpExpires < new Date()) {
      throw new BadRequestException('Verification code has expired. Request a new one.');
    }
    await this.userRepo.update(userId, {
      emailVerified: true,
      emailVerificationOtp: null,
      emailOtpExpires: null,
    });
    await this.notificationsService.sendEmail(user, {
      subject: '✅ Email Verified — Welcome to CoverAI!',
      message: `Hello ${user.name}, your email has been verified. You can now access all CoverAI features including purchasing insurance and filing claims.`,
    }).catch(() => {});
    return { message: 'Email verified successfully' };
  }

  async resendEmailOtp(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.emailVerified) return { message: 'Email already verified' };
    // Rate limit: only allow resend if last OTP was sent > 1 minute ago
    if (user.emailOtpExpires && user.emailOtpExpires > new Date(Date.now() + 14 * 60 * 1000)) {
      throw new BadRequestException('Please wait before requesting another code');
    }
    const emailOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000);
    await this.userRepo.update(userId, { emailVerificationOtp: emailOtp, emailOtpExpires: otpExpires });
    await this.notificationsService.sendEmail(user, {
      subject: 'New verification code — CoverAI',
      message: `Hello ${user.name},\n\nYour new email verification code is: ${emailOtp}\n\nThis code expires in 15 minutes.`,
    }).catch(() => {});
    return { message: 'New verification code sent to your email' };
  }

  // ── HELPERS ────────────────────────────────────────────────
  private async generateTokens(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('jwt.secret'),
        expiresIn: this.configService.get('jwt.expiresIn'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('jwt.refreshSecret'),
        expiresIn: this.configService.get('jwt.refreshExpiresIn'),
      }),
    ]);

    const refreshTokenHash = await bcrypt.hash(refreshToken, this.SALT_ROUNDS);
    await this.userRepo.update(user.id, { refreshTokenHash });

    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: User) {
    const { passwordHash, refreshTokenHash, passwordResetToken, emailVerificationOtp, emailOtpExpires, ...safe } = user as any;
    return safe;
  }
}
