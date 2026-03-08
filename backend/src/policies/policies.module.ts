import { Module, Injectable, NotFoundException, Logger, Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsUUID, IsNumber, IsPositive, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { v4 as uuidv4 } from 'uuid';
import { Policy, PolicyStatus } from './policy.entity';
import { CommissionsService } from '../commissions/commissions.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { CommissionsModule } from '../commissions/commissions.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { CurrentUser } from '../common/decorators';

export class PurchasePolicyDto {
  @ApiProperty() @IsUUID() productId: string;
  @ApiProperty() @IsUUID() providerId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() smeId?: string;
  @ApiProperty() @IsNumber() @IsPositive() premiumAmount: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() coverageAmount?: number;
  @ApiPropertyOptional() @IsOptional() policyDetails?: Record<string, any>;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoRenew?: boolean;
}

@Injectable()
export class PoliciesService {
  private readonly logger = new Logger(PoliciesService.name);

  constructor(
    @InjectRepository(Policy) private readonly policyRepo: Repository<Policy>,
    private readonly commissionsService: CommissionsService,
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
  ) {}

  async purchase(userId: string, dto: PurchasePolicyDto): Promise<Policy> {
    const policyNumber = `POL-${new Date().getFullYear()}-${uuidv4().split('-')[0].toUpperCase()}`;
    const commissionRate = 0.10;
    const commissionAmount = Number(dto.premiumAmount) * commissionRate;
    const startDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);

    const policy = this.policyRepo.create({
      policyNumber, userId, smeId: dto.smeId, productId: dto.productId, providerId: dto.providerId,
      premiumAmount: dto.premiumAmount, commissionAmount, coverageAmount: dto.coverageAmount,
      policyStatus: PolicyStatus.PENDING, startDate, endDate,
      policyDetails: dto.policyDetails || {}, autoRenew: dto.autoRenew || false,
    });
    await this.policyRepo.save(policy);
    this.logger.log(`Policy created: ${policyNumber}`);

    await this.commissionsService.create({
      policyId: policy.id, providerId: policy.providerId,
      grossPremium: Number(policy.premiumAmount), commissionRate, commissionAmount,
    });

    try {
      const user = await this.usersService.findById(userId);
      if (user) await this.notificationsService.sendEmail(user, {
        subject: 'Policy Created',
        message: `Your policy ${policyNumber} was created. Complete payment to activate.`,
      });
    } catch {}
    return policy;
  }

  async activate(policyId: string): Promise<Policy> {
    const policy = await this.findById(policyId);
    policy.policyStatus = PolicyStatus.ACTIVE;
    await this.policyRepo.save(policy);
    try {
      const user = await this.usersService.findById(policy.userId);
      if (user) await this.notificationsService.sendEmail(user, {
        subject: '🎉 Policy Activated!',
        message: `Your policy ${policy.policyNumber} is now active.`,
      });
    } catch {}
    return policy;
  }

  async findByUser(userId: string): Promise<Policy[]> {
    return this.policyRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<Policy> {
    const p = await this.policyRepo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Policy not found');
    return p;
  }

  async findAll(): Promise<Policy[]> {
    return this.policyRepo.find({ order: { createdAt: 'DESC' } });
  }
}

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
