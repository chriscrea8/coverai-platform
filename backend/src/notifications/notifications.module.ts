// ── notifications/notification.entity.ts ─────────────────────
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'user_id' }) userId: string;
  @Column() type: string;
  @Column() title: string;
  @Column({ type: 'text' }) message: string;
  @Column({ default: 'pending' }) status: string;
  @Column({ name: 'entity_type', nullable: true }) entityType: string;
  @Column({ name: 'entity_id', nullable: true }) entityId: string;
  @Column({ type: 'jsonb', default: {} }) metadata: Record<string, any>;
  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true }) sentAt: Date;
  @Column({ name: 'read_at', type: 'timestamptz', nullable: true }) readAt: Date;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
}

// ── notifications/notifications.service.ts ───────────────────
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Notification } from './notification.entity';
import { User } from '../users/user.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter;

  constructor(
    @InjectRepository(Notification) private readonly notifRepo: Repository<Notification>,
    private readonly configService: ConfigService,
  ) {
    this.transporter = nodemailer.createTransport({
      host: configService.get('email.host'),
      port: configService.get('email.port'),
      auth: {
        user: configService.get('email.user'),
        pass: configService.get('email.pass'),
      },
    });
  }

  async sendEmail(user: User, payload: { subject: string; message: string }) {
    const notif = this.notifRepo.create({
      userId: user.id,
      type: 'email',
      title: payload.subject,
      message: payload.message,
    });
    await this.notifRepo.save(notif);

    try {
      await this.transporter.sendMail({
        from: this.configService.get('email.from'),
        to: user.email,
        subject: payload.subject,
        text: payload.message,
        html: this.buildEmailTemplate(user.name, payload.subject, payload.message),
      });
      await this.notifRepo.update(notif.id, { status: 'sent', sentAt: new Date() });
      this.logger.log(`Email sent to ${user.email}: ${payload.subject}`);
    } catch (error) {
      await this.notifRepo.update(notif.id, { status: 'failed' });
      this.logger.error(`Email failed to ${user.email}`, error.message);
    }
  }

  async getByUser(userId: string) {
    return this.notifRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 20,
    });
  }

  async markRead(notifId: string) {
    await this.notifRepo.update(notifId, { status: 'read', readAt: new Date() });
  }

  private buildEmailTemplate(name: string, subject: string, message: string) {
    return `
    <div style="font-family:sans-serif;max-width:600px;margin:auto;background:#f9f9f9;padding:32px;border-radius:12px">
      <div style="background:#0D1B3E;padding:20px 24px;border-radius:8px;margin-bottom:24px">
        <h1 style="color:#F4A623;font-size:22px;margin:0">CoverAI</h1>
      </div>
      <h2 style="color:#0A0F1E">${subject}</h2>
      <p style="color:#555;line-height:1.7">Hello ${name},</p>
      <p style="color:#555;line-height:1.7">${message}</p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
      <p style="color:#aaa;font-size:12px">CoverAI Technologies Ltd · Lagos, Nigeria<br/>
      This is an automated message. Do not reply to this email.</p>
    </div>`;
  }
}

// ── notifications/notifications.module.ts ────────────────────
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [TypeOrmModule.forFeature([Notification])],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
