import { IsString, IsNumber, IsOptional, IsUUID, IsDateString, Min } from 'class-validator';
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Claim, ClaimStatus } from './claim.entity';
import { PolicyStatus } from '../policies/policy.entity';
import { PoliciesService } from '../policies/policies.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';

export class CreateClaimDto {
  @IsUUID() policyId: string;
  @IsNumber() @Min(1) claimAmount: number;
  @IsString() description: string;
  @IsDateString() incidentDate: string;
  @IsOptional() @IsString() incidentLocation?: string;
}

export class ReviewClaimDto {
  @IsString() status: 'approved' | 'rejected';
  @IsOptional() @IsNumber() approvedAmount?: number;
  @IsOptional() @IsString() reviewerNotes?: string;
  @IsOptional() @IsString() rejectionReason?: string;
}

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
    if (policy.policyStatus !== PolicyStatus.ACTIVE) throw new BadRequestException('Policy is not active');

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
    this.logger.log(`Claim submitted: ${claimNumber}`);

    try {
      const user = await this.usersService.findById(userId);
      if (user) await this.notificationsService.sendEmail(user, {
        subject: `🛡️ Claim Submitted — ${claimNumber}`,
        message: [
          `Hello ${user.name},`,
          '',
          `Your claim ${claimNumber} has been received and is now under review.`,
          '',
          `Claim Amount: ₦${Number(dto.claimAmount).toLocaleString()}`,
          `Incident Date: ${new Date(dto.incidentDate).toLocaleDateString('en-NG', { dateStyle: 'long' })}`,
          '',
          'Our claims team typically reviews submissions within 3–5 business days.',
          'You will be notified immediately once a decision is made.',
          '',
          'Track your claim status at coverai.ng/dashboard',
        ].join('\n'),
        entityType: 'claim',
        entityId: claim.id,
        metadata: { claimNumber, claimAmount: dto.claimAmount },
      });
    } catch {}
    return claim;
  }

  async findByUser(userId: string): Promise<Claim[]> {
    return this.claimRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<Claim> {
    const c = await this.claimRepo.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Claim not found');
    return c;
  }

  async findAll(): Promise<Claim[]> {
    return this.claimRepo.find({ order: { createdAt: 'DESC' } });
  }

  async review(claimId: string, reviewerId: string, dto: ReviewClaimDto): Promise<Claim> {
    const claim = await this.findById(claimId);
    const status = dto.status === 'approved' ? ClaimStatus.APPROVED : ClaimStatus.REJECTED;
    Object.assign(claim, {
      status, approvedAmount: dto.approvedAmount, reviewerNotes: dto.reviewerNotes,
      rejectionReason: dto.rejectionReason, reviewerId, reviewedAt: new Date(), resolvedAt: new Date(),
    });
    await this.claimRepo.save(claim);
    try {
      const user = await this.usersService.findById(claim.userId);
      const approvedMsg = dto.approvedAmount
        ? `\nApproved Amount: ₦${Number(dto.approvedAmount).toLocaleString()}`
        : '';
      const noteMsg = dto.reviewerNotes ? `\nReviewer Note: ${dto.reviewerNotes}` : '';
      const rejectionMsg = dto.rejectionReason ? `\nReason: ${dto.rejectionReason}` : '';

      if (user) await this.notificationsService.sendEmail(user, {
        subject: status === ClaimStatus.APPROVED ? `✅ Claim Approved — ${claim.claimNumber}` : `❌ Claim Decision — ${claim.claimNumber}`,
        message: status === ClaimStatus.APPROVED
          ? [
              `Hello ${user.name},`,
              '',
              `Great news! Your claim ${claim.claimNumber} has been approved.`,
              approvedMsg,
              noteMsg,
              '',
              'Our payments team will process your payout within 5–7 business days.',
              'You will receive a separate notification when the payment is initiated.',
            ].filter(Boolean).join('\n')
          : [
              `Hello ${user.name},`,
              '',
              `After careful review, your claim ${claim.claimNumber} could not be approved at this time.`,
              rejectionMsg,
              noteMsg,
              '',
              'If you believe this decision is incorrect, please contact our support team at claims@coverai.ng with your claim number and any additional documentation.',
            ].filter(Boolean).join('\n'),
        entityType: 'claim',
        entityId: claim.id,
        metadata: { claimNumber: claim.claimNumber, status: dto.status, approvedAmount: dto.approvedAmount },
      });
    } catch {}
    return claim;
  }
}
