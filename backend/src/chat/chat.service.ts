import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { ChatLog } from './chat-log.entity';
import { ChatDto } from './chat.dto';
import { InsuranceProduct } from '../insurance-products/insurance-product.entity';
import { LeadsService } from '../leads/leads.service';
import { KnowledgeBaseService } from '../knowledge/knowledge-base.service';

// ── Language detection ──────────────────────────────────────────────────────
function detectLanguage(message: string): string {
  const m = message.toLowerCase();
  // Pidgin patterns
  if (/\b(wetin|abeg|na|dey|abi|sha|oga|madam|wahala|oyibo|sef|shey|don|wey|comot|chop)\b/.test(m)) return 'pidgin';
  // Yoruba patterns
  if (/\b(ẹ|ọ|bawo|jọwọ|pẹlẹ|ẹ jọ|iranlọwọ|bẹẹni|rara|insurance ni)\b/.test(m)) return 'yoruba';
  // Igbo patterns
  if (/\b(biko|gịnị|ọ dị|maka|ọ bụ|ka m|nke a|ozuzu)\b/.test(m)) return 'igbo';
  // Hausa patterns
  if (/\b(yaya|don allah|na gode|ina|ku|taimaka|zaka|haka)\b/.test(m)) return 'hausa';
  return 'english';
}

function getLanguageInstruction(language: string): string {
  switch (language) {
    case 'pidgin':
      return `

## LANGUAGE: Respond in Nigerian Pidgin English. Use natural pidgin expressions like "e be like say", "no worry", "na so e be", "e go better". Keep it friendly and easy to understand. Mix in English for technical terms.`;
    case 'yoruba':
      return `

## LANGUAGE: The user may prefer Yoruba. Respond primarily in English but include Yoruba greetings and phrases where natural (e.g., "E kaaro", "E kaasan", "E kaale"). Keep insurance terms in English.`;
    case 'igbo':
      return `

## LANGUAGE: The user may prefer Igbo. Respond primarily in English but include Igbo greetings where natural (e.g., "Nnọọ", "Daalu"). Keep insurance terms in English.`;
    case 'hausa':
      return `

## LANGUAGE: The user may prefer Hausa. Respond primarily in English but include Hausa greetings where natural (e.g., "Sannu", "Na gode"). Keep insurance terms in English.`;
    default:
      return '';
  }
}

const INTENT_PATTERNS = {
  purchase: /\b(buy|purchase|get covered|start a policy|sign up|enrol|take out|i want|interested in|how do i get)\b/i,
  claim: /\b(claim|file a claim|submit claim|how to claim|report accident|report loss)\b/i,
  compare: /\b(compare|comparison|vs|versus|difference between|which is better|options|alternatives)\b/i,
  eligibility: /\b(eligible|qualify|can i get|do i qualify|requirements|criteria|conditions)\b/i,
  pricing: /\b(cost|price|how much|premium|afford|cheap|expensive|rate)\b/i,
  education: /\b(what is|explain|meaning of|define|tell me about|how does|understand)\b/i,
};

function detectIntent(message: string): string[] {
  return Object.entries(INTENT_PATTERNS)
    .filter(([, pattern]) => pattern.test(message))
    .map(([intent]) => intent);
}

const sessionContext = new Map<string, Record<string, any>>();

function getContext(sessionId: string): Record<string, any> {
  return sessionContext.get(sessionId) || {};
}

function updateContext(sessionId: string, updates: Record<string, any>) {
  const existing = sessionContext.get(sessionId) || {};
  sessionContext.set(sessionId, { ...existing, ...updates, updatedAt: new Date() });
}

