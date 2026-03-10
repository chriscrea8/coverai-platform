import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import { Notification } from './notification.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(
    @InjectRepository(Notification) private readonly notifRepo: Repository<Notification>,
    private readonly configService: ConfigService,
  ) {
    this.initTransporter();
  }

  private initTransporter() {
    const host = this.configService.get<string>('email.host');
    const user = this.configService.get<string>('email.user');
    const pass = this.configService.get<string>('email.pass');

    if (!host || !user || !pass) {
      this.logger.warn('SMTP not configured — emails will be logged only. Set SMTP_HOST, SMTP_USER, SMTP_PASS env vars.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port: this.configService.get<number>('email.port') || 587,
      secure: false,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
    });

    this.logger.log(`Email transporter ready via ${host}`);
  }

  async sendEmail(
    user: { id: string; name: string; email: string },
    payload: { subject: string; message: string },
  ) {
    // Always save to notifications table
    try {
      const notif = this.notifRepo.create({
        userId: user.id,
        type: 'email',
        title: payload.subject,
        message: payload.message,
        status: 'pending',
      });
      await this.notifRepo.save(notif);

      // Attempt real email delivery if SMTP is configured
      if (this.transporter) {
        const from = this.configService.get<string>('email.from') || 'CoverAI <noreply@coverai.ng>';
        await this.transporter.sendMail({
          from,
          to: user.email,
          subject: payload.subject,
          text: payload.message,
          html: this.toHtml(user.name, payload.subject, payload.message),
        });
        await this.notifRepo.update(notif.id, { status: 'sent' });
        this.logger.log(`Email sent to ${user.email}: ${payload.subject}`);
      } else {
        // Log the email content so it's visible in Railway logs during dev
        this.logger.log(`[EMAIL LOG] To: ${user.email} | Subject: ${payload.subject}`);
        this.logger.log(`[EMAIL LOG] Body:\n${payload.message}`);
        await this.notifRepo.update(notif.id, { status: 'sent' });
      }
    } catch (e) {
      this.logger.error(`Failed to send email to ${user.email}: ${e.message}`);
    }
  }

  private toHtml(name: string, subject: string, message: string): string {
    const lines = message.split('\n').map(l =>
      l.trim() === '' ? '<br/>' : `<p style="margin:4px 0;color:#333;font-size:14px;">${l}</p>`
    ).join('');

    return `
    <!DOCTYPE html>
    <html>
    <body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:20px;">
      <div style="max-width:580px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1);">
        <div style="background:linear-gradient(135deg,#1A3A8F,#0A0F1E);padding:24px 32px;">
          <h1 style="color:#fff;font-size:22px;margin:0;">Cover<span style="color:#F4A623;">AI</span></h1>
          <p style="color:rgba(255,255,255,.7);font-size:13px;margin:4px 0 0;">${subject}</p>
        </div>
        <div style="padding:28px 32px;">
          <p style="color:#111;font-size:15px;margin:0 0 16px;">Hello ${name},</p>
          ${lines}
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;"/>
          <p style="color:#999;font-size:12px;margin:0;">CoverAI — Insurance for African Businesses<br/>
          Questions? <a href="mailto:support@coverai.ng" style="color:#1A3A8F;">support@coverai.ng</a></p>
        </div>
      </div>
    </body>
    </html>`;
  }
}
