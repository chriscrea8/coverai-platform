import { Controller, Post, Get, Body, Query, Headers, Logger, HttpCode, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { ChatService } from '../chat/chat.service';
import { v4 as uuidv4 } from 'uuid';

// ── WhatsApp Cloud API (Meta) message types ───────────────────────────────────
interface WhatsAppMessage {
  from: string;
  id: string;
  type: string;
  text?: { body: string };
  interactive?: {
    type: string;
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string };
  };
}

interface WhatsAppWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: { phone_number_id: string };
        messages?: WhatsAppMessage[];
        statuses?: any[];
      };
    }>;
  }>;
}

// In-memory session map: phone → sessionId
const phoneSessions = new Map<string, string>();

function getOrCreateSession(phone: string): string {
  if (!phoneSessions.has(phone)) {
    phoneSessions.set(phone, uuidv4());
  }
  return phoneSessions.get(phone)!;
}

@ApiTags('WhatsApp')
@Controller('whatsapp')
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);
  private readonly waToken: string;
  private readonly waPhoneId: string;
  private readonly verifyToken: string;

  constructor(
    private readonly chatService: ChatService,
    private readonly configService: ConfigService,
  ) {
    this.waToken = configService.get('WHATSAPP_TOKEN') || '';
    this.waPhoneId = configService.get('WHATSAPP_PHONE_ID') || '';
    this.verifyToken = configService.get('WHATSAPP_VERIFY_TOKEN') || 'coverai-verify-token';
  }

  // ── Webhook verification (GET) ─────────────────────────────────────────────
  @Get('webhook')
  @ApiOperation({ summary: 'WhatsApp webhook verification' })
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    if (mode === 'subscribe' && token === this.verifyToken) {
      this.logger.log('WhatsApp webhook verified ✅');
      res.status(200).send(challenge); // Meta expects raw challenge string back
      return;
    }
    res.status(403).json({ status: 'forbidden' });
  }

  // ── Incoming message handler (POST) ───────────────────────────────────────
  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Receive WhatsApp messages' })
  async receive(@Body() payload: WhatsAppWebhookPayload) {
    try {
      const entry = payload?.entry?.[0];
      const change = entry?.changes?.[0];
      const messages = change?.value?.messages;

      if (!messages?.length) return { status: 'ok' }; // status update, not a message

      for (const msg of messages) {
        const from = msg.from; // sender's WhatsApp number
        let messageText = '';

        if (msg.type === 'text' && msg.text?.body) {
          messageText = msg.text.body;
        } else if (msg.type === 'interactive') {
          messageText = msg.interactive?.button_reply?.title
            || msg.interactive?.list_reply?.title
            || '';
        } else {
          // Unsupported type — send a helpful message
          await this.sendWhatsApp(from, "Hi! I'm ARIA 🛡️ I can only read text messages right now. Type your insurance question and I'll help you!");
          continue;
        }

        if (!messageText.trim()) continue;

        this.logger.log(`WhatsApp from ${from}: "${messageText.substring(0, 80)}"`);

        // Get or create session for this phone number
        const sessionId = getOrCreateSession(from);

        // Process via ARIA
        const response = await this.chatService.handleWhatsApp(from, messageText, sessionId);

        // Send reply back via WhatsApp Cloud API
        await this.sendWhatsApp(from, response.text);

        // If a lead was created, send a follow-up
        if (response.leadCreated) {
          await this.sendWhatsApp(from,
            "✅ I've noted your interest! A CoverAI specialist will contact you within 24 hours to help you get the best insurance deal. 🎉"
          );
        }
      }

      return { status: 'ok' };
    } catch (error) {
      this.logger.error('WhatsApp webhook error', error);
      return { status: 'ok' }; // Always return 200 to WhatsApp
    }
  }

  // ── Send message via WhatsApp Cloud API ───────────────────────────────────
  private async sendWhatsApp(to: string, text: string) {
    if (!this.waToken || !this.waPhoneId) {
      this.logger.warn('WhatsApp not configured — WHATSAPP_TOKEN or WHATSAPP_PHONE_ID missing');
      return;
    }

    try {
      const res = await fetch(
        `https://graph.facebook.com/v18.0/${this.waPhoneId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.waToken}`,
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to,
            type: 'text',
            text: { body: text.substring(0, 4096) }, // WA max length
          }),
        }
      );

      if (!res.ok) {
        const err = await res.text();
        this.logger.error(`WhatsApp send failed: ${res.status} ${err}`);
      } else {
        this.logger.log(`WhatsApp sent to ${to} ✅`);
      }
    } catch (error) {
      this.logger.error('WhatsApp send error', error);
    }
  }
}
