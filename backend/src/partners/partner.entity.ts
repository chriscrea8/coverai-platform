import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('partners')
export class Partner {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'company_name' }) companyName: string;
  @Column({ name: 'contact_email' }) contactEmail: string;
  @Column({ name: 'api_key', unique: true }) apiKey: string;
  @Column({ name: 'api_secret' }) apiSecret: string;
  @Column({ default: 'active' }) status: string;
  @Column({ name: 'allowed_ips', type: 'text', array: true, default: [] }) allowedIps: string[];
  @Column({ name: 'webhook_url', nullable: true }) webhookUrl: string;
  @Column({ type: 'text', array: true, default: ['create_policy', 'read_policy', 'create_claim'] }) permissions: string[];
  @Column({ name: 'request_count', default: 0 }) requestCount: number;
  @Column({ name: 'last_request_at', type: 'timestamptz', nullable: true }) lastRequestAt: Date;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}
