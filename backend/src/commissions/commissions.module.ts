// ── commissions/commission.entity.ts ────────────────────────
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum CommissionStatus {
  PENDING = 'pending', PROCESSING = 'processing', PAID = 'paid', DISPUTED = 'disputed',
}

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
  @Column({ type: 'enum', enum: CommissionStatus, default: CommissionStatus.PENDING }) status: CommissionStatus;
  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true }) paidAt: Date;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}

// ── commissions/commissions.service.ts ───────────────────────
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Commission } from './commission.entity';

@Injectable()
export class CommissionsService {
  constructor(
    @InjectRepository(Commission) private readonly commissionRepo: Repository<Commission>,
  ) {}

  async create(data: {
    policyId: string; providerId: string; grossPremium: number;
    commissionRate: number; commissionAmount: number;
  }) {
    const PLATFORM_FEE_RATE = 0.02; // 2% platform fee on gross premium
    const platformFee = data.grossPremium * PLATFORM_FEE_RATE;
    const netCommission = data.commissionAmount - platformFee;

    const commission = this.commissionRepo.create({
      ...data,
      platformFee,
      netCommission,
    });
    return this.commissionRepo.save(commission);
  }

  async getReport(filters?: { providerId?: string; startDate?: Date; endDate?: Date }) {
    const qb = this.commissionRepo.createQueryBuilder('c');
    if (filters?.providerId) qb.andWhere('c.provider_id = :providerId', { providerId: filters.providerId });
    if (filters?.startDate) qb.andWhere('c.created_at >= :startDate', { startDate: filters.startDate });
    if (filters?.endDate) qb.andWhere('c.created_at <= :endDate', { endDate: filters.endDate });

    const commissions = await qb.getMany();
    const totalGross = commissions.reduce((s, c) => s + Number(c.grossPremium), 0);
    const totalCommission = commissions.reduce((s, c) => s + Number(c.commissionAmount), 0);
    const totalNet = commissions.reduce((s, c) => s + Number(c.netCommission || 0), 0);

    return { commissions, summary: { totalGross, totalCommission, totalNet, count: commissions.length } };
  }
}

// ── commissions/commissions.module.ts ────────────────────────
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommissionsService } from './commissions.service';

@Module({
  imports: [TypeOrmModule.forFeature([Commission])],
  providers: [CommissionsService],
  exports: [CommissionsService],
})
export class CommissionsModule {}
