import { Controller, Post, Get, Body, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { KycService } from './kyc.service';

@ApiTags('KYC & Identity Verification')
@Controller('users/verify-identity')
@UseGuards(AuthGuard('jwt'))
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get my verification status (phone, NIN, BVN)' })
  getStatus(@Req() req: any) {
    return this.kycService.getVerificationStatus(req.user.id);
  }

  @Post('phone/send-otp')
  @ApiOperation({ summary: 'Send OTP to phone for verification' })
  sendPhoneOtp(@Req() req: any, @Body() body: { phone: string }) {
    if (!body.phone) throw new Error('Phone number is required');
    return this.kycService.sendPhoneOtp(req.user.id, body.phone);
  }

  @Post('phone/verify-otp')
  @ApiOperation({ summary: 'Verify phone OTP' })
  verifyPhoneOtp(@Req() req: any, @Body() body: { otp: string }) {
    return this.kycService.verifyPhoneOtp(req.user.id, body.otp);
  }

  @Post('nin')
  @ApiOperation({ summary: 'Verify National Identification Number (NIN)' })
  verifyNIN(@Req() req: any, @Body() body: { nin: string }) {
    return this.kycService.verifyNIN(req.user.id, body.nin);
  }

  @Post('bvn')
  @ApiOperation({ summary: 'Verify Bank Verification Number (BVN)' })
  verifyBVN(@Req() req: any, @Body() body: { bvn: string }) {
    return this.kycService.verifyBVN(req.user.id, body.bvn);
  }
}
