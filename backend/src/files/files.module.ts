import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileRecord } from './file.entity';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';

@Module({
  imports: [TypeOrmModule.forFeature([FileRecord])],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
