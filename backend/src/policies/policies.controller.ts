import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PoliciesService, calcInstallment } from './policies.service';
import { PurchasePolicyDto } from './policies.dto';
import { PaymentFrequency } from './policy.entity';
import { CurrentUser } from '../common/decorators';

@ApiTags('Policies')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth('JWT')
@Controller('policies')
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  @Post('purchase') @ApiOperation({ summary: 'Purchase a policy' })
  purchase(@CurrentUser('id') userId: string, @Body() dto: PurchasePolicyDto) {
    return this.policiesService.purchase(userId, dto);
  }

  /** Returns pricing breakdown for all frequencies given an annual base premium */
  @Get('pricing') @ApiOperation({ summary: 'Get installment pricing for all frequencies' })
  pricing(@Query('annualPremium') annualPremium: string) {
    const base = Number(annualPremium) || 0;
    return Object.values(PaymentFrequency).map(freq => ({
      frequency: freq,
      ...calcInstallment(base, freq),
    }));
  }

  @Post(':id/reactivate') @ApiOperation({ summary: 'Reactivate a lapsed policy' })
  reactivate(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.policiesService.reactivate(id, userId);
  }

  @Get() @ApiOperation({ summary: 'Get my policies' })
  findAll(@CurrentUser('id') userId: string) {
    return this.policiesService.findByUser(userId);
  }

  @Get(':id') @ApiOperation({ summary: 'Get policy by ID' })
  findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.policiesService.findByIdForUser(id, userId);
  }
}
