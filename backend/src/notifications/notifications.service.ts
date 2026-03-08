import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './notification.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification) private readonly notifRepo: Repository<Notification>,
  ) {}

  async sendEmail(
    user: { id: string; name: string; email: string },
    payload: { subject: string; message: string },
  ) {
    try {
      const notif = this.notifRepo.create({
        userId: user.id,
        type: 'email',
        title: payload.subject,
        message: payload.message,
      });
      await this.notifRepo.save(notif);
      this.logger.log(`Notification queued for ${user.email}: ${payload.subject}`);
    } catch (e) {
      this.logger.warn('Failed to save notification: ' + e.message);
    }
  }
}
