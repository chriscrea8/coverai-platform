import { Module } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { NotificationsService } from './notifications.service';

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

@Module({
  imports: [TypeOrmModule.forFeature([Notification])],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
