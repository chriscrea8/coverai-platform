import { IsString, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
