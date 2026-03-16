import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('knowledge_base')
export class KnowledgeBase {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column() category: string; // faq | policy | claims | regulation | product_type
  @Column() subcategory: string; // motor | health | life | property | sme | general

  @Column() question: string;
  @Column({ type: 'text' }) answer: string;

  @Column({ type: 'text', array: true, default: [] }) keywords: string[];
  @Column({ type: 'text', nullable: true }) source: string; // NAICOM | internal | provider

  @Column({ default: true }) isActive: boolean;
  @Column({ default: 0 }) useCount: number; // track what users ask most

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}
