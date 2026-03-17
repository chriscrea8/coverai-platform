import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Partner } from './partner.entity';
import { PoliciesService } from '../policies/policies.service';
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
    return [];
  }

  async getAllPolicies() {
    return this.getPolicies('system');
  }

  async generateQuote(params: {
    insuranceType: string;
    customerName?: string;
    customerPhone?: string;
    location?: string;
    vehicleValue?: number;
    coverageType?: string;
  }) {
    const rates: Record<string, any> = {
      motor_third_party:   { min: 5000,   max: 15000,  description: 'Third Party Motor Insurance' },
      motor_comprehensive: { min: null,   max: null,   description: 'Comprehensive Motor Insurance', rateOfValue: 0.03 },
      health_individual:   { min: 30000,  max: 100000, description: 'Individual Health Insurance (HMO)' },
      health_family:       { min: 80000,  max: 250000, description: 'Family Health Insurance Plan' },
      fire_burglary:       { min: 15000,  max: 60000,  description: 'Fire & Burglary Insurance' },
      life_term:           { min: 30000,  max: 80000,  description: 'Term Life Insurance' },
      business_bop:        { min: 40000,  max: 150000, description: "Business Owner's Policy (BOP)" },
    };

    const type = params.insuranceType.toLowerCase().replace(/\s+|-+/g, '_');
    const rate = rates[type] || rates[type + '_comprehensive'] || rates[type + '_individual'];

    if (!rate) {
      return {
        available: true,
        insuranceType: params.insuranceType,
        message: 'Contact us for a custom quote',
        availableTypes: Object.keys(rates),
        currency: 'NGN',
        generatedAt: new Date().toISOString(),
      };
    }

    let premiumMin = rate.min;
    let premiumMax = rate.max;

    if (rate.rateOfValue && params.vehicleValue) {
      premiumMin = Math.round(params.vehicleValue * rate.rateOfValue * 0.7);
      premiumMax = Math.round(params.vehicleValue * rate.rateOfValue * 1.3);
    }

    return {
      available: true,
      insuranceType: rate.description,
      premiumMin,
      premiumMax,
      currency: 'NGN',
      frequency: 'annual',
      coverageType: params.coverageType || 'standard',
      note: 'Final premium depends on risk assessment. Contact us to complete purchase.',
      nextStep: 'POST /api/v1/partner/purchase with productId and userId',
      generatedAt: new Date().toISOString(),
    };
  }

  async partnerPurchase(partnerId: string, body: {
    userId: string;
    productId: string;
    paymentReference?: string;
    coverageDetails?: Record<string, any>;
  }) {
    const policy = await this.policiesService.purchase(body.userId, {
      productId: body.productId,
      coverageDetails: body.coverageDetails || {},
      paymentFrequency: 'annually' as any,
    });

    this.logger.log(`Partner ${partnerId} created policy ${policy.policyNumber} for user ${body.userId}`);

    return {
      success: true,
      policyNumber: policy.policyNumber,
      policyId: policy.id,
      status: policy.policyStatus,
      message: 'Policy created successfully. Activate via payment completion.',
    };
  }
}
