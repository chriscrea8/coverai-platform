import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GroupPolicy, GroupMember } from './group-policy.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class GroupPoliciesService {
  constructor(
    @InjectRepository(GroupPolicy)
    private readonly groupPolicyRepo: Repository<GroupPolicy>,
  ) {}

  async create(ownerId: string, dto: {
    policyName: string;
    policyType: string;
    productId?: string;
    providerId?: string;
    smeId?: string;
    totalPremium: number;
    startDate?: Date;
    endDate?: Date;
    coverageDetails?: Record<string, any>;
  }) {
    const policyNumber = `GP-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    const policy = this.groupPolicyRepo.create({
      ...dto,
      ownerId,
      policyNumber,
      members: [],
      memberCount: 0,
      status: 'active',
    });
    return this.groupPolicyRepo.save(policy);
  }

  async findByOwner(ownerId: string) {
    return this.groupPolicyRepo.find({
      where: { ownerId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, ownerId: string) {
    const policy = await this.groupPolicyRepo.findOne({ where: { id } });
    if (!policy) throw new NotFoundException('Group policy not found');
    if (policy.ownerId !== ownerId) throw new ForbiddenException('Access denied');
    return policy;
  }

  async addMember(id: string, ownerId: string, member: Omit<GroupMember, 'id' | 'addedAt'>) {
    const policy = await this.findOne(id, ownerId);
    const newMember: GroupMember = {
      ...member,
      id: uuidv4(),
      addedAt: new Date().toISOString(),
    };
    const updatedMembers = [...(policy.members || []), newMember];
    await this.groupPolicyRepo.update(id, {
      members: updatedMembers,
      memberCount: updatedMembers.length,
    });
    return this.groupPolicyRepo.findOne({ where: { id } });
  }

  async removeMember(id: string, ownerId: string, memberId: string) {
    const policy = await this.findOne(id, ownerId);
    const updatedMembers = (policy.members || []).filter(m => m.id !== memberId);
    await this.groupPolicyRepo.update(id, {
      members: updatedMembers,
      memberCount: updatedMembers.length,
    });
    return this.groupPolicyRepo.findOne({ where: { id } });
  }

  async update(id: string, ownerId: string, dto: Partial<GroupPolicy>) {
    await this.findOne(id, ownerId);
    delete dto.ownerId; // prevent owner change
    await this.groupPolicyRepo.update(id, dto);
    return this.groupPolicyRepo.findOne({ where: { id } });
  }

  async getStats(ownerId: string) {
    const policies = await this.findByOwner(ownerId);
    const totalMembers = policies.reduce((sum, p) => sum + (p.memberCount || 0), 0);
    const totalPremium = policies.reduce((sum, p) => sum + Number(p.totalPremium || 0), 0);
    return {
      totalPolicies: policies.length,
      activePolicies: policies.filter(p => p.status === 'active').length,
      totalMembers,
      totalPremium,
      byType: policies.reduce((acc, p) => {
        acc[p.policyType] = (acc[p.policyType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }
}
