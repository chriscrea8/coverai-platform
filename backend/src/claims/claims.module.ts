import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Claim } from './claim.entity';
import { ClaimsService } from './claims.service';
import { ClaimsController } from './claims.controller';
import { PoliciesModule } from '../policies/policies.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Claim]),
    PoliciesModule,
    NotificationsModule,
    UsersModule,
  ],
  controllers: [ClaimsController],
  providers: [ClaimsService],
  exports: [ClaimsService, TypeOrmModule],
})
export class ClaimsModule {}