function extractContextFromMessage(message: string): Record<string, any> {
  const ctx: Record<string, any> = {};
  const m = message.toLowerCase();
  if (/\b(shop|store|market stall|retail|supermarket)\b/.test(m)) ctx.businessType = 'retail';
  if (/\b(restaurant|eatery|food|canteen|kitchen)\b/.test(m)) ctx.businessType = 'restaurant';
  if (/\b(transport|logistics|haulage|truck)\b/.test(m)) ctx.businessType = 'transport';
  if (/\b(tech|software|it company|startup)\b/.test(m)) ctx.businessType = 'tech';
  const ageMatch = m.match(/\b(\d{1,2})\s*years?\s*old\b/);
  if (ageMatch) ctx.age = parseInt(ageMatch[1]);
  if (/\b(i have a car|i drive|my vehicle|my car)\b/.test(m)) ctx.hasVehicle = true;
  if (/\b(i run|i own|my business|my company|my shop)\b/.test(m)) ctx.hasBusiness = true;
  if (/\b(staff|employees|workers|team)\b/.test(m)) ctx.hasEmployees = true;
  const locationMatch = m.match(/\b(lagos|abuja|port.?harcourt|ph|kano|ibadan|enugu|aba|benin)\b/);
  if (locationMatch) ctx.location = locationMatch[1];
  if (/\b(motor|car|vehicle|auto)\b/.test(m)) ctx.interestedIn = 'motor';
  if (/\b(health|medical|hospital)\b/.test(m)) ctx.interestedIn = 'health';
  if (/\b(life|death|burial)\b/.test(m)) ctx.interestedIn = 'life';
  if (/\b(fire|burglary|property)\b/.test(m)) ctx.interestedIn = 'property';
  if (/\b(business|sme|company|enterprise)\b/.test(m)) ctx.interestedIn = 'business';
  // Capture name patterns like "my name is X" or "I am X"
  const nameMatch = message.match(/(?:my name is|i am|i'm|call me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
  if (nameMatch) ctx.name = nameMatch[1];
  // Phone number capture
  const phoneMatch = message.match(/(?:\+?234|0)?[789][01]\d{8}/);
  if (phoneMatch) ctx.phone = phoneMatch[0];
  return ctx;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly openai: OpenAI;

  constructor(
    @InjectRepository(ChatLog) private readonly chatLogRepo: Repository<ChatLog>,
    @InjectRepository(InsuranceProduct) private readonly productRepo: Repository<InsuranceProduct>,
    private readonly configService: ConfigService,
    private readonly leadsService: LeadsService,
    private readonly knowledgeBaseService: KnowledgeBaseService,
  ) {
    this.openai = new OpenAI({ apiKey: configService.get('openai.apiKey') });
  }

  private async getRelevantProducts(message: string, context: Record<string, any>): Promise<InsuranceProduct[]> {
    try {
      const m = message.toLowerCase();
      const where: any = { status: 'active' };
      if (/\b(motor|car|vehicle|third.?party|comprehensive)\b/.test(m)) where.category = 'motor';
      else if (/\b(health|medical|hospital|hmo)\b/.test(m)) where.category = 'health';
      else if (/\b(life|death|life insurance)\b/.test(m)) where.category = 'life';
      else if (/\b(fire|burglary|property|shop)\b/.test(m)) where.category = 'property';
      else if (/\b(business|sme|bop|liability)\b/.test(m) || context.interestedIn === 'business') where.isSmeProduct = true;
      else if (context.interestedIn) where.category = context.interestedIn;
      return await this.productRepo.find({ where, take: 5, order: { createdAt: 'DESC' } });
    } catch { return []; }
  }

  private formatProductsForPrompt(products: InsuranceProduct[]): string {
    if (!products.length) return '';
    return `\n\n## AVAILABLE PRODUCTS FROM OUR DATABASE:\n` +
      products.map(p => `**${p.productName}** | ₦${p.premiumMin?.toLocaleString() || '?'}–₦${p.premiumMax?.toLocaleString() || '?'}/yr | ${p.description}`).join('\n');
  }

  private buildSystemPrompt(context: Record<string, any>, products: InsuranceProduct[], intents: string[], kbContext = '', language = 'english'): string {
    const contextStr = Object.keys(context).filter(k => k !== 'updatedAt').length
      ? `\n\n## USER CONTEXT (remember this throughout the conversation):\n${JSON.stringify(context, null, 2)}`
      : '';
    const productsStr = this.formatProductsForPrompt(products);
    let intentGuidance = '';
    if (intents.includes('purchase')) {
      intentGuidance = `\n\n## ACTION: User shows PURCHASE INTENT. After your explanation, say: "To get you connected with the right insurer, could you share your name and phone number? 📞"`;
    } else if (intents.includes('compare')) {
      intentGuidance = `\n\n## ACTION: User wants COMPARISON. Show products in a clear format: Name | Coverage | Price | Best For`;
    } else if (intents.includes('eligibility')) {
      intentGuidance = `\n\n## ACTION: User wants ELIGIBILITY CHECK. Ask one question at a time: insurance type → location → age → car ownership → business ownership`;
    }
    return `You are ARIA, an AI Insurance Assistant for CoverAI — built for Nigeria and Africa.

YOUR STYLE:
- Friendly, warm, like a knowledgeable friend
- Simple Nigerian English — no jargon
- Short sentences, practical examples
- Reference naira (₦), NAICOM, FRSC where relevant
- Use ✅ ❌ 🚗 🛡️ 💰 emojis naturally

INSTEAD OF: "Comprehensive motor insurance provides coverage for..."
SAY: "This cover protects your car if it's stolen, damaged in an accident, or catches fire 🚗"

Keep responses under 200 words unless comparing. Use bullet points.

HANDLE THESE QUESTIONS WELL:
- "What can you do?" / "What do you do?" → List your capabilities clearly: explain insurance, recommend products, compare options, check eligibility, guide claims, connect with insurers
- "Hi" / "Hello" → Greet warmly and briefly explain you're ARIA, AI insurance guide, ask what they need help with
- "Who are you?" → You are ARIA, AI Insurance Assistant for CoverAI, built for Nigeria
- Any greeting → Be warm and immediately ask how you can help with their insurance needs${contextStr}${productsStr}${intentGuidance}

LEAD CAPTURE: If a user gives you their name + phone number, warmly acknowledge and say: "Perfect! I've noted your details. A specialist will reach out within 24 hours to help you get the best deal 🎉"

Never make up prices — only use ranges from the product database above.${kbContext}${getLanguageInstruction(language)}`;
  }

  async chat(userId: string | null, dto: ChatDto & { source?: string; userPhone?: string; userName?: string }) {
    const sessionId = dto.sessionId || uuidv4();
    const model = 'gpt-4o-mini'; // hardcoded - env var was unreliable

    const newContext = extractContextFromMessage(dto.message);
    updateContext(sessionId, { ...newContext, ...(userId ? { userId } : {}), ...(dto.userPhone ? { phone: dto.userPhone } : {}), ...(dto.userName ? { name: dto.userName } : {}) });
    const context = getContext(sessionId);
    const intents = detectIntent(dto.message);
    const products = await this.getRelevantProducts(dto.message, context);
    const kbItems = await this.knowledgeBaseService.search(dto.message, 4);
    const kbContext = this.knowledgeBaseService.formatForPrompt(kbItems);
    const language = detectLanguage(dto.message);
    const systemPrompt = this.buildSystemPrompt(context, products, intents, kbContext, language);

    const history = await this.chatLogRepo.find({ where: { sessionId }, order: { timestamp: 'ASC' }, take: 20 });

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...history.map(log => ({ role: log.role as 'user' | 'assistant', content: log.message })),
      { role: 'user', content: dto.message },
    ];

    await this.chatLogRepo.save(this.chatLogRepo.create({
      userId, sessionId, role: 'user', message: dto.message, modelUsed: model,
      metadata: { intents, contextSnapshot: context },
    }));

    let assistantMessage = '';
    let tokensUsed: number | undefined;

    try {
      const completion = await this.openai.chat.completions.create({ model, messages, max_tokens: 800, temperature: 0.7 });
      assistantMessage = completion.choices[0].message.content || '';
      tokensUsed = completion.usage?.total_tokens;
      // If OpenAI returns empty for any reason, use intelligent fallback
      if (!assistantMessage.trim()) {
        assistantMessage = this.getFallbackResponse(dto.message);
      }
    } catch (error) {
      this.logger.error('OpenAI API error', error);
      assistantMessage = this.getFallbackResponse(dto.message);
    }

    await this.chatLogRepo.save(this.chatLogRepo.create({
      userId, sessionId, role: 'assistant', message: assistantMessage, tokensUsed, modelUsed: model,
      metadata: { intents, productsShown: products.map(p => p.id) },
    }));

    // Auto-create lead on purchase intent
    let leadCreated = false;
    if (intents.includes('purchase')) {
      try {
        await this.leadsService.create({
          userId: userId || undefined,
          name: context.name,
          phone: context.phone || dto.userPhone,
          location: context.location,
          insuranceType: context.interestedIn || 'general',
          notes: `Chat purchase intent. Message: "${dto.message.substring(0, 200)}"`,
          metadata: context,
          source: (dto as any).source || 'web',
          sessionId,
        });
        leadCreated = true;
      } catch (e) { this.logger.warn('Lead creation failed', e); }
    }

    // Only capture lead when user explicitly types their own phone number in the message
    // (not from WhatsApp sender metadata which is always present)
    const phoneInMessage = extractContextFromMessage(dto.message).phone;
    if (phoneInMessage && !leadCreated) {
      try {
        await this.leadsService.create({
          userId: userId || undefined,
          name: context.name,
          phone: phoneInMessage,
          location: context.location,
          insuranceType: context.interestedIn || 'general',
          notes: `Phone number shared in chat. Session: ${sessionId}`,
          metadata: context,
          source: (dto as any).source || 'web',
          sessionId,
        });
        leadCreated = true;
      } catch (e) { this.logger.warn('Lead creation failed', e); }
    }

    return {
      message: assistantMessage,
      sessionId,
      tokensUsed,
      intents,
      leadCreated,
      suggestedProducts: products.slice(0, 3).map(p => ({
        id: p.id,
        name: p.productName,
        category: p.category,
        premiumMin: p.premiumMin,
        premiumMax: p.premiumMax,
      })),
    };
  }

  async checkEligibility(answers: { insuranceType: string; location: string; age?: number; hasCar?: boolean; hasBusiness?: boolean }) {
    const where: any = { status: 'active' };
    if (answers.insuranceType === 'motor') where.category = 'motor';
    else if (answers.insuranceType === 'health') where.category = 'health';
    else if (answers.insuranceType === 'business') where.isSmeProduct = true;
    else if (answers.insuranceType === 'property') where.category = 'property';
    const products = await this.productRepo.find({ where, take: 10 });
    const eligible = products.filter(p => {
      const rules = p.eligibilityRules || {};
      if (rules.minAge && answers.age && answers.age < rules.minAge) return false;
      if (rules.maxAge && answers.age && answers.age > rules.maxAge) return false;
      if (rules.requiresCar && !answers.hasCar) return false;
      if (rules.requiresBusiness && !answers.hasBusiness) return false;
      return true;
    });
    return {
      eligible: eligible.length > 0,
      products: eligible.map(p => ({ id: p.id, name: p.productName, category: p.category, premiumMin: p.premiumMin, premiumMax: p.premiumMax, description: p.description })),
      message: eligible.length > 0 ? `Great news! You qualify for ${eligible.length} product${eligible.length > 1 ? 's' : ''}.` : 'We\'ll find the right product for you — let our team help!',
    };
  }

  async compareProducts(category: string, limit = 5) {
    const products = await this.productRepo.find({ where: { status: 'active', category }, take: limit, order: { premiumMin: 'ASC' } });
    return products.map(p => ({ id: p.id, name: p.productName, category: p.category, premiumMin: p.premiumMin, premiumMax: p.premiumMax, description: p.description, coverageDetails: p.coverageDetails, isSmeProduct: p.isSmeProduct, tags: p.tags }));
  }

  async handleWhatsApp(from: string, message: string, sessionId: string) {
    const response = await this.chat(null, { message, sessionId, source: 'whatsapp', userPhone: from } as any);
    const plainText = response.message.replace(/\*\*(.*?)\*\*/g, '*$1*').replace(/#{1,3}\s/g, '').replace(/`/g, '');
    return { text: plainText, sessionId: response.sessionId, leadCreated: response.leadCreated };
  }

  async getHistory(userId: string, sessionId?: string) {
    const where: any = { userId };
    if (sessionId) where.sessionId = sessionId;
    return this.chatLogRepo.find({ where, order: { timestamp: 'ASC' }, take: 100 });
  }

  private getFallbackResponse(message: string): string {
    const m = message.toLowerCase();
    if (m.includes('what can you do') || m.includes('what do you do') || m.includes('help') || m.includes('capabilities')) {
      return 'Here\'s what I can help you with 🛡️:\n\n✅ *Explain insurance* in plain language\n✅ *Recommend products* for your business or personal needs\n✅ *Compare options* — motor, health, life, property\n✅ *Check eligibility* for different insurance types\n✅ *Guide you through claims* step by step\n✅ *Connect you with insurers* for the best rates\n\nWhat would you like to start with? Just ask!';
    }
    if (m.includes('claim')) return 'To file a claim: Dashboard → Claims → New Claim. You\'ll need photos and your policy number. Our team reviews in 5–7 working days. 📋';
    if (m.includes('motor') || m.includes('car')) return 'For motor insurance 🚗:\n\n✅ *Third Party* — legal minimum, covers damage to others (₦5k–₦15k/yr)\n✅ *Comprehensive* — covers your car too (2–5% of car value/yr)\n\nWant to compare options?';
    if (m.includes('business') || m.includes('sme')) return 'For your business 🏪:\n\n1. Fire & Burglary — protects stock\n2. Public Liability — covers customer injuries\n3. Business Interruption — covers lost income\n\nWant the best rates for your business type?';
    if (m.includes('health') || m.includes('medical')) return 'Health insurance covers your medical bills so you don\'t pay out of pocket 🏥\n\nOptions in Nigeria:\n- *HMO plans* — monthly premium, access to hospital network\n- *Individual health cover* — pay per treatment up to a limit\n\nCosts from ₦30,000/year. Want me to find the best plan for you?';
    if (m.includes('life')) return 'Life insurance pays your family a lump sum if you die 🛡️\n\nA simple rule: get *10x your annual income* as cover.\n\nIf you earn ₦2m/year → aim for ₦20m cover.\n\nTerm life starts from ₦30,000/year. Want to know more?';
    return 'I\'m ARIA, your AI insurance guide for Nigeria 🇳🇬\n\nI can help you:\n- Find the right insurance for your needs\n- Explain any policy in plain language\n- Guide you through filing a claim\n- Connect you with the best insurers\n\nWhat would you like to know?';
  }
}
