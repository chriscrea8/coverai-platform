import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { IsUUID, IsNumber, IsPositive, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import axios from 'axios';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { Payment, PaymentStatus } from './payment.entity';
import { PoliciesService } from '../policies/policies.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';

export class CreatePaymentDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() policyId?: string;
  @ApiProperty() @IsNumber() @IsPositive() amount: number;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() metadata?: Record<string, any>;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment) private readonly paymentRepo: Repository<Payment>,
    private readonly configService: ConfigService,
    private readonly policiesService: PoliciesService,
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
  ) {}

  async create(userId: string, dto: CreatePaymentDto) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const reference = `COV-${uuidv4().replace(/-/g, '').substring(0, 16).toUpperCase()}`;
    const payment = this.paymentRepo.create({
      userId, policyId: dto.policyId, amount: dto.amount,
      currency: dto.currency || 'NGN', paymentReference: reference, gateway: 'paystack',
    });
    await this.paymentRepo.save(payment);

    try {
      const secretKey = this.configService.get('paystack.secretKey');
      const response = await axios.post('https://api.paystack.co/transaction/initialize', {
        email: user.email,
        amount: Math.round(Number(dto.amount) * 100),
        reference,
        currency: payment.currency,
        metadata: { payment_id: payment.id, policy_id: dto.policyId, user_id: userId },
      }, { headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' } });

      const { authorization_url, access_code } = response.data.data;
      await this.paymentRepo.update(payment.id, { gatewayReference: access_code });
      return { payment, authorizationUrl: authorization_url, accessCode: access_code, reference };
    } catch (error) {
      this.logger.warn('Paystack init: ' + (error?.response?.data?.message || error.message));
      return { payment, authorizationUrl: null, reference };
    }
  }

  async handleWebhook(signature: string, rawBody: Buffer) {
    const webhookSecret = this.configService.get('paystack.webhookSecret');
    if (webhookSecret && signature) {
      const hash = crypto.createHmac('sha512', webhookSecret).update(rawBody).digest('hex');
      if (hash !== signature) throw new BadRequestException('Invalid webhook signature');
    }
    const event = JSON.parse(rawBody.toString());
    if (event.event === 'charge.success') await this.handleSuccess(event.data);
    return { received: true };
  }

  async handleSuccess(data: any) {
    const payment = await this.paymentRepo.findOne({ where: { paymentReference: data.reference } });
    if (!payment) return;
    await this.paymentRepo.update(payment.id, {
      paymentStatus: PaymentStatus.SUCCESSFUL, paidAt: new Date(), gatewayResponse: data,
    });
    if (payment.policyId) {
      await this.policiesService.activate(payment.policyId).catch(() => {});
    }
    try {
      const user = await this.usersService.findById(payment.userId);
      if (user) await this.notificationsService.sendEmail(user, {
        subject: '✅ Payment Confirmed',
        message: `Payment of ₦${payment.amount} confirmed. Ref: ${payment.paymentReference}`,
      });
    } catch {}
  }

  async verify(reference: string) {
    try {
      const secretKey = this.configService.get('paystack.secretKey');
      const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: { Authorization: `Bearer ${secretKey}` },
      });
      if (response.data.data.status === 'success') await this.handleSuccess(response.data.data);
      return { status: response.data.data.status, reference };
    } catch {
      throw new BadRequestException('Payment verification failed');
    }
  }

  async getHistory(userId: string) {
    return this.paymentRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }
}
