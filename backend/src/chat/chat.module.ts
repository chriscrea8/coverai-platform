import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatLog } from './chat-log.entity';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { InsuranceProduct } from '../insurance-products/insurance-product.entity';
import { LeadsModule } from '../leads/leads.module';
import { KnowledgeBaseModule } from '../knowledge/knowledge-base.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatLog, InsuranceProduct]),
    LeadsModule,
    KnowledgeBaseModule,
  ],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
