import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('insurance_products')
export class InsuranceProduct {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'provider_id' }) providerId: string;
  @Column({ name: 'product_name' }) productName: string;
  @Column({ name: 'product_code', unique: true }) productCode: string;
  @Column() category: string;
  @Column({ type: 'text' }) description: string;
  @Column({ name: 'coverage_details', type: 'jsonb', default: {} }) coverageDetails: Record<string, any>;
  @Column({ name: 'premium_min', type: 'decimal', precision: 12, scale: 2, nullable: true }) premiumMin: number;
  @Column({ name: 'premium_max', type: 'decimal', precision: 12, scale: 2, nullable: true }) premiumMax: number;
  @Column({ name: 'commission_rate', type: 'decimal', precision: 5, scale: 4, default: 0.10 }) commissionRate: number;
  @Column({ name: 'eligibility_rules', type: 'jsonb', default: {} }) eligibilityRules: Record<string, any>;
  @Column({ name: 'duration_months', default: 12 }) durationMonths: number;
  @Column({ name: 'is_sme_product', default: false }) isSmeProduct: boolean;
  @Column({ default: 'draft' }) status: string;
  @Column({ type: 'text', array: true, default: [] }) tags: string[];
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}
