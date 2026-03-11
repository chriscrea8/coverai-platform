import {
  Controller, Get, Post, Patch, Body, Param,
  UseGuards, Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { AdminService } from './admin.service';
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

  // ── STATS / KPIs ──────────────────────────────────────────
  @Get('stats')
  @ApiOperation({ summary: 'Admin dashboard KPI stats' })
  getStats() { return this.adminService.getStats(); }

  // ── USERS ─────────────────────────────────────────────────
  @Get('users')
  @ApiOperation({ summary: 'List all users' })
  @ApiQuery({ name: 'role', required: false })
  getUsers(@Query('role') role?: string) {
    return this.adminService.getUsers({ role });
  }

  @Patch('users/:id/suspend')
  @ApiOperation({ summary: 'Suspend a user account' })
  suspendUser(@Param('id') id: string) { return this.adminService.suspendUser(id); }

  @Patch('users/:id/activate')
  @ApiOperation({ summary: 'Reactivate a user account' })
  activateUser(@Param('id') id: string) { return this.adminService.activateUser(id); }

  @Patch('users/:id/role')
  @ApiOperation({ summary: 'Change a user role' })
  changeUserRole(@Param('id') id: string, @Body() body: { role: string }) {
    return this.adminService.changeUserRole(id, body.role);
  }

  // ── POLICIES ──────────────────────────────────────────────
  @Get('policies')
  @ApiOperation({ summary: 'List all policies' })
  getPolicies(@Query('status') status?: string) {
    return this.adminService.getPolicies({ status });
  }

  @Patch('policies/:id/activate')
  @ApiOperation({ summary: 'Manually activate a policy' })
  activatePolicy(@Param('id') id: string) { return this.adminService.activatePolicy(id); }

  @Patch('policies/:id/cancel')
  @ApiOperation({ summary: 'Cancel an active policy' })
  cancelPolicy(@Param('id') id: string) { return this.adminService.cancelPolicy(id); }

  // ── CLAIMS ────────────────────────────────────────────────
  @Get('claims')
  @ApiOperation({ summary: 'List all claims' })
  getClaims(@Query('status') status?: string) {
    return this.adminService.getClaims({ status });
  }

  @Patch('claims/:id/review')
  @ApiOperation({ summary: 'Mark claim as under review' })
  markUnderReview(@Param('id') id: string) { return this.adminService.markClaimUnderReview(id); }

  @Patch('claims/:id/approve')
  @ApiOperation({ summary: 'Approve a claim' })
  approveClaim(
    @Param('id') id: string,
    @CurrentUser('id') reviewerId: string,
    @Body() body: { note?: string },
  ) { return this.adminService.approveClaim(id, reviewerId, body.note); }

  @Patch('claims/:id/reject')
  @ApiOperation({ summary: 'Reject a claim' })
  rejectClaim(
    @Param('id') id: string,
    @CurrentUser('id') reviewerId: string,
    @Body() body: { note?: string },
  ) { return this.adminService.rejectClaim(id, reviewerId, body.note); }

  @Patch('claims/:id/paid')
  @ApiOperation({ summary: 'Mark approved claim payout as sent' })
  markClaimPaid(
    @Param('id') id: string,
    @CurrentUser('id') reviewerId: string,
    @Body() body: { note?: string },
  ) { return this.adminService.markClaimPaid(id, reviewerId, body.note); }

  // ── PROVIDERS ─────────────────────────────────────────────
  @Get('providers')
  @ApiOperation({ summary: 'List all insurance providers' })
  getProviders() { return this.adminService.getProviders(); }

  @Post('providers')
  @ApiOperation({ summary: 'Onboard a new insurance provider' })
  createProvider(@Body() body: any) { return this.adminService.createProvider(body); }

  @Patch('providers/:id')
  @ApiOperation({ summary: 'Edit a provider' })
  updateProvider(@Param('id') id: string, @Body() body: any) { return this.adminService.updateProvider(id, body); }

  @Patch('providers/:id/activate')
  @ApiOperation({ summary: 'Activate a provider' })
  activateProvider(@Param('id') id: string) { return this.adminService.setProviderStatus(id, 'active'); }

  @Patch('providers/:id/deactivate')
  @ApiOperation({ summary: 'Deactivate a provider' })
  deactivateProvider(@Param('id') id: string) { return this.adminService.setProviderStatus(id, 'inactive'); }

  @Post('providers/:id/sync')
  @ApiOperation({ summary: 'Sync products from provider API' })
  syncProviderProducts(@Param('id') id: string) { return this.adminService.syncProviderProducts(id); }

  // ── PRODUCTS ──────────────────────────────────────────────
  @Get('products')
  @ApiOperation({ summary: 'List all insurance products' })
  getProducts() { return this.adminService.getProducts(); }

  @Post('products')
  @ApiOperation({ summary: 'Add a new insurance product' })
  createProduct(@Body() body: any) { return this.adminService.createProduct(body); }

  @Patch('products/:id')
  @ApiOperation({ summary: 'Edit a product' })
  updateProduct(@Param('id') id: string, @Body() body: any) { return this.adminService.updateProduct(id, body); }

  @Patch('products/:id/activate')
  @ApiOperation({ summary: 'Activate a product' })
  activateProduct(@Param('id') id: string) { return this.adminService.setProductStatus(id, 'active'); }

  @Patch('products/:id/deactivate')
  @ApiOperation({ summary: 'Deactivate a product' })
  deactivateProduct(@Param('id') id: string) { return this.adminService.setProductStatus(id, 'inactive'); }

  // ── ANALYTICS & COMMISSION LEDGER ─────────────────────────
  @Get('analytics/revenue')
  @ApiOperation({ summary: 'Revenue analytics + commission ledger' })
  getRevenue(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('providerId') providerId?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.getRevenueAnalytics({ startDate, endDate, providerId, status });
  }

  @Patch('commissions/:id/processing')
  @ApiOperation({ summary: 'Mark commission as processing' })
  markCommissionProcessing(@Param('id') id: string) {
    return this.adminService.markCommissionProcessing(id);
  }

  @Patch('commissions/:id/paid')
  @ApiOperation({ summary: 'Mark commission as paid' })
  markCommissionPaid(@Param('id') id: string, @Body() body: { notes?: string }) {
    return this.adminService.markCommissionPaid(id, body.notes);
  }

  @Post('commissions/bulk-paid')
  @ApiOperation({ summary: 'Bulk mark commissions as paid' })
  bulkMarkPaid(@Body() body: { ids: string[] }) {
    return this.adminService.bulkMarkCommissionsPaid(body.ids);
  }
}
