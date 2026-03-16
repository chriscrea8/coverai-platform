import { Controller, Post, Body, Logger, HttpCode } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UssdService } from './ussd.service';

@ApiTags('USSD')
@Controller('ussd')
export class UssdController {
  private readonly logger = new Logger(UssdController.name);

  constructor(private readonly ussdService: UssdService) {}

  // Africa's Talking posts form data to this endpoint
  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: 'Africa\'s Talking USSD webhook' })
  async handle(
    @Body('sessionId') sessionId: string,
    @Body('serviceCode') serviceCode: string,
    @Body('phoneNumber') phoneNumber: string,
    @Body('text') text: string,
  ): Promise<string> {
    this.logger.log(`USSD: ${phoneNumber} | session: ${sessionId} | text: "${text}"`);
    return this.ussdService.handleSession(sessionId, phoneNumber, text || '');
  }
}
