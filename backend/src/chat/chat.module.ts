import { Module, Controller, Post, Get, Body, Req, Query, UseGuards } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ChatLog } from './chat-log.entity';
import { ChatService } from './chat.service';
import { ChatDto } from './chat.dto';

@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @ApiOperation({ summary: 'Send message to ARIA AI assistant' })
  chat(@Body() dto: ChatDto, @Req() req: any) {
    const userId = req.user?.id || null;
    return this.chatService.chat(userId, dto);
  }

  @Get('history')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get chat history' })
  getHistory(@Req() req: any, @Query('sessionId') sessionId?: string) {
    const userId = req.user?.id;
    if (!userId) return [];
    return this.chatService.getHistory(userId, sessionId);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([ChatLog])],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
