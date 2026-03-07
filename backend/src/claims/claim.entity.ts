// ── claims/claim.entity.ts ───────────────────────────────────
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum ClaimStatus {
  SUBMITTED = 'submitted', UNDER_REVIEW = 'under_review',
  APPROVED = 'approved', REJECTED = 'rejected', PAID = 'paid',
}

@Entity('claims')
export class Claim {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'claim_number', unique: true }) claimNumber: string;
  @Column({ name: 'policy_id' }) policyId: string;
  @Column({ name: 'user_id' }) userId: string;
  @Column({ name: 'claim_amount', type: 'decimal', precision: 12, scale: 2 }) claimAmount: number;
  @Column({ name: 'approved_amount', type: 'decimal', precision: 12, scale: 2, nullable: true }) approvedAmount: number;
  @Column({ type: 'text' }) description: string;
  @Column({ name: 'incident_date', type: 'date' }) incidentDate: Date;
  @Column({ name: 'incident_location', nullable: true }) incidentLocation: string;
  @Column({ type: 'enum', enum: ClaimStatus, default: ClaimStatus.SUBMITTED }) status: ClaimStatus;
  @Column({ name: 'evidence_files', type: 'text', array: true, default: [] }) evidenceFiles: string[];
  @Column({ name: 'provider_claim_id', nullable: true }) providerClaimId: string;
  @Column({ name: 'reviewer_id', nullable: true }) reviewerId: string;
  @Column({ name: 'reviewer_notes', nullable: true }) reviewerNotes: string;
  @Column({ name: 'rejection_reason', nullable: true }) rejectionReason: string;
  @Column({ name: 'submitted_at', type: 'timestamptz', default: () => 'NOW()' }) submittedAt: Date;
  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true }) reviewedAt: Date;
  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true }) resolvedAt: Date;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}
