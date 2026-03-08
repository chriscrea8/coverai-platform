import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../users/user.entity';
import { Policy } from '../policies/policy.entity';
import { Claim } from '../claims/claim.entity';
import { InsuranceProvider } from '../insurance-providers/insurance-provider.entity';
import { InsuranceProduct } from '../insurance-products/insurance-product.entity';
import { Payment } from '../payments/payment.entity';
import { CommissionsModule } from '../commissions/commissions.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Policy, Claim, InsuranceProvider, InsuranceProduct, Payment]),
    CommissionsModule,
    UsersModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
