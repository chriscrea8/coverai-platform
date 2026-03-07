// ── claims/claims.dto.ts ─────────────────────────────────────
import {
  IsUUID, IsNumber, IsPositive, IsString, IsOptional, IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClaimDto {
  @ApiProperty() @IsUUID() policyId: string;
  @ApiProperty() @IsNumber() @IsPositive() claimAmount: number;
  @ApiProperty() @IsString() description: string;
  @ApiProperty() @IsDateString() incidentDate: string;
  @ApiPropertyOptional() @IsOptional() @IsString() incidentLocation?: string;
}

export class ReviewClaimDto {
  @ApiProperty({ enum: ['approved', 'rejected'] }) status: 'approved' | 'rejected';
  @ApiPropertyOptional() @IsOptional() @IsNumber() approvedAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() reviewerNotes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() rejectionReason?: string;
}

// ── claims/claims.service.ts ─────────────────────────────────
import {
  Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Claim, ClaimStatus } from './claim.entity';
import { CreateClaimDto, ReviewClaimDto } from './claims.dto';
import { PoliciesService } from '../policies/policies.service';
import { PolicyStatus } from '../policies/policy.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class ClaimsService {
  private readonly logger = new Logger(ClaimsService.name);

  constructor(
    @InjectRepository(Claim) private readonly claimRepo: Repository<Claim>,
    private readonly policiesService: PoliciesService,
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
  ) {}

  async create(userId: string, dto: CreateClaimDto): Promise<Claim> {
    const policy = await this.policiesService.findById(dto.policyId);
    if (policy.userId !== userId) throw new BadRequestException('Policy not owned by user');
    if (policy.policyStatus !== PolicyStatus.ACTIVE) {
      throw new BadRequestException('Policy is not active');
    }

    const claimNumber = `CLM-${new Date().getFullYear()}-${uuidv4().split('-')[0].toUpperCase()}`;
    const claim = this.claimRepo.create({
      claimNumber,
      policyId: dto.policyId,
      userId,
      claimAmount: dto.claimAmount,
      description: dto.description,
      incidentDate: new Date(dto.incidentDate),
      incidentLocation: dto.incidentLocation,
    });
    await this.claimRepo.save(claim);

    this.logger.log(`Claim submitted: ${claimNumber} by user ${userId}`);

    const user = await this.usersService.findById(userId);
    if (user) {
      await this.notificationsService.sendEmail(user, {
        subject: 'Claim Submitted Successfully',
        message: `Your claim ${claimNumber} has been submitted and is under review. We'll update you within 2–5 business days.`,
      }).catch(() => {});
    }

    return claim;
  }

  async findByUser(userId: string): Promise<Claim[]> {
    return this.claimRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<Claim> {
    const claim = await this.claimRepo.findOne({ where: { id } });
    if (!claim) throw new NotFoundException('Claim not found');
    return claim;
  }

  async findAll(): Promise<Claim[]> {
    return this.claimRepo.find({ order: { createdAt: 'DESC' } });
  }

  async addEvidence(claimId: string, userId: string, fileUrls: string[]): Promise<Claim> {
    const claim = await this.findById(claimId);
    if (claim.userId !== userId) throw new BadRequestException('Not authorized');
    claim.evidenceFiles = [...claim.evidenceFiles, ...fileUrls];
    return this.claimRepo.save(claim);
  }

  // Admin only
  async review(claimId: string, reviewerId: string, dto: ReviewClaimDto): Promise<Claim> {
    const claim = await this.findById(claimId);
    const newStatus = dto.status === 'approved' ? ClaimStatus.APPROVED : ClaimStatus.REJECTED;

    Object.assign(claim, {
      status: newStatus,
      approvedAmount: dto.approvedAmount,
      reviewerNotes: dto.reviewerNotes,
      rejectionReason: dto.rejectionReason,
      reviewerId,
      reviewedAt: new Date(),
      resolvedAt: newStatus === ClaimStatus.APPROVED || newStatus === ClaimStatus.REJECTED ? new Date() : null,
    });

    await this.claimRepo.save(claim);

    const user = await this.usersService.findById(claim.userId);
    if (user) {
      const subject = newStatus === ClaimStatus.APPROVED ? '✅ Claim Approved!' : '❌ Claim Update';
      const message = newStatus === ClaimStatus.APPROVED
        ? `Your claim ${claim.claimNumber} has been approved for ₦${dto.approvedAmount?.toLocaleString() || claim.claimAmount.toLocaleString()}.`
        : `Your claim ${claim.claimNumber} has been reviewed. Reason: ${dto.rejectionReason}`;
      await this.notificationsService.sendEmail(user, { subject, message }).catch(() => {});
    }

    return claim;
  }
}

// ── claims/claims.controller.ts ──────────────────────────────
import {
  Controller, Get, Post, Body, Param, UseGuards, Patch,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClaimsService } from './claims.service';
import { CreateClaimDto } from './claims.dto';
import { CurrentUser } from '../common/decorators';

@ApiTags('Claims')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth('JWT')
@Controller('claims')
export class ClaimsController {
  constructor(private readonly claimsService: ClaimsService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a new claim' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateClaimDto) {
    return this.claimsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: "Get current user's claims" })
  findAll(@CurrentUser('id') userId: string) {
    return this.claimsService.findByUser(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get claim by ID' })
  findOne(@Param('id') id: string) {
    return this.claimsService.findById(id);
  }
}

// ── claims/claims.module.ts ──────────────────────────────────
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Claim } from './claim.entity';
import { ClaimsService } from './claims.service';
import { ClaimsController } from './claims.controller';
import { PoliciesModule } from '../policies/policies.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Claim]), PoliciesModule, NotificationsModule, UsersModule],
  controllers: [ClaimsController],
  providers: [ClaimsService],
  exports: [ClaimsService],
})
export class ClaimsModule {}
