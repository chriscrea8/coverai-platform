import { Controller, Get, Patch, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { FraudService } from './fraud.service';

@ApiTags('Fraud Detection')
@Controller('fraud')
@UseGuards(AuthGuard('jwt'))
export class FraudController {
  constructor(private readonly fraudService: FraudService) {}

  @Get()
  @ApiOperation({ summary: 'Get all fraud flags (admin)' })
  getFlags(@Query('resolved') resolved?: string, @Query('level') level?: string) {
    return this.fraudService.getFraudFlags({
      resolved: resolved !== undefined ? resolved === 'true' : undefined,
      riskLevel: level,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get fraud statistics (admin)' })
  getStats() {
    return this.fraudService.getFraudStats();
  }

  @Patch(':id/resolve')
  @ApiOperation({ summary: 'Mark fraud flag as resolved (admin)' })
  resolve(@Param('id') id: string, @Req() req: any, @Body() body: { notes: string }) {
    return this.fraudService.resolveFlag(id, req.user.id, body.notes);
  }
}
