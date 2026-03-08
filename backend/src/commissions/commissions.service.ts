import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Commission } from './commissions.module';

@Injectable()
export class CommissionsService {
  constructor(
    @InjectRepository(Commission) private readonly repo: Repository<Commission>,
  ) {}

  async create(data: {
    policyId: string;
    providerId: string;
    grossPremium: number;
    commissionRate: number;
    commissionAmount: number;
  }) {
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
    return {
      commissions: all,
      summary: { totalGross, totalCommission, totalNet, count: all.length },
    };
  }
}
