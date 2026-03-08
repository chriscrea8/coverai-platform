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
  policyId: string;
  claimAmount: number;
  description: string;
  incidentDate: string;
  incidentLocation?: string;
}

export class ReviewClaimDto {
  status: 'approved' | 'rejected';
  approvedAmount?: number;
  reviewerNotes?: string;
  rejectionReason?: string;
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
        subject: 'Claim Submitted',
        message: `Your claim ${claimNumber} is under review.`,
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
      if (user) await this.notificationsService.sendEmail(user, {
        subject: status === ClaimStatus.APPROVED ? '✅ Claim Approved' : 'Claim Update',
        message: `Your claim ${claim.claimNumber} has been ${dto.status}.`,
      });
    } catch {}
    return claim;
  }
}
