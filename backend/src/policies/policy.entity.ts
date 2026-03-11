import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';

export enum PolicyStatus { ACTIVE = 'active', EXPIRED = 'expired', CANCELLED = 'cancelled', PENDING = 'pending', LAPSED = 'lapsed' }
export enum PaymentFrequency { WEEKLY = 'weekly', MONTHLY = 'monthly', QUARTERLY = 'quarterly', ANNUALLY = 'annually' }

// Discount multipliers vs annual price (annual = 1.0 = cheapest)
export const FREQUENCY_CONFIG: Record<PaymentFrequency, {
  label: string; periods: number; graceDays: number; discount: number;
}> = {
  [PaymentFrequency.WEEKLY]:    { label: 'Weekly',    periods: 52, graceDays: 3,  discount: 1.20 }, // 20% more expensive than annual
  [PaymentFrequency.MONTHLY]:   { label: 'Monthly',   periods: 12, graceDays: 7,  discount: 1.12 }, // 12% more
  [PaymentFrequency.QUARTERLY]: { label: 'Quarterly', periods: 4,  graceDays: 14, discount: 1.06 }, // 6% more
  [PaymentFrequency.ANNUALLY]:  { label: 'Annually',  periods: 1,  graceDays: 0,  discount: 1.00 }, // baseline / cheapest
};

@Entity('policies')
export class Policy {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'policy_number', unique: true }) policyNumber: string;
  @Column({ name: 'user_id' }) userId: string;
  @ManyToOne(() => User, { nullable: true, eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User;
  @Column({ name: 'sme_id', nullable: true }) smeId: string;
  @Column({ name: 'product_id', nullable: true }) productId: string;
  @Column({ name: 'provider_id', nullable: true }) providerId: string;
  @Column({ name: 'premium_amount', type: 'decimal', precision: 12, scale: 2 }) premiumAmount: number;
  @Column({ name: 'commission_amount', type: 'decimal', precision: 12, scale: 2 }) commissionAmount: number;
  @Column({ name: 'coverage_amount', type: 'decimal', precision: 15, scale: 2, nullable: true }) coverageAmount: number;
  @Column({ name: 'policy_status', type: 'enum', enum: PolicyStatus, default: PolicyStatus.PENDING }) policyStatus: PolicyStatus;
  // Payment frequency / installment
  @Column({ name: 'payment_frequency', type: 'enum', enum: PaymentFrequency, default: PaymentFrequency.ANNUALLY }) paymentFrequency: PaymentFrequency;
  @Column({ name: 'installment_amount', type: 'decimal', precision: 12, scale: 2, nullable: true }) installmentAmount: number;
  @Column({ name: 'next_payment_date', type: 'date', nullable: true }) nextPaymentDate: Date;
  @Column({ name: 'grace_period_end', type: 'date', nullable: true }) gracePeriodEnd: Date;
  @Column({ name: 'payments_made', default: 0 }) paymentsMade: number;
  @Column({ name: 'payments_total', default: 1 }) paymentsTotal: number;
  @Column({ name: 'lapsed_at', type: 'timestamptz', nullable: true }) lapsedAt: Date;
  @Column({ name: 'start_date', type: 'date', nullable: true }) startDate: Date;
  @Column({ name: 'end_date', type: 'date', nullable: true }) endDate: Date;
  @Column({ name: 'document_url', nullable: true }) documentUrl: string;
  @Column({ name: 'policy_details', type: 'jsonb', default: () => "'{}'" }) policyDetails: Record<string, any>;
  @Column({ name: 'auto_renew', default: false }) autoRenew: boolean;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}
