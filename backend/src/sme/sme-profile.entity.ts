import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('sme_profiles')
export class SmeProfile {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'owner_id' }) ownerId: string;
  @Column({ name: 'business_name' }) businessName: string;
  @Column() industry: string;
  @Column() location: string;
  @Column({ nullable: true }) state: string;
  @Column({ name: 'registration_number', unique: true, nullable: true }) registrationNumber: string;
  @Column({ name: 'business_size', nullable: true }) businessSize: string;
  @Column({ name: 'employee_count', nullable: true }) employeeCount: number;
  @Column({ type: 'text', nullable: true }) description: string;
  @Column({ name: 'is_verified', default: false }) isVerified: boolean;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}
