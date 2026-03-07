import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { ChatLog } from './chat-log.entity';
import { ChatDto } from './chat.dto';

const SYSTEM_PROMPT = `You are ARIA, an AI Insurance Assistant for CoverAI — an InsurTech platform operating in Nigeria and across Africa.

Your role:
- Explain insurance products clearly in simple, jargon-free language
- Help users understand their policy terms and coverage
- Guide users through the claims process
- Recommend appropriate insurance products for SMEs and individuals
- Answer questions about Nigerian insurance regulations (NAICOM)

Important context:
- You operate in the Nigerian market, so reference naira (₦), local regulations, and African market conditions
- Common insurance types: Motor (Third Party & Comprehensive), Fire & Burglary, Marine, Health, Life, Business Owner's Policy (BOP)
- Always be helpful, friendly, and concise
- If you don't know something specific, say so and direct the user to human support
- Never provide specific legal or financial advice — always recommend consulting a professional

Always respond in English. Be conversational but professional.`;

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly openai: OpenAI;

  constructor(
    @InjectRepository(ChatLog) private readonly chatLogRepo: Repository<ChatLog>,
    private readonly configService: ConfigService,
  ) {
    this.openai = new OpenAI({
      apiKey: configService.get('openai.apiKey'),
    });
  }

  async chat(userId: string | null, dto: ChatDto) {
    const sessionId = dto.sessionId || uuidv4();
    const model = this.configService.get('openai.model', 'gpt-4-turbo-preview');

    // Fetch conversation history for context (last 10 messages)
    const history = await this.chatLogRepo.find({
      where: { sessionId },
      order: { timestamp: 'ASC' },
      take: 10,
    });

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.map(log => ({
        role: log.role as 'user' | 'assistant',
        content: log.message,
      })),
      { role: 'user', content: dto.message },
    ];

    // Save user message
    await this.chatLogRepo.save(this.chatLogRepo.create({
      userId,
      sessionId,
      role: 'user',
      message: dto.message,
      modelUsed: model,
    }));

    try {
      const completion = await this.openai.chat.completions.create({
        model,
        messages,
        max_tokens: 1000,
        temperature: 0.7,
      });

      const assistantMessage = completion.choices[0].message.content;
      const tokensUsed = completion.usage?.total_tokens;

      // Save assistant response
      await this.chatLogRepo.save(this.chatLogRepo.create({
        userId,
        sessionId,
        role: 'assistant',
        message: assistantMessage,
        tokensUsed,
        modelUsed: model,
      }));

      return {
        message: assistantMessage,
        sessionId,
        tokensUsed,
      };
    } catch (error) {
      this.logger.error('OpenAI API error', error);
      // Graceful fallback
      const fallback = this.getFallbackResponse(dto.message);
      await this.chatLogRepo.save(this.chatLogRepo.create({
        userId, sessionId, role: 'assistant', message: fallback, modelUsed: 'fallback',
      }));
      return { message: fallback, sessionId };
    }
  }

  async getHistory(userId: string, sessionId?: string) {
    const where: any = { userId };
    if (sessionId) where.sessionId = sessionId;
    return this.chatLogRepo.find({
      where,
      order: { timestamp: 'ASC' },
      take: 50,
    });
  }

  private getFallbackResponse(message: string): string {
    const m = message.toLowerCase();
    if (m.includes('claim')) return 'To file a claim, go to the Claims section in your dashboard. You\'ll need your policy number, incident details, and evidence photos.';
    if (m.includes('motor') || m.includes('car')) return 'For motor insurance in Nigeria, Third Party is the minimum legal requirement. Comprehensive cover protects your own vehicle too. Prices typically range from ₦30,000–₦150,000/year.';
    if (m.includes('business') || m.includes('sme')) return 'For SME insurance, we recommend a Business Owner\'s Policy (BOP) covering property, liability, and theft. Get a quote through our Policy Finder.';
    return 'I\'m here to help with all your insurance questions! You can ask about policy types, claims, coverage, or get a personalized recommendation.';
  }
}
