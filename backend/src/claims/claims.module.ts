import { Module, Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Claim } from './claim.entity';
import { ClaimsService, CreateClaimDto, ReviewClaimDto } from './claims.service';
import { PoliciesModule } from '../policies/policies.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
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

@Module({
  imports: [
    TypeOrmModule.forFeature([Claim]),
    PoliciesModule,
    NotificationsModule,
    UsersModule,
  ],
  controllers: [ClaimsController],
  providers: [ClaimsService],
  exports: [ClaimsService, TypeOrmModule],
})
export class ClaimsModule {}

export { ReviewClaimDto };
