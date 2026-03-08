import { Module, Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Policy } from './policy.entity';
import { PoliciesService } from './policies.service';
import { PurchasePolicyDto } from './policies.dto';
import { CommissionsModule } from '../commissions/commissions.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
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

  @Get() @ApiOperation({ summary: 'Get my policies' })
  findAll(@CurrentUser('id') userId: string) {
    return this.policiesService.findByUser(userId);
  }

  @Get(':id') @ApiOperation({ summary: 'Get policy by ID' })
  findOne(@Param('id') id: string) {
    return this.policiesService.findById(id);
  }
}

@Module({
  imports: [
    TypeOrmModule.forFeature([Policy]),
    CommissionsModule,
    NotificationsModule,
    UsersModule,
  ],
  controllers: [PoliciesController],
  providers: [PoliciesService],
  exports: [PoliciesService, TypeOrmModule],
})
export class PoliciesModule {}
