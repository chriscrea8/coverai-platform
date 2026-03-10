import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Notification } from './notification.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private resend: any = null;

  constructor(
    @InjectRepository(Notification) private readonly notifRepo: Repository<Notification>,
    private readonly configService: ConfigService,
  ) {
    this.initResend();
  }

  private async initResend() {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY not set — emails will be logged only. Add it in Railway env vars.');
      return;
    }
    try {
      const { Resend } = await import('resend');
      this.resend = new Resend(apiKey);
      this.logger.log('Resend email client ready');
    } catch (e) {
      this.logger.error('Failed to init Resend: ' + e.message);
    }
  }

  async sendEmail(
    user: { id: string; name: string; email: string },
    payload: { subject: string; message: string },
  ) {
    // Always save to notifications table first
    let notif: any;
    try {
      notif = this.notifRepo.create({
        userId: user.id,
        type: 'email',
        title: payload.subject,
        message: payload.message,
        status: 'pending',
      });
      await this.notifRepo.save(notif);
    } catch (e) {
      this.logger.warn('Failed to save notification record: ' + e.message);
    }

    // Send via Resend if configured
    if (this.resend) {
      try {
        const fromDomain = this.configService.get<string>('RESEND_FROM') || 'CoverAI <onboarding@resend.dev>';
        const { error } = await this.resend.emails.send({
          from: fromDomain,
          to: [user.email],
          subject: payload.subject,
          html: this.toHtml(user.name, payload.subject, payload.message),
          text: payload.message,
        });

        if (error) {
          this.logger.error(`Resend error for ${user.email}: ${JSON.stringify(error)}`);
        } else {
          if (notif) await this.notifRepo.update(notif.id, { status: 'sent' });
          this.logger.log(`Email sent via Resend to ${user.email}: ${payload.subject}`);
        }
      } catch (e) {
        this.logger.error(`Resend send failed for ${user.email}: ${e.message}`);
      }
    } else {
      // Fallback: log to Railway console so OTPs are visible during dev
      this.logger.log(`[EMAIL LOG] ──────────────────────────────────`);
      this.logger.log(`[EMAIL LOG] TO:      ${user.email}`);
      this.logger.log(`[EMAIL LOG] SUBJECT: ${payload.subject}`);
      this.logger.log(`[EMAIL LOG] BODY:\n${payload.message}`);
      this.logger.log(`[EMAIL LOG] ──────────────────────────────────`);
      if (notif) await this.notifRepo.update(notif.id, { status: 'sent' }).catch(() => {});
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
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0A0F1E 0%,#1A3A8F 100%);padding:28px 36px;">
            <h1 style="margin:0;font-size:26px;color:#fff;letter-spacing:-0.5px;">
              Cover<span style="color:#F4A623;">AI</span>
            </h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.65);font-size:13px;">${subject}</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px 36px;">
            <p style="margin:0 0 20px;color:#111;font-size:16px;font-weight:600;">Hello ${name},</p>
            ${lines}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 36px 28px;border-top:1px solid #eee;">
            <p style="margin:0;color:#999;font-size:12px;line-height:1.6;">
              CoverAI — Insurance for African Businesses<br/>
              Questions? <a href="mailto:support@coverai.ng" style="color:#1A3A8F;text-decoration:none;">support@coverai.ng</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }
}
