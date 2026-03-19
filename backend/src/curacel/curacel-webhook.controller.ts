import {
  Controller, Post, Get, Body, Headers, Param, Query,
  RawBodyRequest, Req, HttpCode, HttpStatus, Logger,
  BadRequestException, UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import * as crypto from 'crypto';
import { CuracelService } from './curacel.service';
import { CuracelOrderService } from './curacel-order.service';
import { ConfigService } from '@nestjs/config';

@ApiTags('Curacel Webhooks & Orders')
@Controller('curacel')
export class CuracelWebhookController {
  private readonly logger = new Logger(CuracelWebhookController.name);

  constructor(
    private readonly curacelService: CuracelService,
    private readonly orderService: CuracelOrderService,
    private readonly configService: ConfigService,
  ) {}

  // ── WEBHOOK RECEIVER ────────────────────────────────────────────────────────
  // Add this URL in your Curacel dashboard: 
  // https://coverai-platform-production.up.railway.app/api/v1/curacel/webhook
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Curacel webhook receiver — DO NOT CALL MANUALLY' })
  async handleWebhook(
    @Req() req: Request,
    @Body() payload: any,
    @Headers('x-curacel-signature') signature?: string,
    @Headers('x-signature') sigAlt?: string,
  ) {
    const sig = signature || sigAlt;
    const secret = this.configService.get<string>('CURACEL_WEBHOOK_SECRET');

    // Verify signature if secret is configured
    if (secret && sig) {
      const rawBody = JSON.stringify(payload);
      const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
      const sigClean = sig.replace('sha256=', '');
      if (!crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(sigClean.padEnd(expected.length, '0').slice(0, expected.length), 'hex'))) {
        this.logger.warn('Curacel webhook signature mismatch — rejecting');
        throw new BadRequestException('Invalid webhook signature');
      }
    } else if (secret && !sig) {
      this.logger.warn('Curacel webhook received without signature header');
      // Don't reject in sandbox mode — Curacel sandbox may not send signatures
    }

    this.logger.log(`Curacel webhook received: event=${payload?.event || payload?.type || 'unknown'}`);
    this.logger.log(`Webhook payload: ${JSON.stringify(payload).slice(0, 500)}`);

    await this.orderService.handleWebhookEvent(payload);

    return { received: true, timestamp: new Date().toISOString() };
  }

  // ── CUSTOMER MANAGEMENT ────────────────────────────────────────────────────
  @Post('customers')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Create or sync a customer with Curacel' })
  createCustomer(@Body() dto: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    date_of_birth?: string;
    sex?: string;
    address?: string;
    state?: string;
    country?: string;
  }) {
    return this.curacelService.createCustomer(dto);
  }

  // ── ORDER PURCHASE (full end-to-end) ─────────────────────────────────────
  @Post('orders')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Purchase insurance via Curacel — creates customer, order, and internal policy' })
  createOrder(@Req() req: any, @Body() dto: {
    product_code: string;
    policy_start_date: string;
    payment_type?: 'wallet' | 'web_link' | 'card';
    asset_value?: number;
    asset_ref?: string;
    premium_frequency?: string;
    // Motor-specific
    vehicle_value?: number;
    registration_number?: string;
    vehicle_make?: string;
    vehicle_model?: string;
    vehicle_year?: string;
    vehicle_color?: string;
    vehicle_class?: string;
    // Health-specific
    preferred_hospital_location?: string;
    beneficiaries?: any[];
    // Extra metadata
    metadata?: Record<string, any>;
  }) {
    return this.orderService.createOrder(req.user.id, dto);
  }

  // ── ORDER STATUS ─────────────────────────────────────────────────────────
  @Get('orders/:orderId')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get a Curacel order status' })
  getOrder(@Param('orderId') orderId: string) {
    return this.orderService.getOrder(orderId);
  }

  // ── POLICY DOCUMENT ──────────────────────────────────────────────────────
  @Get('policies/:policyId/document')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get Curacel policy document URL' })
  getPolicyDocument(@Param('policyId') policyId: string) {
    return this.curacelService.getPolicyDocument(policyId);
  }

  // ── SYNC POLICIES (pull from Curacel to our DB) ──────────────────────────
  @Post('sync-policies')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Sync all Curacel policies into our database' })
  syncPolicies() {
    return this.orderService.syncPoliciesFromCuracel();
  }

  // ── SYNC CATALOGUE (products + providers → internal DB → Admin visible) ──
  @Post('sync-catalogue')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Import all Curacel products + insurers into admin Products & Providers tabs' })
  syncCatalogue() {
    return this.orderService.syncCatalogueToInternalDB();
  }
}
