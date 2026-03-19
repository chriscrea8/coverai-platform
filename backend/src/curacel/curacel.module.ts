import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CuracelService } from './curacel.service';
import { CuracelController } from './curacel.controller';
import { CuracelWebhookController } from './curacel-webhook.controller';
import { CuracelOrderService } from './curacel-order.service';
import { Policy } from '../policies/policy.entity';
import { InsuranceProduct } from '../insurance-products/insurance-product.entity';
import { InsuranceProvider } from '../insurance-providers/insurance-provider.entity';
import { User } from '../users/user.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Policy, User, InsuranceProduct, InsuranceProvider]),
    NotificationsModule,
  ],
  controllers: [CuracelController, CuracelWebhookController],
  providers: [CuracelService, CuracelOrderService],
  exports: [CuracelService, CuracelOrderService],
})
export class CuracelModule {}
