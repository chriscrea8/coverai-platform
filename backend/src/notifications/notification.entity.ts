import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'user_id' }) userId: string;
  @Column() type: string;
  @Column() title: string;
  @Column({ type: 'text' }) message: string;
  @Column({ default: 'pending' }) status: string;
  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true }) sentAt: Date;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
}
