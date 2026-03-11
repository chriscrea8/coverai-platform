import { Module } from '@nestjs/common';
import { AutoMigrationService } from './auto-migration.service';

@Module({
  providers: [AutoMigrationService],
  exports: [AutoMigrationService],
})
export class DatabaseModule {}
