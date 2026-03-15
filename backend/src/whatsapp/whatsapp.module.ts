import { Module } from '@nestjs/common';
import { WhatsAppController } from './whatsapp.controller';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [ChatModule],
  controllers: [WhatsAppController],
})
export class WhatsAppModule {}
