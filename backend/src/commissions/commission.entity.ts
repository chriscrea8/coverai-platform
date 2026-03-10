import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Policy } from '../policies/policy.entity';
import { InsuranceProvider } from '../insurance-providers/insurance-provider.entity';

export enum CommissionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PAID = 'paid',
}

@Entity('commissions')
export class Commission {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'policy_id' }) policyId: string;
  @ManyToOne(() => Policy, { nullable: true, eager: false })
  @JoinColumn({ name: 'policy_id' })
  policy: Policy;

  @Column({ name: 'provider_id', nullable: true }) providerId: string;
  @ManyToOne(() => InsuranceProvider, { nullable: true, eager: false })
  @JoinColumn({ name: 'provider_id' })
  provider: InsuranceProvider;

  @Column({ name: 'payment_id', nullable: true }) paymentId: string;
  @Column({ name: 'gross_premium', type: 'decimal', precision: 12, scale: 2 }) grossPremium: number;
  @Column({ name: 'commission_rate', type: 'decimal', precision: 5, scale: 4 }) commissionRate: number;
  @Column({ name: 'commission_amount', type: 'decimal', precision: 12, scale: 2 }) commissionAmount: number;
  @Column({ name: 'platform_fee', type: 'decimal', precision: 12, scale: 2, default: 0 }) platformFee: number;
  @Column({ name: 'net_commission', type: 'decimal', precision: 12, scale: 2, nullable: true }) netCommission: number;
  @Column({ default: 'pending' }) status: string;
  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true }) paidAt: Date;
  @Column({ type: 'text', nullable: true }) notes: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}
