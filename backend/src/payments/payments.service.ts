import {
  Injectable, Logger, BadRequestException, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { Payment, PaymentStatus } from './payment.entity';
import { CreatePaymentDto } from './payments.dto';
import { PoliciesService } from '../policies/policies.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly paystack: AxiosInstance;

  constructor(
    @InjectRepository(Payment) private readonly paymentRepo: Repository<Payment>,
    private readonly configService: ConfigService,
    private readonly policiesService: PoliciesService,
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
  ) {
    this.paystack = axios.create({
      baseURL: this.configService.get('paystack.baseUrl'),
      headers: {
        Authorization: `Bearer ${this.configService.get('paystack.secretKey')}`,
        'Content-Type': 'application/json',
      },
    });
  }

  // ── INITIATE PAYMENT ───────────────────────────────────────
  async create(userId: string, dto: CreatePaymentDto) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const reference = `COV-${uuidv4().replace(/-/g, '').substring(0, 16).toUpperCase()}`;

    const payment = this.paymentRepo.create({
      userId,
      policyId: dto.policyId,
      amount: dto.amount,
      currency: dto.currency || 'NGN',
      paymentReference: reference,
      gateway: 'paystack',
      metadata: dto.metadata || {},
    });
    await this.paymentRepo.save(payment);

    // Initialize with Paystack
    try {
      const response = await this.paystack.post('/transaction/initialize', {
        email: user.email,
        amount: Math.round(dto.amount * 100), // Paystack expects kobo
        reference,
        currency: payment.currency,
        callback_url: `${this.configService.get('app.frontendUrl')}/payments/verify`,
        metadata: {
          payment_id: payment.id,
          policy_id: dto.policyId,
          user_id: userId,
          custom_fields: [
            { display_name: 'Payment For', value: 'Insurance Policy Premium' },
          ],
        },
      });

      const { authorization_url, access_code } = response.data.data;
      await this.paymentRepo.update(payment.id, {
        gatewayReference: access_code,
      });

      return {
        payment,
        authorizationUrl: authorization_url,
        accessCode: access_code,
        reference,
      };
    } catch (error) {
      this.logger.error('Paystack initialization failed', error?.response?.data);
      throw new BadRequestException('Payment initialization failed');
    }
  }

  // ── WEBHOOK HANDLER ────────────────────────────────────────
  async handleWebhook(signature: string, rawBody: Buffer) {
    // Verify webhook signature
    const webhookSecret = this.configService.get('paystack.webhookSecret');
    const hash = crypto
      .createHmac('sha512', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (hash !== signature) {
      this.logger.warn('Invalid Paystack webhook signature');
      throw new BadRequestException('Invalid signature');
    }

    const event = JSON.parse(rawBody.toString());
    this.logger.log(`Paystack webhook: ${event.event}`);

    if (event.event === 'charge.success') {
      await this.handleSuccessfulPayment(event.data);
    } else if (event.event === 'charge.failed') {
      await this.handleFailedPayment(event.data);
    }

    return { received: true };
  }

  private async handleSuccessfulPayment(data: any) {
    const payment = await this.paymentRepo.findOne({
      where: { paymentReference: data.reference },
    });
    if (!payment) return;

    await this.paymentRepo.update(payment.id, {
      paymentStatus: PaymentStatus.SUCCESSFUL,
      gatewayResponse: data,
      paidAt: new Date(),
    });

    // Activate policy
    if (payment.policyId) {
      await this.policiesService.activate(payment.policyId, payment.id);
    }

    // Notify user
    const user = await this.usersService.findById(payment.userId);
    if (user) {
      await this.notificationsService.sendEmail(user, {
        subject: '✅ Payment Confirmed',
        message: `Payment of ₦${payment.amount.toLocaleString()} confirmed. Ref: ${payment.paymentReference}`,
      }).catch(() => {});
    }

    this.logger.log(`Payment successful: ${payment.paymentReference}`);
  }

  private async handleFailedPayment(data: any) {
    await this.paymentRepo.update(
      { paymentReference: data.reference },
      { paymentStatus: PaymentStatus.FAILED, gatewayResponse: data },
    );
    this.logger.warn(`Payment failed: ${data.reference}`);
  }

  // ── VERIFY ─────────────────────────────────────────────────
  async verify(reference: string) {
    try {
      const response = await this.paystack.get(`/transaction/verify/${reference}`);
      const data = response.data.data;

      if (data.status === 'success') {
        await this.handleSuccessfulPayment(data);
      }
      return { status: data.status, reference };
    } catch (error) {
      throw new BadRequestException('Payment verification failed');
    }
  }

  async getHistory(userId: string) {
    return this.paymentRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }
}
