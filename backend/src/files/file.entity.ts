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
