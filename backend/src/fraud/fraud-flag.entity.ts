// ── fraud-flag.entity.ts ──────────────────────────────────────────────────
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum FraudRiskLevel { LOW = 'low', MEDIUM = 'medium', HIGH = 'high', CRITICAL = 'critical' }

@Entity('fraud_flags')
export class FraudFlag {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'claim_id', nullable: true }) claimId: string;
  @Column({ name: 'policy_id', nullable: true }) policyId: string;
  @Column({ name: 'user_id' }) userId: string;
  @Column({ type: 'text' }) reason: string;
  @Column({ name: 'risk_score', type: 'int' }) riskScore: number; // 0-100
  @Column({ type: 'enum', enum: FraudRiskLevel, default: FraudRiskLevel.LOW }) riskLevel: FraudRiskLevel;
  @Column({ name: 'rule_triggered' }) ruleTriggered: string;
  @Column({ type: 'jsonb', nullable: true }) evidence: Record<string, any>;
  @Column({ default: false }) resolved: boolean;
  @Column({ name: 'resolved_by', nullable: true }) resolvedBy: string;
  @Column({ name: 'resolution_notes', nullable: true }) resolutionNotes: string;
  @Column({ name: 'flagged_at', type: 'timestamptz', default: () => 'NOW()' }) flaggedAt: Date;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
}
