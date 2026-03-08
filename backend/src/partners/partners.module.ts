import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Partner } from './partner.entity';
import { PartnersService } from './partners.service';
import { PartnersController } from './partners.controller';
import { PoliciesModule } from '../policies/policies.module';
import { ClaimsModule } from '../claims/claims.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Partner]),
    PoliciesModule,
    ClaimsModule,
  ],
  controllers: [PartnersController],
  providers: [PartnersService],
  exports: [PartnersService],
})
export class PartnersModule {}
