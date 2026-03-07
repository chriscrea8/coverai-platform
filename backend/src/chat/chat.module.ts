// ── chat/chat.dto.ts ─────────────────────────────────────────
import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChatDto {
  @ApiProperty({ example: 'What insurance does my restaurant need?' })
  @IsString() message: string;

  @ApiPropertyOptional({ description: 'Continue existing session' })
  @IsOptional() @IsString() sessionId?: string;
}

// ── chat/chat.controller.ts ──────────────────────────────────
import { Controller, Post, Get, Body, Query, UseGuards, Req, Optional } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { ChatDto } from './chat.dto';
import { CurrentUser } from '../common/decorators';

@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @ApiOperation({ summary: 'Send message to AI Insurance Assistant (ARIA)' })
  chat(
    @Body() dto: ChatDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id || null;
    return this.chatService.chat(userId, dto);
  }

  @Get('history')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get chat history' })
  getHistory(
    @CurrentUser('id') userId: string,
    @Query('sessionId') sessionId?: string,
  ) {
    return this.chatService.getHistory(userId, sessionId);
  }
}

// ── chat/chat.module.ts ──────────────────────────────────────
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatLog } from './chat-log.entity';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ChatLog])],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
