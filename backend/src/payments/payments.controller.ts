import { Controller, Post, Get, Delete, Body, Headers, Req, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './payments.dto';
import { CurrentUser } from '../common/decorators';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Initiate payment' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(userId, dto);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Paystack webhook' })
  webhook(@Headers('x-paystack-signature') sig: string, @Req() req: any) {
    return this.paymentsService.handleWebhook(sig, req.rawBody || Buffer.from(JSON.stringify(req.body)));
  }

  @Get('verify/:ref')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT')
  verify(@Param('ref') ref: string) {
    return this.paymentsService.verify(ref);
  }

  @Get('history')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT')
  getHistory(@CurrentUser('id') userId: string) {
    return this.paymentsService.getHistory(userId);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Delete a pending payment' })
  deletePending(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.paymentsService.deletePending(id, userId);
  }

  @Post(':id/retry')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Retry a pending payment — returns a fresh Paystack checkout URL' })
  retry(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.paymentsService.retry(id, userId);
  }
}
