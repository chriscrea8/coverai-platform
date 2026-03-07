// ── chat/chat-log.entity.ts ──────────────────────────────────
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('chat_logs')
export class ChatLog {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'user_id', nullable: true }) userId: string;
  @Column({ name: 'session_id' }) sessionId: string;
  @Column() role: string;
  @Column({ type: 'text' }) message: string;
  @Column({ name: 'tokens_used', nullable: true }) tokensUsed: number;
  @Column({ name: 'model_used', nullable: true }) modelUsed: string;
  @Column({ type: 'jsonb', default: {} }) metadata: Record<string, any>;
  @CreateDateColumn({ name: 'timestamp', type: 'timestamptz' }) timestamp: Date;
}
