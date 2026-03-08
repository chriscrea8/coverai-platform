import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SmeProfile } from './sme-profile.entity';
import { SmeService } from './sme.service';
import { SmeController } from './sme.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SmeProfile])],
  controllers: [SmeController],
  providers: [SmeService],
  exports: [SmeService],
})
export class SmeModule {}
