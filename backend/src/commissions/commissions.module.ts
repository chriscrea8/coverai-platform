import { Module, Injectable } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum CommissionStatus { PENDING = 'pending', PROCESSING = 'processing', PAID = 'paid' }

@Entity('commissions')
export class Commission {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'policy_id' }) policyId: string;
  @Column({ name: 'provider_id' }) providerId: string;
  @Column({ name: 'payment_id', nullable: true }) paymentId: string;
  @Column({ name: 'gross_premium', type: 'decimal', precision: 12, scale: 2 }) grossPremium: number;
  @Column({ name: 'commission_rate', type: 'decimal', precision: 5, scale: 4 }) commissionRate: number;
  @Column({ name: 'commission_amount', type: 'decimal', precision: 12, scale: 2 }) commissionAmount: number;
  @Column({ name: 'platform_fee', type: 'decimal', precision: 12, scale: 2, default: 0 }) platformFee: number;
  @Column({ name: 'net_commission', type: 'decimal', precision: 12, scale: 2, nullable: true }) netCommission: number;
  @Column({ default: 'pending' }) status: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}

@Injectable()
export class CommissionsService {
  constructor(@InjectRepository(Commission) private readonly repo: Repository<Commission>) {}

  async create(data: { policyId: string; providerId: string; grossPremium: number; commissionRate: number; commissionAmount: number }) {
    const platformFee = Number(data.grossPremium) * 0.02;
    const netCommission = Number(data.commissionAmount) - platformFee;
    const c = this.repo.create({ ...data, platformFee, netCommission });
    return this.repo.save(c);
  }

  async getReport(filters?: { providerId?: string; startDate?: Date; endDate?: Date }) {
    const all = await this.repo.find();
    const totalGross = all.reduce((s, c) => s + Number(c.grossPremium), 0);
    const totalCommission = all.reduce((s, c) => s + Number(c.commissionAmount), 0);
    const totalNet = all.reduce((s, c) => s + Number(c.netCommission || 0), 0);
    return { commissions: all, summary: { totalGross, totalCommission, totalNet, count: all.length } };
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Commission])],
  providers: [CommissionsService],
  exports: [CommissionsService],
})
export class CommissionsModule {}
