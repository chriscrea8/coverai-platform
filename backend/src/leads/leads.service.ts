import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
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

  private resend: Resend | null = null;
  private fromAddress = 'CoverAI <leads@coverai.ng>';
  private adminEmail = 'christianchukwu84@gmail.com'; // Admin receives all leads

  constructor(
    @InjectRepository(Lead) private readonly leadsRepo: Repository<Lead>,
    private readonly configService: ConfigService,
  ) {
    const apiKey = configService.get<string>('RESEND_API_KEY');
    if (apiKey) {
      this.resend = new Resend(apiKey);
    }
  }

  async create(dto: CreateLeadDto): Promise<Lead> {
    const lead = this.leadsRepo.create({
      ...dto,
      source: dto.source || 'web',
      status: 'new',
    });
    const saved = await this.leadsRepo.save(lead);
    this.logger.log(`Lead created: ${saved.id} | ${dto.insuranceType} | ${dto.source}`);
    // Auto-route if we have contact info
    if (saved.phone || saved.email) {
      this.routeLeadToInsurers(saved).catch(e => this.logger.warn('Auto-routing failed: ' + e.message));
    }
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


  async routeLeadToInsurers(lead: Lead) {
    if (!this.resend) {
      this.logger.warn('RESEND_API_KEY not set — lead routing email skipped');
      return;
    }

    const subject = `🔥 New Insurance Lead — ${lead.insuranceType?.toUpperCase()} | ${lead.name || 'Unknown'} | ${lead.location || 'Nigeria'}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0A0F1E; padding: 20px; border-radius: 12px 12px 0 0;">
          <h2 style="color: #F4A623; margin: 0;">CoverAI — New Insurance Lead</h2>
          <p style="color: #6B7FA3; margin: 5px 0 0;">A potential customer is interested in insurance</p>
        </div>
        <div style="background: #f9f9f9; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #e0e0e0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #e0e0e0;">
              <td style="padding: 12px 0; color: #666; width: 40%;">Name</td>
              <td style="padding: 12px 0; font-weight: bold;">${lead.name || 'Not provided'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e0e0e0;">
              <td style="padding: 12px 0; color: #666;">Phone</td>
              <td style="padding: 12px 0; font-weight: bold; color: #1A3A8F;">${lead.phone || 'Not provided'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e0e0e0;">
              <td style="padding: 12px 0; color: #666;">Email</td>
              <td style="padding: 12px 0;">${lead.email || 'Not provided'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e0e0e0;">
              <td style="padding: 12px 0; color: #666;">Insurance Type</td>
              <td style="padding: 12px 0; font-weight: bold; color: #F4A623; text-transform: uppercase;">${lead.insuranceType}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e0e0e0;">
              <td style="padding: 12px 0; color: #666;">Location</td>
              <td style="padding: 12px 0;">${lead.location || 'Not specified'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e0e0e0;">
              <td style="padding: 12px 0; color: #666;">Source</td>
              <td style="padding: 12px 0;">${lead.source?.toUpperCase() || 'WEB'}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; color: #666;">Notes</td>
              <td style="padding: 12px 0; font-size: 13px;">${lead.notes || 'No notes'}</td>
            </tr>
          </table>
          <div style="margin-top: 20px; padding: 16px; background: #FFF9E6; border-left: 4px solid #F4A623; border-radius: 4px;">
            <strong>⚡ Action Required:</strong> Contact this lead within 24 hours for best conversion rate.
          </div>
          <p style="margin-top: 16px; font-size: 12px; color: #999;">
            Lead ID: ${lead.id} | Created: ${new Date(lead.createdAt).toLocaleString('en-NG')}
          </p>
        </div>
      </div>
    `;

    try {
      await this.resend.emails.send({
        from: this.fromAddress,
        to: [this.adminEmail],
        subject,
        html,
      });
      this.logger.log('Lead routing email sent for lead: ' + lead.id);
      await this.updateStatus(lead.id, 'contacted', 'CoverAI Admin (email sent)');
    } catch (e) {
      this.logger.error('Lead routing email failed: ' + e.message);
    }
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
