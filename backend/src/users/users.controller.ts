import { Controller, Get, Patch, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto, ChangePasswordDto, SubmitKycDto } from './users.dto';
import { CurrentUser } from '../common/decorators';

@ApiTags('Users')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth('JWT')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile') @ApiOperation({ summary: 'Get profile' })
  getProfile(@CurrentUser('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Patch('profile') @ApiOperation({ summary: 'Update profile' })
  updateProfile(@CurrentUser('id') userId: string, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Post('change-password') @ApiOperation({ summary: 'Change password' })
  changePassword(@CurrentUser('id') userId: string, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(userId, dto);
  }

  @Post('kyc') @ApiOperation({ summary: 'Submit KYC verification' })
  submitKyc(@CurrentUser('id') userId: string, @Body() dto: SubmitKycDto) {
    return this.usersService.submitKyc(userId, dto);
  }
}
