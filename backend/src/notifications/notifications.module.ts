import { Module, Injectable, Logger } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import * as nodemailer from 'nodemailer';

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

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification) private readonly notifRepo: Repository<Notification>,
    private readonly configService: ConfigService,
  ) {}

  async sendEmail(user: { id: string; name: string; email: string }, payload: { subject: string; message: string }) {
    try {
      const notif = this.notifRepo.create({ userId: user.id, type: 'email', title: payload.subject, message: payload.message });
      await this.notifRepo.save(notif);
      this.logger.log(`Notification queued for ${user.email}: ${payload.subject}`);
    } catch (e) {
      this.logger.warn('Failed to save notification: ' + e.message);
    }
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Notification])],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
