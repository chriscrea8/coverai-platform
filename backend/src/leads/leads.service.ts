import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead } from './lead.entity';

export interface CreateLeadDto {
  userId?: string;
  name?: string;
  phone?: string;
  email?: string;
  location?: string;
  insuranceType: string;
  productId?: string;
  providerId?: string;
  notes?: string;
  metadata?: Record<string, any>;
  source?: string;
  sessionId?: string;
}

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    @InjectRepository(Lead) private readonly leadsRepo: Repository<Lead>,
  ) {}

  async create(dto: CreateLeadDto): Promise<Lead> {
    const lead = this.leadsRepo.create({
      ...dto,
      source: dto.source || 'web',
      status: 'new',
    });
    const saved = await this.leadsRepo.save(lead);
    this.logger.log(`Lead created: ${saved.id} | ${dto.insuranceType} | ${dto.source}`);
    return saved;
  }

  async findAll(filters?: { status?: string; source?: string }) {
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.source) where.source = filters.source;
    return this.leadsRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async findByUser(userId: string) {
    return this.leadsRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async updateStatus(id: string, status: string, routedTo?: string) {
    const update: any = { status };
    if (routedTo) {
      update.routedTo = routedTo;
      update.routedAt = new Date();
    }
    await this.leadsRepo.update(id, update);
    return this.leadsRepo.findOne({ where: { id } });
  }

  async getStats() {
    const total = await this.leadsRepo.count();
    const byStatus = await this.leadsRepo
      .createQueryBuilder('l')
      .select('l.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('l.status')
      .getRawMany();
    const bySource = await this.leadsRepo
      .createQueryBuilder('l')
      .select('l.source', 'source')
      .addSelect('COUNT(*)', 'count')
      .groupBy('l.source')
      .getRawMany();
    const byType = await this.leadsRepo
      .createQueryBuilder('l')
      .select('l.insurance_type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('l.insurance_type')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();
    return { total, byStatus, bySource, byType };
  }
}
