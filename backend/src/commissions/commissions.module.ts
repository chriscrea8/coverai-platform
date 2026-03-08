import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Commission } from './commission.entity';
import { CommissionsService } from './commissions.service';

@Module({
  imports: [TypeOrmModule.forFeature([Commission])],
  providers: [CommissionsService],
  exports: [CommissionsService],
})
export class CommissionsModule {}
