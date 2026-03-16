import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ReferralsService } from './referrals.service';

@ApiTags('Referrals')
@Controller('referrals')
@UseGuards(AuthGuard('jwt'))
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get my referral stats, code and earnings' })
  getStats(@Req() req: any) {
    return this.referralsService.getStats(req.user.id);
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate my referral code' })
  generate(@Req() req: any) {
    return this.referralsService.generateCode(req.user.id);
  }
}
