import { Controller, Post, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SmeService } from './sme.service';
import { CreateSmeDto } from './sme.dto';
import { CurrentUser } from '../common/decorators';

@ApiTags('SME')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth('JWT')
@Controller('sme')
export class SmeController {
  constructor(private readonly smeService: SmeService) {}

  @Post('create') @ApiOperation({ summary: 'Create SME profile' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateSmeDto) {
    return this.smeService.create(userId, dto);
  }

  @Get('profile') @ApiOperation({ summary: 'Get SME profile' })
  getProfile(@CurrentUser('id') userId: string) {
    return this.smeService.getProfile(userId);
  }

  @Patch('profile') @ApiOperation({ summary: 'Update SME profile' })
  update(@CurrentUser('id') userId: string, @Body() dto: CreateSmeDto) {
    return this.smeService.updateProfile(userId, dto);
  }
}
