import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { Payment, PaymentStatus } from './payment.entity';
import { PoliciesService } from '../policies/policies.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { CreatePaymentDto } from './payments.dto';

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
      const frontendUrl = this.configService.get('app.frontendUrl') || 'https://coverai-platform.vercel.app';
      const callbackUrl = dto.callbackUrl || `${frontendUrl}/payment/success?reference=${reference}&policyId=${dto.policyId || ''}`;
      const response = await axios.post('https://api.paystack.co/transaction/initialize', {
        email: user.email,
        amount: Math.round(Number(dto.amount) * 100),
        reference,
        currency: payment.currency,
        callback_url: callbackUrl,
        metadata: {
          payment_id: payment.id,
          policy_id: dto.policyId,
          user_id: userId,
          cancel_action: `${frontendUrl}/dashboard`,
        },
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
      // activate() handles both first-time activation AND advancing installment dates
      await this.policiesService.activate(payment.policyId, payment.id).catch(() => {});
    }
    try {
      const user = await this.usersService.findById(payment.userId);
      if (user) {
        // Fetch policy details for certificate
        let policyDetails: any = null;
        if (payment.policyId) {
          try { policyDetails = await this.policiesService.findOne(payment.policyId, payment.userId); } catch {}
        }

        const certHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; background: #fff;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #0A0F1E, #1A3A8F); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="color: #F4A623; margin: 0; font-size: 28px;">CoverAI</h1>
              <p style="color: rgba(255,255,255,0.7); margin: 5px 0 0; font-size: 14px;">Insurance Platform — Policy Certificate</p>
            </div>
            <!-- Success Banner -->
            <div style="background: #E8F5E9; padding: 16px; text-align: center; border-left: 4px solid #2EC97E;">
              <h2 style="color: #1B5E20; margin: 0; font-size: 20px;">✅ Payment Successful — You're Covered!</h2>
            </div>
            <!-- Details -->
            <div style="padding: 28px; background: #f9f9f9;">
              <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.1);">
                <tr style="background: #F4A623;">
                  <td colspan="2" style="padding: 12px 16px; font-weight: bold; color: #0A0F1E; font-size: 15px;">📋 Policy Certificate</td>
                </tr>
                ${policyDetails ? `
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 12px 16px; color: #666; width: 40%;">Policy Number</td>
                  <td style="padding: 12px 16px; font-weight: bold; color: #1A3A8F;">${policyDetails.policyNumber || 'Processing...'}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 12px 16px; color: #666;">Policy Status</td>
                  <td style="padding: 12px 16px;"><span style="background: #E8F5E9; color: #2EC97E; padding: 3px 10px; border-radius: 20px; font-weight: bold; font-size: 13px;">${policyDetails.policyStatus?.toUpperCase() || 'ACTIVE'}</span></td>
                </tr>
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 12px 16px; color: #666;">Coverage Period</td>
                  <td style="padding: 12px 16px;">${policyDetails.startDate ? new Date(policyDetails.startDate).toLocaleDateString('en-NG') : 'N/A'} — ${policyDetails.endDate ? new Date(policyDetails.endDate).toLocaleDateString('en-NG') : 'N/A'}</td>
                </tr>
                ` : ''}
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 12px 16px; color: #666;">Policy Holder</td>
                  <td style="padding: 12px 16px; font-weight: bold;">${user.name}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 12px 16px; color: #666;">Email</td>
                  <td style="padding: 12px 16px;">${user.email}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 12px 16px; color: #666;">Amount Paid</td>
                  <td style="padding: 12px 16px; font-weight: bold; color: #F4A623; font-size: 16px;">₦${Number(payment.amount).toLocaleString()}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 12px 16px; color: #666;">Payment Reference</td>
                  <td style="padding: 12px 16px; font-family: monospace; font-size: 13px;">${payment.paymentReference}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; color: #666;">Payment Date</td>
                  <td style="padding: 12px 16px;">${new Date().toLocaleString('en-NG')}</td>
                </tr>
              </table>

              <div style="margin-top: 20px; padding: 16px; background: #FFF9E6; border-left: 4px solid #F4A623; border-radius: 4px;">
                <strong>📌 Important:</strong> Keep this email as proof of your insurance coverage. You can view your full policy details anytime on your CoverAI dashboard.
              </div>

              <div style="margin-top: 20px; text-align: center;">
                <a href="${this.configService.get('app.frontendUrl') || 'https://coverai-platform.vercel.app'}/dashboard" style="background: #F4A623; color: #0A0F1E; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">View My Dashboard →</a>
              </div>
            </div>
            <!-- Footer -->
            <div style="padding: 16px; text-align: center; background: #0A0F1E; border-radius: 0 0 12px 12px;">
              <p style="color: rgba(255,255,255,0.5); font-size: 12px; margin: 0;">CoverAI Insurance Platform | Nigeria's AI-Powered InsurTech | Regulated by NAICOM</p>
            </div>
          </div>
        `;

        await this.notificationsService.sendEmail(user, {
          subject: `✅ Policy Certificate — ₦${Number(payment.amount).toLocaleString()} Payment Confirmed`,
          message: certHtml,
          entityType: 'payment',
          entityId: payment.id,
        });
      }
    } catch (e) {
      this.logger.warn('Certificate email failed: ' + e?.message);
    }
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

  async deletePending(paymentId: string, userId: string) {
    const payment = await this.paymentRepo.findOne({ where: { id: paymentId, userId } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.paymentStatus !== PaymentStatus.PENDING) {
      throw new BadRequestException('Only pending payments can be deleted');
    }
    await this.paymentRepo.delete(paymentId);
    return { message: 'Payment deleted', id: paymentId };
  }

  async retry(paymentId: string, userId: string) {
    const payment = await this.paymentRepo.findOne({ where: { id: paymentId, userId } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.paymentStatus !== PaymentStatus.PENDING) {
      throw new BadRequestException('Only pending payments can be retried');
    }
    // Create a fresh Paystack session for the same policy + amount
    return this.create(userId, {
      policyId: payment.policyId,
      amount: Number(payment.amount),
      currency: payment.currency || 'NGN',
    });
  }
}
