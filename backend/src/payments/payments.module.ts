// ── payments/payments.dto.ts ─────────────────────────────────
import { IsUUID, IsNumber, IsPositive, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() policyId?: string;
  @ApiProperty() @IsNumber() @IsPositive() amount: number;
  @ApiPropertyOptional({ default: 'NGN' }) @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() metadata?: Record<string, any>;
}

// ── payments/payments.controller.ts ─────────────────────────
import {
  Controller, Get, Post, Body, Headers, Req,
  UseGuards, RawBodyRequest, Param,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './payments.dto';
import { CurrentUser } from '../common/decorators';
import { Request } from 'express';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Initiate a payment via Paystack' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(userId, dto);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Paystack webhook endpoint' })
  webhook(
    @Headers('x-paystack-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    return this.paymentsService.handleWebhook(signature, req.rawBody);
  }

  @Get('verify/:reference')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Verify payment status' })
  verify(@Param('reference') reference: string) {
    return this.paymentsService.verify(reference);
  }

  @Get('history')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get payment history' })
  getHistory(@CurrentUser('id') userId: string) {
    return this.paymentsService.getHistory(userId);
  }
}

// ── payments/payments.module.ts ──────────────────────────────
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './payment.entity';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PoliciesModule } from '../policies/policies.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment]),
    PoliciesModule,
    NotificationsModule,
    UsersModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
