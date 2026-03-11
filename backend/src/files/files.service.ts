import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { FileRecord } from './file.entity';

interface UploadedFile {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private s3: S3Client;
  private bucket: string;

  constructor(
    @InjectRepository(FileRecord) private readonly fileRepo: Repository<FileRecord>,
    private readonly configService: ConfigService,
  ) {
    const accessKeyId = configService.get<string>('aws.accessKeyId');
    const secretAccessKey = configService.get<string>('aws.secretAccessKey');
    this.bucket = configService.get<string>('aws.s3Bucket') || 'coverai-documents';

    if (accessKeyId && secretAccessKey) {
      this.s3 = new S3Client({
        region: configService.get('aws.region') || 'us-east-1',
        credentials: { accessKeyId, secretAccessKey },
      });
    }
  }

  async upload(
    userId: string,
    file: UploadedFile,
    options?: { entityType?: string; entityId?: string; isPublic?: boolean },
  ): Promise<FileRecord> {
    const ext = file.originalname.split('.').pop();
    const fileKey = `${options?.entityType || 'uploads'}/${userId}/${uuidv4()}.${ext}`;
    let fileUrl: string;

    if (this.s3) {
      // Production: upload to S3
      await this.s3.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
        Body: file.buffer,
        ContentType: file.mimetype,
      }));
      fileUrl = options?.isPublic
        ? `https://${this.bucket}.s3.amazonaws.com/${fileKey}`
        : await this.getSignedUrl(fileKey);
    } else {
      // No S3 configured — store as base64 data URI so files are actually viewable
      const base64 = file.buffer.toString('base64');
      fileUrl = `data:${file.mimetype};base64,${base64}`;
      this.logger.warn(`No S3 configured — storing file as base64 data URI (${file.size} bytes). Set AWS env vars for production storage.`);
    }

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
    if (!this.s3) return `https://${this.bucket}.s3.amazonaws.com/${fileKey}`;
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: fileKey });
    return getSignedUrl(this.s3, command, { expiresIn });
  }

  async delete(fileId: string, userId: string) {
    const file = await this.fileRepo.findOne({ where: { id: fileId, userId } });
    if (!file) return { message: 'File not found' };
    if (this.s3) {
      await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: file.fileKey }));
    }
    await this.fileRepo.delete(fileId);
    return { message: 'File deleted' };
  }

  async getByEntity(entityType: string, entityId: string) {
    return this.fileRepo.find({ where: { entityType, entityId } });
  }
}
