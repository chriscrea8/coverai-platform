// ── users/users.dto.ts ───────────────────────────────────────
import { IsString, IsEmail, IsOptional, MinLength, Matches, IsDateString, IsIn } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() avatarUrl?: string;
  // Additional profile fields
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateOfBirth?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nationality?: string;
}

export class SubmitKycDto {
  @ApiProperty() @IsString() @IsIn(['nin', 'bvn', 'passport', 'drivers_license']) idType: string;
  @ApiProperty() @IsString() @MinLength(6) idNumber: string;
  @ApiPropertyOptional() @IsOptional() @IsString() idDocumentUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() selfieUrl?: string;
}

export class ChangePasswordDto {
  @ApiProperty() @IsString() currentPassword: string;
  @ApiProperty() @IsString() @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  newPassword: string;
}
