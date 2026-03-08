import {
  Controller, Post, Get, Param, Delete,
  UseGuards, UseInterceptors, UploadedFile, UploadedFiles, Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FilesService } from './files.service';
import { CurrentUser } from '../common/decorators';

@ApiTags('Files')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth('JWT')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a file' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  upload(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: any,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
  ) {
    return this.filesService.upload(userId, file, { entityType, entityId });
  }

  @Post('upload-multiple')
  @ApiOperation({ summary: 'Upload multiple files (max 5)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files', 5, { limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadMultiple(
    @CurrentUser('id') userId: string,
    @UploadedFiles() files: any[],
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
  ) {
    return Promise.all(files.map(f => this.filesService.upload(userId, f, { entityType, entityId })));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a file' })
  delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.filesService.delete(id, userId);
  }
}
