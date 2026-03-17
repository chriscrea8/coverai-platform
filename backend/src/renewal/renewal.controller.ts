import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RenewalService } from './renewal.service';

@ApiTags('Policy Renewal')
@Controller('renewal')
@UseGuards(AuthGuard('jwt'))
export class RenewalController {
  constructor(private readonly renewalService: RenewalService) {}

  @Get('expiring')
  @ApiOperation({ summary: 'Get policies expiring within N days (admin)' })
  getExpiring(@Query('days') days?: string) {
    return this.renewalService.getExpiringPolicies(days ? parseInt(days) : 30);
  }

  @Post('trigger')
  @ApiOperation({ summary: 'Manually trigger renewal reminder check (admin/testing)' })
  trigger() {
    return this.renewalService.triggerRenewalCheck();
  }
}
