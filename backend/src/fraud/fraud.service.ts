import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { FraudFlag, FraudRiskLevel } from './fraud-flag.entity';
import { Claim } from '../claims/claim.entity';
import { Policy } from '../policies/policy.entity';

export interface FraudCheckResult {
  flagged: boolean;
  riskScore: number;
  riskLevel: FraudRiskLevel;
  flags: string[];
  details: Record<string, any>;
}

@Injectable()
export class FraudService {
  private readonly logger = new Logger(FraudService.name);

  constructor(
    @InjectRepository(FraudFlag) private readonly fraudRepo: Repository<FraudFlag>,
    @InjectRepository(Claim) private readonly claimRepo: Repository<Claim>,
    @InjectRepository(Policy) private readonly policyRepo: Repository<Policy>,
  ) {}

  // ── MAIN: Run all fraud checks when a claim is submitted ─────────────────
  async checkClaim(claim: Claim): Promise<FraudCheckResult> {
    const checks = await Promise.all([
      this.checkDuplicateClaim(claim),
      this.checkEarlyClaimAfterPurchase(claim),
      this.checkMultipleClaimsFromUser(claim),
      this.checkClaimExceedsCoverage(claim),
      this.checkFrequentClaimsByUser(claim),
    ]);

    const allFlags = checks.flatMap(c => c.flags);
    const totalScore = Math.min(100, checks.reduce((sum, c) => sum + c.score, 0));
    const riskLevel = this.getRiskLevel(totalScore);
    const flagged = totalScore >= 30;

    if (flagged) {
      await this.saveFraudFlag(claim, allFlags, totalScore, riskLevel, checks);
    }

    return {
      flagged,
      riskScore: totalScore,
      riskLevel,
      flags: allFlags,
      details: checks.reduce((acc, c, i) => ({ ...acc, [`rule_${i + 1}`]: c }), {}),
    };
  }

  // ── RULE 1: Duplicate claim for same incident ─────────────────────────────
  private async checkDuplicateClaim(claim: Claim): Promise<{ flags: string[]; score: number }> {
    const threeDaysAgo = new Date(claim.submittedAt);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const duplicates = await this.claimRepo
      .createQueryBuilder('c')
      .where('c.policy_id = :pid', { pid: claim.policyId })
      .andWhere('c.incident_date = :date', { date: claim.incidentDate })
      .andWhere('c.id != :id', { id: claim.id })
      .getCount();

    if (duplicates > 0) {
      return { flags: [`Duplicate claim detected: ${duplicates} similar claim(s) for same policy and incident date`], score: 50 };
    }
    return { flags: [], score: 0 };
  }

  // ── RULE 2: Claim filed within 7 days of policy purchase ─────────────────
  private async checkEarlyClaimAfterPurchase(claim: Claim): Promise<{ flags: string[]; score: number }> {
    const policy = await this.policyRepo.findOne({ where: { id: claim.policyId } });
    if (!policy) return { flags: [], score: 0 };

    const purchaseDate = new Date(policy.createdAt);
    const claimDate = new Date(claim.submittedAt);
    const daysDiff = Math.floor((claimDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff <= 3) {
      return { flags: [`Claim filed only ${daysDiff} day(s) after policy purchase — high suspicion`], score: 60 };
    }
    if (daysDiff <= 7) {
      return { flags: [`Claim filed ${daysDiff} days after policy purchase — early claim flag`], score: 35 };
    }
    if (daysDiff <= 14) {
      return { flags: [`Claim filed ${daysDiff} days after policy purchase — monitor`], score: 15 };
    }
    return { flags: [], score: 0 };
  }

  // ── RULE 3: Multiple claims from same user in 30 days ────────────────────
  private async checkMultipleClaimsFromUser(claim: Claim): Promise<{ flags: string[]; score: number }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentClaims = await this.claimRepo
      .createQueryBuilder('c')
      .where('c.user_id = :uid', { uid: claim.userId })
      .andWhere('c.submitted_at >= :date', { date: thirtyDaysAgo })
      .andWhere('c.id != :id', { id: claim.id })
      .getCount();

    if (recentClaims >= 3) {
      return { flags: [`User has ${recentClaims} claims in last 30 days — possible serial claimant`], score: 45 };
    }
    if (recentClaims === 2) {
      return { flags: [`User has 2 claims in last 30 days — monitor closely`], score: 20 };
    }
    return { flags: [], score: 0 };
  }

