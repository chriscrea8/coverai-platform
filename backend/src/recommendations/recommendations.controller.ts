import {
  Controller, Get, Post, Body, UseGuards, Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { RecommendationsService } from './recommendations.service';
import { CurrentUser } from '../common/decorators';

@ApiTags('Recommendations')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth('JWT')
@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly svc: RecommendationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get AI-powered product recommendations for the user' })
  @ApiQuery({ name: 'industry', required: false })
  @ApiQuery({ name: 'hasVehicle', required: false })
  @ApiQuery({ name: 'hasProperty', required: false })
  @ApiQuery({ name: 'employeeCount', required: false })
  @ApiQuery({ name: 'revenue', required: false })
  getRecommendations(
    @CurrentUser('id') userId: string,
    @Query('industry') industry?: string,
    @Query('hasVehicle') hasVehicle?: string,
    @Query('hasProperty') hasProperty?: string,
    @Query('employeeCount') employeeCount?: string,
    @Query('revenue') revenue?: string,
  ) {
    return this.svc.getRecommendations(userId, {
      industry,
      hasVehicle: hasVehicle === 'true',
      hasProperty: hasProperty === 'true',
      employeeCount: employeeCount ? parseInt(employeeCount) : undefined,
      revenue: revenue ? parseInt(revenue) : undefined,
    });
  }

  @Post('quote')
  @ApiOperation({ summary: 'Get a real-time premium quote for a product' })
  getQuote(
    @CurrentUser('id') userId: string,
    @Body() body: {
      productId: string;
      revenue?: number;
      employeeCount?: number;
      assetValue?: number;
      industry?: string;
    },
  ) {
    const { productId, ...context } = body;
    return this.svc.getQuote(productId, userId, context);
  }
}
