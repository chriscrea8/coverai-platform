import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('leads')
export class Lead {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ name: 'user_id', nullable: true }) userId: string;

  // User contact info (captured even for anonymous users)
  @Column({ nullable: true }) name: string;
  @Column({ nullable: true }) phone: string;
  @Column({ nullable: true }) email: string;
  @Column({ nullable: true }) location: string;

  // Insurance interest
  @Column({ name: 'insurance_type' }) insuranceType: string;
  @Column({ name: 'product_id', nullable: true }) productId: string;
  @Column({ name: 'provider_id', nullable: true }) providerId: string;

  // Lead context
  @Column({ type: 'text', nullable: true }) notes: string;
  @Column({ type: 'jsonb', default: {} }) metadata: Record<string, any>; // eligibility answers, session context

  // Source tracking
  @Column({ default: 'web' }) source: string; // web | whatsapp | ussd
  @Column({ name: 'session_id', nullable: true }) sessionId: string;

  // Status lifecycle
  @Column({ default: 'new' }) status: string; // new | contacted | converted | lost

  // Routing
  @Column({ name: 'routed_to', nullable: true }) routedTo: string; // provider or broker name
  @Column({ name: 'routed_at', nullable: true, type: 'timestamptz' }) routedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}
