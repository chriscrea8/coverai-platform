import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'user_id' }) userId: string;
  @Column() type: string;          // 'email' | 'in_app'
  @Column() title: string;
  @Column({ type: 'text' }) message: string;
  @Column({ default: 'pending' }) status: string; // 'pending' | 'sent' | 'read'
  @Column({ name: 'entity_type', nullable: true }) entityType: string; // 'policy' | 'claim' | 'payment'
  @Column({ name: 'entity_id', nullable: true }) entityId: string;
  @Column({ type: 'jsonb', default: {} }) metadata: Record<string, any>;
  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true }) sentAt: Date;
  @Column({ name: 'read_at', type: 'timestamptz', nullable: true }) readAt: Date;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
}
