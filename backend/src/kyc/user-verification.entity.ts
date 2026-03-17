import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum VerificationType {
  PHONE_OTP = 'phone_otp',
  NIN = 'nin',
  BVN = 'bvn',
  EMAIL = 'email',
}

export enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  FAILED = 'failed',
  EXPIRED = 'expired',
}

@Entity('user_verifications')
export class UserVerification {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'user_id' }) userId: string;
  @Column({ type: 'enum', enum: VerificationType }) verificationType: VerificationType;
  @Column({ type: 'enum', enum: VerificationStatus, default: VerificationStatus.PENDING }) verificationStatus: VerificationStatus;
  @Column({ nullable: true }) reference: string;         // external ref from Prembly/NIMC
  @Column({ nullable: true }) otp: string;               // hashed OTP for phone
  @Column({ name: 'otp_expires', nullable: true, type: 'timestamptz' }) otpExpires: Date;
  @Column({ name: 'verified_value', nullable: true }) verifiedValue: string; // last 4 of NIN/BVN
  @Column({ type: 'jsonb', nullable: true }) metadata: Record<string, any>; // raw provider response
  @Column({ name: 'failure_reason', nullable: true }) failureReason: string;
  @Column({ name: 'attempt_count', default: 0 }) attemptCount: number;
  @Column({ name: 'verified_at', nullable: true, type: 'timestamptz' }) verifiedAt: Date;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}
