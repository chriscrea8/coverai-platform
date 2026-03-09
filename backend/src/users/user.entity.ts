import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Exclude } from 'class-transformer';

export enum UserRole {
  CONSUMER = 'consumer',
  SME_OWNER = 'sme_owner',
  INSURANCE_PARTNER = 'insurance_partner',
  ADMIN = 'admin',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending_verification',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ length: 255 }) name: string;
  @Column({ unique: true, length: 255 }) email: string;
  @Column({ unique: true, nullable: true, length: 20 }) phone: string;
  @Column({ name: 'password_hash' }) @Exclude() passwordHash: string;
  @Column({ type: 'enum', enum: UserRole, default: UserRole.CONSUMER }) role: UserRole;
  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE }) status: UserStatus;
  @Column({ name: 'email_verified', default: false }) emailVerified: boolean;
  @Column({ name: 'phone_verified', default: false }) phoneVerified: boolean;
  @Column({ name: 'avatar_url', nullable: true }) avatarUrl: string;
  @Column({ name: 'refresh_token_hash', nullable: true }) @Exclude() refreshTokenHash: string;
  @Column({ name: 'password_reset_token', nullable: true }) @Exclude() passwordResetToken: string;
  @Column({ name: 'password_reset_expires', nullable: true, type: 'timestamptz' }) @Exclude() passwordResetExpires: Date;
  @Column({ name: 'last_login', nullable: true, type: 'timestamptz' }) lastLogin: Date;
  @Column({ name: 'email_verification_otp', nullable: true }) emailVerificationOtp: string;
  @Column({ name: 'email_otp_expires', nullable: true, type: 'timestamptz' }) emailOtpExpires: Date;
  // Extended profile
  @Column({ name: 'date_of_birth', nullable: true, type: 'date' }) dateOfBirth: Date;
  @Column({ nullable: true }) address: string;
  @Column({ nullable: true }) city: string;
  @Column({ nullable: true }) state: string;
  @Column({ nullable: true, default: 'Nigerian' }) nationality: string;
  // KYC
  @Column({ name: 'kyc_status', default: 'not_started' }) kycStatus: string;
  @Column({ name: 'kyc_id_type', nullable: true }) kycIdType: string;
  @Column({ name: 'kyc_id_number', nullable: true }) kycIdNumber: string;
  @Column({ name: 'kyc_document_url', nullable: true }) kycDocumentUrl: string;
  @Column({ name: 'kyc_selfie_url', nullable: true }) kycSelfieUrl: string;
  @Column({ name: 'kyc_submitted_at', nullable: true, type: 'timestamptz' }) kycSubmittedAt: Date;
  @Column({ name: 'kyc_verified_at', nullable: true, type: 'timestamptz' }) kycVerifiedAt: Date;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}
