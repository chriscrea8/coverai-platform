// ── payments/payment.entity.ts ───────────────────────────────
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum PaymentStatus {
  PENDING = 'pending', SUCCESSFUL = 'successful', FAILED = 'failed', REFUNDED = 'refunded',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'user_id' }) userId: string;
  @Column({ name: 'policy_id', nullable: true }) policyId: string;
  @Column({ type: 'decimal', precision: 12, scale: 2 }) amount: number;
  @Column({ length: 3, default: 'NGN' }) currency: string;
  @Column({ name: 'payment_status', type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING }) paymentStatus: PaymentStatus;
  @Column({ name: 'payment_reference', unique: true }) paymentReference: string;
  @Column({ default: 'paystack' }) gateway: string;
  @Column({ name: 'gateway_reference', nullable: true }) gatewayReference: string;
  @Column({ name: 'gateway_response', type: 'jsonb', default: {} }) gatewayResponse: Record<string, any>;
  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true }) paidAt: Date;
  @Column({ type: 'jsonb', default: {} }) metadata: Record<string, any>;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}
