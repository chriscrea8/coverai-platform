import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CuracelService } from './curacel.service';

@ApiTags('Curacel Insurance API')
@Controller('curacel')
export class CuracelController {
  constructor(private readonly curacelService: CuracelService) {}

  @Get('status')
  @ApiOperation({ summary: 'Check Curacel API connection status' })
  getStatus() {
    return this.curacelService.getStatus();
  }

  @Get('product-types')
  @ApiOperation({ summary: 'List all insurance product types from Curacel' })
  getProductTypes() {
    return this.curacelService.getProductTypes();
  }

  @Get('products')
  @ApiOperation({ summary: 'List insurance products from Curacel (with real premiums)' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by product type ID or slug' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'calculate_premium', required: false })
  getProducts(
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('calculate_premium') calcPremium?: string,
  ) {
    return this.curacelService.getProducts({
      type: type ? (isNaN(Number(type)) ? type : Number(type)) : undefined,
      page: page ? Number(page) : 1,
      calculate_premium: calcPremium ? Number(calcPremium) : 1,
    });
  }

  @Get('products/:code')
  @ApiOperation({ summary: 'Get a single Curacel product by code or ID' })
  getProduct(@Param('code') code: string) {
    return this.curacelService.getProduct(code);
  }

  @Post('quote')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Create a real quote from Curacel insurer' })
  createQuote(@Body() dto: {
    product_code: string;
    customer: { first_name: string; last_name: string; email: string; phone: string };
    fields?: Record<string, any>;
    asset_value?: number;
  }) {
    return this.curacelService.createQuote(dto);
  }

  @Post('quote/:code/convert')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Convert a quote to an order (purchase)' })
  convertQuote(@Param('code') code: string) {
    return this.curacelService.convertQuoteToOrder(code);
  }

  @Get('policies')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get policies from Curacel' })
  getPolicies(@Query('page') page?: string) {
    return this.curacelService.getPolicies({ page: page ? Number(page) : 1 });
  }

  @Get('policies/:code')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get a single Curacel policy' })
  getPolicy(@Param('code') code: string) {
    return this.curacelService.getPolicy(code);
  }

  @Post('claims')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Submit a claim to Curacel insurer' })
  submitClaim(@Body() dto: {
    policy_code: string;
    description: string;
    amount: number;
    incident_date: string;
    attachments?: string[];
  }) {
    return this.curacelService.submitClaim(dto);
  }

  @Get('wallet')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get Curacel wallet balance' })
  getWallet() {
    return this.curacelService.getWalletBalance();
  }
}
