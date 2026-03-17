import { Controller, Get, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { InsuranceVerificationService } from './insurance-verification.service';

@ApiTags('Insurance Verification')
@Controller('insurance')
export class InsuranceVerificationController {
  constructor(private readonly verificationService: InsuranceVerificationService) {}

  @Get('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify vehicle insurance by plate number or policy number' })
  @ApiQuery({ name: 'plate', required: false, description: 'Vehicle plate number (e.g. KJA123AB)' })
  @ApiQuery({ name: 'policy', required: false, description: 'Policy number (e.g. POL-2026-001234)' })
  async verify(
    @Query('plate') plate?: string,
    @Query('policy') policy?: string,
  ) {
    if (!plate && !policy) {
      return {
        status: 'error',
        message: 'Please provide either a plate number (?plate=) or policy number (?policy=)',
      };
    }
    return this.verificationService.verify({ plate, policy });
  }

  @Get('verify/bulk')
  @ApiOperation({ summary: 'Verify multiple plates (comma-separated)' })
  @ApiQuery({ name: 'plates', description: 'Comma-separated plate numbers' })
  async verifyBulk(@Query('plates') plates: string) {
    const plateList = plates.split(',').map(p => p.trim()).filter(Boolean).slice(0, 10);
    const results = await Promise.all(
      plateList.map(plate => this.verificationService.verify({ plate }))
    );
    return { results, count: results.length };
  }
}
