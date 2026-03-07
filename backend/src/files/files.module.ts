// ── files/file.entity.ts ─────────────────────────────────────
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('files')
export class FileRecord {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'user_id' }) userId: string;
  @Column({ name: 'entity_type', nullable: true }) entityType: string;
  @Column({ name: 'entity_id', nullable: true }) entityId: string;
  @Column({ name: 'file_key' }) fileKey: string;
  @Column({ name: 'file_url' }) fileUrl: string;
  @Column({ name: 'original_name' }) originalName: string;
  @Column({ name: 'file_type' }) fileType: string;
  @Column({ name: 'file_size', type: 'bigint', nullable: true }) fileSize: number;
  @Column({ name: 'is_public', default: false }) isPublic: boolean;
  @CreateDateColumn({ name: 'uploaded_at', type: 'timestamptz' }) uploadedAt: Date;
}

// ── files/files.service.ts ───────────────────────────────────
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { FileRecord } from './file.entity';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(
    @InjectRepository(FileRecord) private readonly fileRepo: Repository<FileRecord>,
    private readonly configService: ConfigService,
  ) {
    this.s3 = new S3Client({
      region: configService.get('aws.region'),
      credentials: {
        accessKeyId: configService.get('aws.accessKeyId'),
        secretAccessKey: configService.get('aws.secretAccessKey'),
      },
    });
    this.bucket = configService.get('aws.s3Bucket');
  }

  async upload(
    userId: string,
    file: Express.Multer.File,
    options?: { entityType?: string; entityId?: string; isPublic?: boolean },
  ): Promise<FileRecord> {
    const ext = file.originalname.split('.').pop();
    const fileKey = `${options?.entityType || 'uploads'}/${userId}/${uuidv4()}.${ext}`;

    await this.s3.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: options?.isPublic ? 'public-read' : 'private',
    }));

    const fileUrl = options?.isPublic
      ? `https://${this.bucket}.s3.amazonaws.com/${fileKey}`
      : await this.getSignedUrl(fileKey);

    const record = this.fileRepo.create({
      userId,
      entityType: options?.entityType,
      entityId: options?.entityId,
      fileKey,
      fileUrl,
      originalName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
      isPublic: options?.isPublic || false,
    });

    await this.fileRepo.save(record);
    this.logger.log(`File uploaded: ${fileKey}`);
    return record;
  }

  async getSignedUrl(fileKey: string, expiresIn = 3600): Promise<string> {
    const command = new PutObjectCommand({ Bucket: this.bucket, Key: fileKey });
    return getSignedUrl(this.s3, command, { expiresIn });
  }

  async delete(fileId: string, userId: string) {
    const file = await this.fileRepo.findOne({ where: { id: fileId, userId } });
    if (!file) return;
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: file.fileKey }));
    await this.fileRepo.delete(fileId);
  }

  async getByEntity(entityType: string, entityId: string) {
    return this.fileRepo.find({ where: { entityType, entityId } });
  }
}

// ── files/files.controller.ts ────────────────────────────────
import {
  Controller, Post, Get, Param, UseGuards, UseInterceptors,
  UploadedFile, UploadedFiles, Query, Delete,
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
  @ApiOperation({ summary: 'Upload a single file to S3' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  upload(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
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
    @UploadedFiles() files: Express.Multer.File[],
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

// ── files/files.module.ts ────────────────────────────────────
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';

@Module({
  imports: [TypeOrmModule.forFeature([FileRecord])],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
