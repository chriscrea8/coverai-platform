import { Controller, Get, Param, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InsuranceProduct } from './insurance-product.entity';

@ApiTags('Insurance Products')
@Controller('insurance')
export class InsuranceProductsController {
  constructor(
    @InjectRepository(InsuranceProduct)
    private readonly productRepo: Repository<InsuranceProduct>,
  ) {}

  @Get('products')
  @ApiOperation({ summary: 'Browse insurance product catalog' })
  findAll(@Query('category') category?: string, @Query('sme') sme?: string) {
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
