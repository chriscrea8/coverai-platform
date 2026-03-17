import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Policy } from '../policies/policy.entity';
import { User } from '../users/user.entity';
import { RenewalService } from './renewal.service';
import { RenewalController } from './renewal.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([Policy, User]), NotificationsModule],
  controllers: [RenewalController],
  providers: [RenewalService],
  exports: [RenewalService],
})
export class RenewalModule {}
