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
  @ApiOperation({ summary: 'Get my KYC verification status' })
  getStatus(@Req() req: any) {
    return this.kycService.getVerificationStatus(req.user.id);
  }

  @Post('phone/send-otp')
  @ApiOperation({ summary: 'Send OTP to phone for verification' })
  sendPhoneOtp(@Req() req: any, @Body() body: { phone: string }) {
    return this.kycService.sendPhoneOtp(req.user.id, body.phone);
  }

  @Post('phone/verify-otp')
  @ApiOperation({ summary: 'Verify phone OTP' })
  verifyPhoneOtp(@Req() req: any, @Body() body: { otp: string }) {
    return this.kycService.verifyPhoneOtp(req.user.id, body.otp);
  }

  @Post('nin')
  @ApiOperation({ summary: 'Verify NIN via VerifyMe Nigeria' })
  verifyNIN(@Req() req: any, @Body() body: { nin: string; dob?: string; firstname?: string; lastname?: string }) {
    return this.kycService.verifyNIN(req.user.id, body.nin, body.dob, body.firstname, body.lastname);
  }

  @Post('bvn')
  @ApiOperation({ summary: 'Verify BVN via VerifyMe Nigeria' })
  verifyBVN(@Req() req: any, @Body() body: { bvn: string; dob?: string; firstname?: string; lastname?: string }) {
    return this.kycService.verifyBVN(req.user.id, body.bvn, body.dob, body.firstname, body.lastname);
  }

  @Post('drivers-licence')
  @ApiOperation({ summary: 'Verify Driver\'s Licence via VerifyMe Nigeria' })
  verifyDriversLicence(@Req() req: any, @Body() body: { licenceNumber: string; dob?: string }) {
    return this.kycService.verifyDriversLicence(req.user.id, body.licenceNumber, body.dob);
  }
}
