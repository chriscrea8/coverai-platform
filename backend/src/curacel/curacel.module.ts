import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CuracelService } from './curacel.service';
import { CuracelController } from './curacel.controller';
import { CuracelWebhookController } from './curacel-webhook.controller';
import { CuracelOrderService } from './curacel-order.service';
import { Policy } from '../policies/policy.entity';
import { User } from '../users/user.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Policy, User]),
    NotificationsModule,
  ],
  controllers: [CuracelController, CuracelWebhookController],
  providers: [CuracelService, CuracelOrderService],
  exports: [CuracelService, CuracelOrderService],
})
export class CuracelModule {}
