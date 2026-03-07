import { Module, Injectable, Logger, Controller, Post, Get, Body, Req, Query, Optional } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { v4 as uuidv4 } from 'uuid';
import { ChatLog } from './chat-log.entity';
import OpenAI from 'openai';

export class ChatDto {
  @ApiProperty() @IsString() message: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sessionId?: string;
}

const SYSTEM_PROMPT = `You are ARIA, an AI Insurance Assistant for CoverAI, an InsurTech platform operating in Nigeria and Africa.
Help users understand insurance products, policy terms, coverage options, and guide them through claims.
Reference Nigerian market context: naira (₦), NAICOM regulations, common products like Motor (Third Party & Comprehensive), Fire & Burglary, Marine, Health, Life, Business Owner Policy.
Be friendly, clear, and jargon-free. Always respond in English.`;

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private openai: OpenAI;

  constructor(
    @InjectRepository(ChatLog) private readonly chatLogRepo: Repository<ChatLog>,
    private readonly configService: ConfigService,
  ) {
    const apiKey = configService.get('openai.apiKey');
    if (apiKey) this.openai = new OpenAI({ apiKey });
  }

  async chat(userId: string | null, dto: ChatDto) {
    const sessionId = dto.sessionId || uuidv4();
    const model = this.configService.get('openai.model') || 'gpt-4-turbo-preview';

    const history = await this.chatLogRepo.find({ where: { sessionId }, order: { timestamp: 'ASC' }, take: 10 });

    await this.chatLogRepo.save(this.chatLogRepo.create({ userId, sessionId, role: 'user', message: dto.message }));

    if (!this.openai) {
      const fallback = this.getFallback(dto.message);
      await this.chatLogRepo.save(this.chatLogRepo.create({ userId, sessionId, role: 'assistant', message: fallback, modelUsed: 'fallback' }));
      return { message: fallback, sessionId };
    }

    try {
      const messages: any[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history.map(l => ({ role: l.role, content: l.message })),
        { role: 'user', content: dto.message },
      ];
      const completion = await this.openai.chat.completions.create({ model, messages, max_tokens: 1000, temperature: 0.7 });
      const reply = completion.choices[0].message.content;
      await this.chatLogRepo.save(this.chatLogRepo.create({ userId, sessionId, role: 'assistant', message: reply, tokensUsed: completion.usage?.total_tokens, modelUsed: model }));
      return { message: reply, sessionId };
    } catch (e) {
      this.logger.error('OpenAI error: ' + e.message);
      const fallback = this.getFallback(dto.message);
      await this.chatLogRepo.save(this.chatLogRepo.create({ userId, sessionId, role: 'assistant', message: fallback, modelUsed: 'fallback' }));
      return { message: fallback, sessionId };
    }
  }

  async getHistory(userId: string, sessionId?: string) {
    const where: any = { userId };
    if (sessionId) where.sessionId = sessionId;
    return this.chatLogRepo.find({ where, order: { timestamp: 'ASC' }, take: 50 });
  }

  private getFallback(msg: string): string {
    const m = msg.toLowerCase();
    if (m.includes('claim')) return "To file a claim, go to the Claims section in your dashboard. You'll need your policy number, incident details, and photos as evidence.";
    if (m.includes('motor') || m.includes('car')) return "For motor insurance in Nigeria, Third Party is the minimum legal requirement (₦15,000–₦50,000/year). Comprehensive cover protects your own vehicle too (₦30,000–₦150,000/year).";
    if (m.includes('business') || m.includes('sme') || m.includes('shop')) return "For SME insurance, we recommend a Business Owner's Policy (BOP) covering property, liability, and theft. Prices start from ₦15,000/year. Use our Policy Finder to get a match!";
    if (m.includes('theft') || m.includes('burglary')) return "Commercial Burglary Insurance covers theft of goods, cash, and equipment. You can also add Fidelity Guarantee for employee theft protection.";
    return "I'm ARIA, your AI Insurance Assistant! Ask me about policy types, how to file claims, coverage options, or get a recommendation for your business. 🤖";
  }
}

@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post() @ApiOperation({ summary: 'Chat with ARIA - AI Insurance Assistant' })
  chat(@Body() dto: ChatDto, @Req() req: any) {
    const userId = req.user?.id || null;
    return this.chatService.chat(userId, dto);
  }

  @Get('history') @ApiOperation({ summary: 'Get chat history' })
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