  // ── RULE 4: Claim amount exceeds policy coverage ─────────────────────────
  private async checkClaimExceedsCoverage(claim: Claim): Promise<{ flags: string[]; score: number }> {
    const policy = await this.policyRepo.findOne({ where: { id: claim.policyId } });
    if (!policy?.coverageAmount) return { flags: [], score: 0 };

    const claimAmount = Number(claim.claimAmount);
    const coverageAmount = Number(policy.coverageAmount);
    const ratio = claimAmount / coverageAmount;

    if (ratio > 1.0) {
      return { flags: [`Claim amount (₦${claimAmount.toLocaleString()}) exceeds policy coverage (₦${coverageAmount.toLocaleString()}) by ${Math.round((ratio - 1) * 100)}%`], score: 55 };
    }
    if (ratio > 0.9) {
      return { flags: [`Claim amount is ${Math.round(ratio * 100)}% of total coverage — suspiciously high`], score: 20 };
    }
    return { flags: [], score: 0 };
  }

  // ── RULE 5: Frequent claims history (lifetime) ────────────────────────────
  private async checkFrequentClaimsByUser(claim: Claim): Promise<{ flags: string[]; score: number }> {
    const totalClaims = await this.claimRepo.count({ where: { userId: claim.userId } });

    if (totalClaims >= 5) {
      return { flags: [`User has ${totalClaims} lifetime claims — high-frequency claimant`], score: 30 };
    }
    return { flags: [], score: 0 };
  }

  private getRiskLevel(score: number): FraudRiskLevel {
    if (score >= 80) return FraudRiskLevel.CRITICAL;
    if (score >= 60) return FraudRiskLevel.HIGH;
    if (score >= 30) return FraudRiskLevel.MEDIUM;
    return FraudRiskLevel.LOW;
  }

  private async saveFraudFlag(claim: Claim, flags: string[], score: number, level: FraudRiskLevel, checks: any[]) {
    await this.fraudRepo.save(this.fraudRepo.create({
      claimId: claim.id,
      policyId: claim.policyId,
      userId: claim.userId,
      reason: flags.join('; '),
      riskScore: score,
      riskLevel: level,
      ruleTriggered: flags[0] || 'Multiple rules',
      evidence: { flags, checks, claimAmount: claim.claimAmount },
    }));
    this.logger.warn(`Fraud flag: claim ${claim.id} | score ${score} | level ${level} | ${flags[0]}`);
  }

  async getFraudFlags(filters?: { resolved?: boolean; riskLevel?: string }) {
    const where: any = {};
    if (filters?.resolved !== undefined) where.resolved = filters.resolved;
    if (filters?.riskLevel) where.riskLevel = filters.riskLevel;
    return this.fraudRepo.find({ where, order: { riskScore: 'DESC', flaggedAt: 'DESC' } });
  }

  async resolveFlag(id: string, resolvedBy: string, notes: string) {
    await this.fraudRepo.update(id, { resolved: true, resolvedBy, resolutionNotes: notes });
    return { message: 'Fraud flag resolved.' };
  }

  async getFraudStats() {
    const total = await this.fraudRepo.count();
    const unresolved = await this.fraudRepo.count({ where: { resolved: false } });
    const critical = await this.fraudRepo.count({ where: { riskLevel: FraudRiskLevel.CRITICAL, resolved: false } });
    const high = await this.fraudRepo.count({ where: { riskLevel: FraudRiskLevel.HIGH, resolved: false } });
    return { total, unresolved, critical, high };
  }
}
