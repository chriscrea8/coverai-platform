import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InsuranceProvider } from './insurance-provider.entity';

@Module({
  imports: [TypeOrmModule.forFeature([InsuranceProvider])],
  exports: [TypeOrmModule],
})
export class InsuranceProvidersModule {}
