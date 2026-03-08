import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InsuranceProduct } from './insurance-product.entity';
import { InsuranceProductsController } from './insurance-products.controller';

@Module({
  imports: [TypeOrmModule.forFeature([InsuranceProduct])],
  controllers: [InsuranceProductsController],
  exports: [TypeOrmModule],
})
export class InsuranceProductsModule {}
