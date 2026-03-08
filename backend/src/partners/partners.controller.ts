import { Controller, Post, Get, Body, Headers, UnauthorizedException, Param } from '@nestjs/common';
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
}
