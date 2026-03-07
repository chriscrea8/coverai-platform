// ── partners/partner.entity.ts ───────────────────────────────
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('partners')
export class Partner {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'company_name' }) companyName: string;
  @Column({ name: 'contact_email' }) contactEmail: string;
  @Column({ name: 'api_key', unique: true }) apiKey: string;
  @Column({ name: 'api_secret' }) apiSecret: string;
  @Column({ default: 'active' }) status: string;
  @Column({ name: 'allowed_ips', type: 'text', array: true, default: [] }) allowedIps: string[];
  @Column({ name: 'webhook_url', nullable: true }) webhookUrl: string;
  @Column({ type: 'text', array: true, default: ['create_policy', 'read_policy', 'create_claim'] }) permissions: string[];
  @Column({ name: 'request_count', default: 0 }) requestCount: number;
  @Column({ name: 'last_request_at', type: 'timestamptz', nullable: true }) lastRequestAt: Date;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}

// ── partners/partners.service.ts ─────────────────────────────
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
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
    await this.partnerRepo.update(partner.id, { requestCount: partner.requestCount + 1, lastRequestAt: new Date() });
    return partner;
  }

  async createApiKey(companyName: string, contactEmail: string) {
    const apiKey = `ck_${crypto.randomBytes(24).toString('hex')}`;
    const apiSecret = `cs_${crypto.randomBytes(32).toString('hex')}`;
    const partner = this.partnerRepo.create({ companyName, contactEmail, apiKey, apiSecret });
    await this.partnerRepo.save(partner);
    this.logger.log(`Partner API key created for: ${companyName}`);
    return { apiKey, apiSecret, message: 'Store these credentials securely — secret will not be shown again.' };
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
}

// ── partners/partners.controller.ts ─────────────────────────
import {
  Controller, Post, Get, Body, Headers, UnauthorizedException, Param,
} from '@nestjs/common';
import { ApiKey, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PartnersService } from './partners.service';

@ApiTags('Partner API')
@Controller('partner')
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  private async validateKey(apiKey: string) {
    if (!apiKey) throw new UnauthorizedException('x-api-key header required');
    return this.partnersService.validateApiKey(apiKey);
  }

  @Post('create-policy')
  @ApiOperation({ summary: '[Partner] Create a policy for an end user' })
  async createPolicy(
    @Headers('x-api-key') apiKey: string,
    @Body() body: { userId: string; dto: any },
  ) {
    await this.validateKey(apiKey);
    return this.partnersService.createPolicy(null, body.userId, body.dto);
  }

  @Get('policies/:userId')
  @ApiOperation({ summary: '[Partner] Get policies for a user' })
  async getPolicies(
    @Headers('x-api-key') apiKey: string,
    @Param('userId') userId: string,
  ) {
    await this.validateKey(apiKey);
    return this.partnersService.getPolicies(userId);
  }

  @Post('claims')
  @ApiOperation({ summary: '[Partner] Submit a claim for a user' })
  async createClaim(
    @Headers('x-api-key') apiKey: string,
    @Body() body: { userId: string; dto: any },
  ) {
    await this.validateKey(apiKey);
    return this.partnersService.createClaim(body.userId, body.dto);
  }
}

// ── partners/partners.module.ts ──────────────────────────────
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartnersController } from './partners.controller';
import { PartnersService } from './partners.service';
import { PoliciesModule } from '../policies/policies.module';
import { ClaimsModule } from '../claims/claims.module';

@Module({
  imports: [TypeOrmModule.forFeature([Partner]), PoliciesModule, ClaimsModule],
  controllers: [PartnersController],
  providers: [PartnersService],
  exports: [PartnersService],
})
export class PartnersModule {}
