import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('insurance_providers')
export class InsuranceProvider {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() name: string;
  @Column({ unique: true }) slug: string;
  @Column({ name: 'api_base_url', nullable: true }) apiBaseUrl: string;
  @Column({ name: 'contact_email' }) contactEmail: string;
  @Column({ name: 'logo_url', nullable: true }) logoUrl: string;
  @Column({ type: 'text', nullable: true }) description: string;
  @Column({ name: 'naicom_license', nullable: true }) naicomLicense: string;
  @Column({ default: 'pending_review' }) status: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}

@Module({
  imports: [TypeOrmModule.forFeature([InsuranceProvider])],
  exports: [TypeOrmModule],
})
export class InsuranceProvidersModule {}
