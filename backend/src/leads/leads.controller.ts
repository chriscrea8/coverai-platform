import { Controller, Post, Get, Patch, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { LeadsService, CreateLeadDto } from './leads.service';

@ApiTags('Leads')
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a lead (user expressing purchase interest)' })
  create(@Body() dto: CreateLeadDto, @Req() req: any) {
    if (req.user?.id) dto.userId = req.user.id;
    return this.leadsService.create(dto);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get leads (admin)' })
  findAll(@Query('status') status?: string, @Query('source') source?: string) {
    return this.leadsService.findAll({ status, source });
  }

  @Get('stats')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Lead statistics' })
  stats() {
    return this.leadsService.getStats();
  }

  @Get('mine')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get my leads' })
  mine(@Req() req: any) {
    return this.leadsService.findByUser(req.user.id);
  }

  @Patch(':id/status')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Update lead status' })
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string; routedTo?: string },
  ) {
    return this.leadsService.updateStatus(id, body.status, body.routedTo);
  }
}
