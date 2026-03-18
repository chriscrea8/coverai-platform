import { Module } from '@nestjs/common';
import { CuracelService } from './curacel.service';
import { CuracelController } from './curacel.controller';

@Module({
  controllers: [CuracelController],
  providers: [CuracelService],
  exports: [CuracelService],
})
export class CuracelModule {}
