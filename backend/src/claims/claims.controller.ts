import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClaimsService, CreateClaimDto } from './claims.service';
import { CurrentUser } from '../common/decorators';

@ApiTags('Claims')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth('JWT')
@Controller('claims')
export class ClaimsController {
  constructor(private readonly claimsService: ClaimsService) {}

  @Post() @ApiOperation({ summary: 'Submit a claim' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateClaimDto) {
    return this.claimsService.create(userId, dto);
  }

  @Get() @ApiOperation({ summary: 'Get my claims' })
  findAll(@CurrentUser('id') userId: string) {
    return this.claimsService.findByUser(userId);
  }

  @Get(':id') @ApiOperation({ summary: 'Get claim by ID' })
  findOne(@Param('id') id: string) {
    return this.claimsService.findById(id);
  }
}
