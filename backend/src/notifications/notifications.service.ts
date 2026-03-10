import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Notification } from './notification.entity';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private resendApiKey: string | null = null;
  private fromAddress: string = 'CoverAI <onboarding@resend.dev>';

  constructor(
    @InjectRepository(Notification) private readonly notifRepo: Repository<Notification>,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    this.resendApiKey = this.configService.get<string>('RESEND_API_KEY') || null;
    const from = this.configService.get<string>('RESEND_FROM');
    if (from) this.fromAddress = from;

    if (this.resendApiKey) {
      this.logger.log(`Resend email ready. From: ${this.fromAddress}`);
    } else {
      this.logger.warn('RESEND_API_KEY not set — emails will be logged to console only');
    }
  }

  async sendEmail(
    user: { id: string; name: string; email: string },
    payload: { subject: string; message: string },
  ) {
    // Save to notifications table
    let notifId: string | null = null;
    try {
      const notif = this.notifRepo.create({
        userId: user.id,
        type: 'email',
        title: payload.subject,
        message: payload.message,
        status: 'pending',
      });
      const saved = await this.notifRepo.save(notif);
      notifId = saved.id;
    } catch (e) {
      this.logger.warn('Failed to save notification: ' + e.message);
    }

    if (this.resendApiKey) {
      // Call Resend REST API directly — no SDK, no dependencies
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: this.fromAddress,
            to: [user.email],
            subject: payload.subject,
            html: this.toHtml(user.name, payload.subject, payload.message),
            text: payload.message,
          }),
        });

        const result = await res.json() as any;

        if (!res.ok) {
          this.logger.error(`Resend API error for ${user.email}: ${JSON.stringify(result)}`);
        } else {
          if (notifId) await this.notifRepo.update(notifId, { status: 'sent' }).catch(() => {});
          this.logger.log(`Email sent via Resend to ${user.email} (id: ${result.id}): ${payload.subject}`);
        }
      } catch (e) {
        this.logger.error(`Resend fetch failed for ${user.email}: ${e.message}`);
      }
    } else {
      // Log to Railway console — OTPs visible in logs during dev
      this.logger.log(`[EMAIL] TO: ${user.email} | ${payload.subject}`);
      this.logger.log(`[EMAIL] ${payload.message}`);
      if (notifId) await this.notifRepo.update(notifId, { status: 'sent' }).catch(() => {});
    }
  }

  private toHtml(name: string, subject: string, message: string): string {
    const lines = message
      .split('\n')
      .map(l => l.trim() === ''
        ? '<br/>'
        : `<p style="margin:6px 0;color:#333;font-size:15px;line-height:1.6;">${l}</p>`)
      .join('');

    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#0A0F1E,#1A3A8F);padding:28px 36px;">
            <h1 style="margin:0;font-size:26px;color:#fff;">Cover<span style="color:#F4A623;">AI</span></h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.65);font-size:13px;">${subject}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 36px;">
            <p style="margin:0 0 20px;color:#111;font-size:16px;font-weight:600;">Hello ${name},</p>
            ${lines}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 36px 28px;border-top:1px solid #eee;">
            <p style="margin:0;color:#999;font-size:12px;">CoverAI — Insurance for African Businesses<br/>
            <a href="mailto:support@coverai.ng" style="color:#1A3A8F;">support@coverai.ng</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }
}
