import { Controller, Post, Get, Patch, Body, Headers, UnauthorizedException, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
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

  @Get('leads')
  @ApiOperation({ summary: '[Partner] Get leads assigned to this partner' })
  async getLeads(
    @Headers('x-api-key') apiKey: string,
  ) {
    const partner = await this.validateKey(apiKey);
    return this.partnersService.getLeads(partner.id);
  }

  @Get('policies')
  @ApiOperation({ summary: '[Partner] Get all policies' })
  async getAllPolicies(
    @Headers('x-api-key') apiKey: string,
  ) {
    await this.validateKey(apiKey);
    return this.partnersService.getAllPolicies();
  }
  @Post('quote')
  @ApiOperation({ summary: '[Partner] Get insurance quote for a customer' })
  async getQuote(
    @Headers('x-api-key') apiKey: string,
    @Body() body: {
      insuranceType: string;
      customerName?: string;
      customerPhone?: string;
      location?: string;
      vehicleValue?: number;
      coverageType?: string;
    },
  ) {
    await this.validateKey(apiKey);
    return this.partnersService.generateQuote(body);
  }

  @Post('purchase')
  @ApiOperation({ summary: '[Partner] Purchase a policy for a customer' })
  async purchase(
    @Headers('x-api-key') apiKey: string,
    @Body() body: {
      userId: string;
      productId: string;
      paymentReference?: string;
      coverageDetails?: Record<string, any>;
    },
  ) {
    const partner = await this.validateKey(apiKey);
    return this.partnersService.partnerPurchase(partner.id, body);
  }

  @Post('create-key')
  @ApiOperation({ summary: 'Create a new partner API key (admin only)' })
  async createKey(
    @Headers('x-api-key') apiKey: string,
    @Body() body: { companyName: string; contactEmail: string },
  ) {
    // Only existing valid partners can create new keys (admin flow)
    await this.validateKey(apiKey);
    return this.partnersService.createApiKey(body.companyName, body.contactEmail);
  }
}
