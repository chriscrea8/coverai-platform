import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Policy } from '../policies/policy.entity';
import { InsuranceProduct } from '../insurance-products/insurance-product.entity';
import { InsuranceProvider } from '../insurance-providers/insurance-provider.entity';
import { InsuranceVerificationController } from './insurance-verification.controller';
import { KycModule } from '../kyc/kyc.module';
import { InsuranceVerificationService } from './insurance-verification.service';

@Module({
  imports: [TypeOrmModule.forFeature([Policy, InsuranceProduct, InsuranceProvider]), KycModule],
  controllers: [InsuranceVerificationController],
  providers: [InsuranceVerificationService],
  exports: [InsuranceVerificationService],
})
export class InsuranceVerificationModule {}
