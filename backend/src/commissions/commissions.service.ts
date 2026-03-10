import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Commission } from './commission.entity';

@Injectable()
export class CommissionsService {
  constructor(
    @InjectRepository(Commission) private readonly repo: Repository<Commission>,
  ) {}

  async create(data: {
    policyId: string;
    providerId?: string;
    paymentId?: string;
    grossPremium: number;
    commissionRate: number;
    commissionAmount: number;
  }) {
    const platformFee = Number(data.grossPremium) * 0.02;
    const netCommission = Number(data.commissionAmount) - platformFee;
    const c = this.repo.create({ ...data, platformFee, netCommission, status: 'pending' });
    return this.repo.save(c);
  }

  async getReport(filters?: { providerId?: string; startDate?: Date; endDate?: Date; status?: string }) {
    const qb = this.repo.createQueryBuilder('c')
      .leftJoinAndSelect('c.policy', 'policy')
      .leftJoinAndSelect('c.provider', 'provider')
      .orderBy('c.createdAt', 'DESC');

    if (filters?.providerId) qb.andWhere('c.providerId = :pid', { pid: filters.providerId });
    if (filters?.status)     qb.andWhere('c.status = :s', { s: filters.status });
    if (filters?.startDate)  qb.andWhere('c.createdAt >= :sd', { sd: filters.startDate });
    if (filters?.endDate)    qb.andWhere('c.createdAt <= :ed', { ed: filters.endDate });

    const all = await qb.getMany();

    const commissions = all.map(c => ({
      id: c.id,
      policyId: c.policyId,
      policyNumber: (c.policy as any)?.policyNumber || null,
      providerId: c.providerId,
      providerName: (c.provider as any)?.name || null,
      paymentId: c.paymentId,
      grossPremium: Number(c.grossPremium),
      commissionRate: Number(c.commissionRate),
      commissionAmount: Number(c.commissionAmount),
      platformFee: Number(c.platformFee || 0),
      netCommission: Number(c.netCommission || 0),
      status: c.status,
      paidAt: c.paidAt,
      notes: c.notes,
      createdAt: c.createdAt,
    }));

    const pending    = commissions.filter(c => c.status === 'pending');
    const processing = commissions.filter(c => c.status === 'processing');
    const paid       = commissions.filter(c => c.status === 'paid');

    return {
      commissions,
      summary: {
        count: commissions.length,
        totalGross:      commissions.reduce((s, c) => s + c.grossPremium, 0),
        totalCommission: commissions.reduce((s, c) => s + c.commissionAmount, 0),
        totalNet:        commissions.reduce((s, c) => s + c.netCommission, 0),
        totalPlatformFee:commissions.reduce((s, c) => s + c.platformFee, 0),
        totalPending:    pending.reduce((s, c) => s + c.netCommission, 0),
        totalPaid:       paid.reduce((s, c) => s + c.netCommission, 0),
        pendingCount: pending.length,
        processingCount: processing.length,
        paidCount: paid.length,
      },
    };
  }

  async markAsPaid(id: string, notes?: string) {
    const c = await this.repo.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Commission not found');
    await this.repo.update(id, { status: 'paid', paidAt: new Date(), notes: notes || c.notes });
    return { message: 'Commission marked as paid', id };
  }

  async markAsProcessing(id: string) {
    const c = await this.repo.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Commission not found');
    await this.repo.update(id, { status: 'processing' });
    return { message: 'Commission marked as processing', id };
  }

  async bulkMarkAsPaid(ids: string[]) {
    await this.repo.createQueryBuilder().update(Commission)
      .set({ status: 'paid', paidAt: new Date() }).whereInIds(ids).execute();
    return { message: `${ids.length} commissions marked as paid`, count: ids.length };
  }
}
