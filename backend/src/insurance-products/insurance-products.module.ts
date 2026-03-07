// ── insurance-providers/insurance-provider.entity.ts ─────────
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('insurance_providers')
export class InsuranceProvider {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() name: string;
  @Column({ unique: true }) slug: string;
  @Column({ name: 'api_base_url', nullable: true }) apiBaseUrl: string;
  @Column({ name: 'api_key_encrypted', nullable: true }) apiKeyEncrypted: string;
  @Column({ name: 'contact_email' }) contactEmail: string;
  @Column({ name: 'contact_phone', nullable: true }) contactPhone: string;
  @Column({ name: 'logo_url', nullable: true }) logoUrl: string;
  @Column({ type: 'text', nullable: true }) description: string;
  @Column({ name: 'naicom_license', nullable: true }) naicomLicense: string;
  @Column({ default: 'pending_review' }) status: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}

// ── insurance-products/insurance-product.entity.ts ───────────
import { Entity as Ent, PrimaryGeneratedColumn as PGC, Column as Col, CreateDateColumn as CDC, UpdateDateColumn as UDC } from 'typeorm';

@Ent('insurance_products')
export class InsuranceProduct {
  @PGC('uuid') id: string;
  @Col({ name: 'provider_id' }) providerId: string;
  @Col({ name: 'product_name' }) productName: string;
  @Col({ name: 'product_code', unique: true }) productCode: string;
  @Col() category: string;
  @Col({ type: 'text' }) description: string;
  @Col({ name: 'coverage_details', type: 'jsonb', default: {} }) coverageDetails: Record<string, any>;
  @Col({ name: 'premium_min', type: 'decimal', precision: 12, scale: 2, nullable: true }) premiumMin: number;
  @Col({ name: 'premium_max', type: 'decimal', precision: 12, scale: 2, nullable: true }) premiumMax: number;
  @Col({ name: 'commission_rate', type: 'decimal', precision: 5, scale: 4, default: 0.10 }) commissionRate: number;
  @Col({ name: 'eligibility_rules', type: 'jsonb', default: {} }) eligibilityRules: Record<string, any>;
  @Col({ name: 'duration_months', default: 12 }) durationMonths: number;
  @Col({ name: 'is_sme_product', default: false }) isSmeProduct: boolean;
  @Col({ default: 'draft' }) status: string;
  @Col({ type: 'text', array: true, default: [] }) tags: string[];
  @CDC({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UDC({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}

// ── insurance-products/insurance-products.controller.ts ──────
import { Controller, Get, Post, Body, Param, UseGuards, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@ApiTags('Insurance Products')
@Controller('insurance')
export class InsuranceProductsController {
  constructor(
    @InjectRepository(InsuranceProduct)
    private readonly productRepo: Repository<InsuranceProduct>,
  ) {}

  @Get('products')
  @ApiOperation({ summary: 'Browse insurance product catalog' })
  findAll(
    @Query('category') category?: string,
    @Query('sme') sme?: string,
  ) {
    const where: any = { status: 'active' };
    if (category) where.category = category;
    if (sme === 'true') where.isSmeProduct = true;
    return this.productRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Get insurance product details' })
  findOne(@Param('id') id: string) {
    return this.productRepo.findOne({ where: { id } });
  }
}

// ── insurance-providers/insurance-providers.module.ts ─────────
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([InsuranceProvider])],
  exports: [TypeOrmModule],
})
export class InsuranceProvidersModule {}

// ── insurance-products/insurance-products.module.ts ──────────
import { Module as Mod } from '@nestjs/common';
import { TypeOrmModule as TORM } from '@nestjs/typeorm';

@Mod({
  imports: [TORM.forFeature([InsuranceProduct])],
  controllers: [InsuranceProductsController],
  exports: [TORM],
})
export class InsuranceProductsModule {}
