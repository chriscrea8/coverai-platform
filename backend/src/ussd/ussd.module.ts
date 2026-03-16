import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UssdController } from './ussd.controller';
import { UssdService } from './ussd.service';
import { LeadsModule } from '../leads/leads.module';
import { InsuranceProduct } from '../insurance-products/insurance-product.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([InsuranceProduct]),
    LeadsModule,
  ],
  controllers: [UssdController],
  providers: [UssdService],
})
export class UssdModule {}
