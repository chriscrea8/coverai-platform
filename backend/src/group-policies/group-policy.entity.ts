import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export interface GroupMember {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role?: string; // employee | director | vehicle
  assetDescription?: string; // for fleet: vehicle reg number/model
  individualPremium?: number;
  addedAt: string;
}

@Entity('group_policies')
export class GroupPolicy {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ name: 'owner_id' }) ownerId: string;
  @Column({ name: 'sme_id', nullable: true }) smeId: string;
  @Column({ name: 'product_id', nullable: true }) productId: string;
  @Column({ name: 'provider_id', nullable: true }) providerId: string;

  @Column({ name: 'policy_name' }) policyName: string;
  @Column({ name: 'policy_type' }) policyType: string;

  @Column({ name: 'total_premium', type: 'decimal', precision: 12, scale: 2 }) totalPremium: number;
  @Column({ name: 'member_count', default: 0 }) memberCount: number;

  @Column({ default: 'active' }) status: string;

  @Column({ name: 'start_date', type: 'date', nullable: true }) startDate: Date;
  @Column({ name: 'end_date', type: 'date', nullable: true }) endDate: Date;

  @Column({ type: 'jsonb', default: [] }) members: GroupMember[];
  @Column({ type: 'jsonb', default: {} }) coverageDetails: Record<string, any>;

  @Column({ name: 'policy_number', unique: true, nullable: true }) policyNumber: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}
