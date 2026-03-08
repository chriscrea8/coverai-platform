import { Module, Injectable, ConflictException, NotFoundException, Controller, Post, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SmeProfile } from './sme-profile.entity';
import { CurrentUser } from '../common/decorators';

export class CreateSmeDto {
  @ApiProperty() @IsString() businessName: string;
  @ApiProperty() @IsString() industry: string;
  @ApiProperty() @IsString() location: string;
  @ApiPropertyOptional() @IsOptional() @IsString() state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() registrationNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() businessSize?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() employeeCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}

@Injectable()
export class SmeService {
  constructor(@InjectRepository(SmeProfile) private readonly smeRepo: Repository<SmeProfile>) {}

  async create(ownerId: string, dto: CreateSmeDto) {
    const existing = await this.smeRepo.findOne({ where: { ownerId } });
    if (existing) throw new ConflictException('SME profile already exists');
    const sme = this.smeRepo.create({ ...dto, ownerId });
    return this.smeRepo.save(sme);
  }

  async getProfile(ownerId: string) {
    const sme = await this.smeRepo.findOne({ where: { ownerId } });
    if (!sme) throw new NotFoundException('SME profile not found');
    return sme;
  }

  async updateProfile(ownerId: string, dto: Partial<CreateSmeDto>) {
    const sme = await this.getProfile(ownerId);
    Object.assign(sme, dto);
    return this.smeRepo.save(sme);
  }
}

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

@Module({
  imports: [TypeOrmModule.forFeature([SmeProfile])],
  controllers: [SmeController],
  providers: [SmeService],
  exports: [SmeService],
})
export class SmeModule {}
