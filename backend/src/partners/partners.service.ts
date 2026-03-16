import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Partner } from './partner.entity';
import { PoliciesService } from '../policies/policies.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClaimsService } from '../claims/claims.service';

@Injectable()
export class PartnersService {
  private readonly logger = new Logger(PartnersService.name);

  constructor(
    @InjectRepository(Partner) private readonly partnerRepo: Repository<Partner>,
    private readonly policiesService: PoliciesService,
    private readonly claimsService: ClaimsService,
  ) {}

  async validateApiKey(apiKey: string): Promise<Partner> {
    const partner = await this.partnerRepo.findOne({ where: { apiKey, status: 'active' } });
    if (!partner) throw new UnauthorizedException('Invalid API key');
    await this.partnerRepo.update(partner.id, {
      requestCount: partner.requestCount + 1,
      lastRequestAt: new Date(),
    });
    return partner;
  }

  async createApiKey(companyName: string, contactEmail: string) {
    const apiKey = `ck_${crypto.randomBytes(24).toString('hex')}`;
    const apiSecret = `cs_${crypto.randomBytes(32).toString('hex')}`;
    const partner = this.partnerRepo.create({ companyName, contactEmail, apiKey, apiSecret });
    await this.partnerRepo.save(partner);
    this.logger.log(`Partner API key created for: ${companyName}`);
    return { apiKey, apiSecret, message: 'Store these credentials securely.' };
  }

  async createPolicy(partnerId: string, userId: string, dto: any) {
    return this.policiesService.purchase(userId, dto);
  }

  async getPolicies(userId: string) {
    return this.policiesService.findByUser(userId);
  }

  async createClaim(userId: string, dto: any) {
    return this.claimsService.create(userId, dto);
  }

  async getLeads(partnerId: string) {
    // Return all leads for now - in production filter by partnerId
    return [];
  }

  async getAllPolicies() {
    return this.getPolicies('system');
  }
}
