import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum PolicyStatus { ACTIVE = 'active', EXPIRED = 'expired', CANCELLED = 'cancelled', PENDING = 'pending', LAPSED = 'lapsed' }

@Entity('policies')
export class Policy {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'policy_number', unique: true }) policyNumber: string;
  @Column({ name: 'user_id' }) userId: string;
  @Column({ name: 'sme_id', nullable: true }) smeId: string;
  @Column({ name: 'product_id', nullable: true }) productId: string;
  @Column({ name: 'provider_id', nullable: true }) providerId: string;
  @Column({ name: 'premium_amount', type: 'decimal', precision: 12, scale: 2 }) premiumAmount: number;
  @Column({ name: 'commission_amount', type: 'decimal', precision: 12, scale: 2 }) commissionAmount: number;
  @Column({ name: 'coverage_amount', type: 'decimal', precision: 15, scale: 2, nullable: true }) coverageAmount: number;
  @Column({ name: 'policy_status', type: 'enum', enum: PolicyStatus, default: PolicyStatus.PENDING }) policyStatus: PolicyStatus;
  @Column({ name: 'start_date', type: 'date', nullable: true }) startDate: Date;
  @Column({ name: 'end_date', type: 'date', nullable: true }) endDate: Date;
  @Column({ name: 'document_url', nullable: true }) documentUrl: string;
  @Column({ name: 'policy_details', type: 'jsonb', default: () => "'{}'" }) policyDetails: Record<string, any>;
  @Column({ name: 'auto_renew', default: false }) autoRenew: boolean;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}
