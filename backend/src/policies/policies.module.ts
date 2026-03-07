// ── policies/policies.controller.ts ─────────────────────────
import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PoliciesService } from './policies.service';
import { PurchasePolicyDto } from './policies.dto';
import { CurrentUser } from '../common/decorators';

@ApiTags('Policies')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth('JWT')
@Controller('policies')
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  @Post('purchase')
  @ApiOperation({ summary: 'Purchase a new insurance policy' })
  purchase(@CurrentUser('id') userId: string, @Body() dto: PurchasePolicyDto) {
    return this.policiesService.purchase(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all policies for current user' })
  findAll(@CurrentUser('id') userId: string) {
    return this.policiesService.findByUser(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get policy by ID' })
  findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.policiesService.findById(id);
  }
}

// ── policies/policies.module.ts ──────────────────────────────
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Policy } from './policy.entity';
import { PoliciesService } from './policies.service';
import { PoliciesController } from './policies.controller';
import { CommissionsModule } from '../commissions/commissions.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Policy]),
    CommissionsModule,
    NotificationsModule,
    UsersModule,
  ],
  controllers: [PoliciesController],
  providers: [PoliciesService],
  exports: [PoliciesService],
})
export class PoliciesModule {}
