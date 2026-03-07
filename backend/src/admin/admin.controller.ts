// ── admin/admin.controller.ts ────────────────────────────────
import {
  Controller, Get, Post, Patch, Body, Param,
  UseGuards, Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { ReviewClaimDto } from '../claims/claims.module';
import { Roles, CurrentUser } from '../common/decorators';
import { RolesGuard } from '../common/guards';
import { UserRole } from '../users/user.entity';

@ApiTags('Admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth('JWT')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ── USERS ────────────────────────────────────────────────
  @Get('users')
  @ApiOperation({ summary: 'List all users' })
  @ApiQuery({ name: 'role', required: false })
  @ApiQuery({ name: 'page', required: false })
  getUsers(@Query('role') role?: string, @Query('page') page?: number) {
    return this.adminService.getUsers({ role, page });
  }

  @Patch('users/:id/suspend')
  @ApiOperation({ summary: 'Suspend a user account' })
  suspendUser(@Param('id') id: string) {
    return this.adminService.suspendUser(id);
  }

  // ── POLICIES ─────────────────────────────────────────────
  @Get('policies')
  @ApiOperation({ summary: 'List all policies' })
  getPolicies(@Query('status') status?: string) {
    return this.adminService.getPolicies({ status });
  }

  // ── CLAIMS ───────────────────────────────────────────────
  @Get('claims')
  @ApiOperation({ summary: 'List all claims' })
  getClaims(@Query('status') status?: string) {
    return this.adminService.getClaims({ status });
  }

  @Post('claims/:id/approve')
  @ApiOperation({ summary: 'Approve or reject a claim' })
  reviewClaim(
    @Param('id') claimId: string,
    @CurrentUser('id') reviewerId: string,
    @Body() dto: ReviewClaimDto,
  ) {
    return this.adminService.reviewClaim(claimId, reviewerId, dto);
  }

  // ── PROVIDERS ────────────────────────────────────────────
  @Get('providers')
  @ApiOperation({ summary: 'List all insurance providers' })
  getProviders() {
    return this.adminService.getProviders();
  }

  @Post('providers/:id/approve')
  @ApiOperation({ summary: 'Approve an insurance provider' })
  approveProvider(@Param('id') id: string) {
    return this.adminService.approveProvider(id);
  }

  // ── ANALYTICS ────────────────────────────────────────────
  @Get('analytics/revenue')
  @ApiOperation({ summary: 'Revenue analytics and commission report' })
  getRevenue(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.adminService.getRevenueAnalytics({ startDate, endDate });
  }

  @Get('analytics/dashboard')
  @ApiOperation({ summary: 'Admin dashboard KPIs' })
  getDashboard() {
    return this.adminService.getDashboardKpis();
  }
}
