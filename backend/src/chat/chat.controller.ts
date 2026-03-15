import { Controller, Post, Get, Body, Req, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ChatService } from './chat.service';
import { ChatDto } from './chat.dto';

@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @ApiOperation({ summary: 'Send message to ARIA AI assistant (RAG-powered, context-aware)' })
  chat(@Body() dto: ChatDto, @Req() req: any) {
    const userId = req.user?.id || null;
    return this.chatService.chat(userId, dto);
  }

  @Get('history')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get chat history' })
  getHistory(@Req() req: any, @Query('sessionId') sessionId?: string) {
    return this.chatService.getHistory(req.user.id, sessionId);
  }

  @Post('eligibility')
  @ApiOperation({ summary: 'Check insurance eligibility' })
  checkEligibility(@Body() body: {
    insuranceType: string;
    location: string;
    age?: number;
    hasCar?: boolean;
    hasBusiness?: boolean;
  }) {
    return this.chatService.checkEligibility(body);
  }

  @Get('compare')
  @ApiOperation({ summary: 'Compare insurance products by category' })
  compare(@Query('category') category: string, @Query('limit') limit?: string) {
    return this.chatService.compareProducts(category, limit ? parseInt(limit) : 5);
  }
}
