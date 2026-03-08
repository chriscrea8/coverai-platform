import { IsUUID, IsNumber, IsPositive, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() policyId?: string;
  @ApiProperty() @IsNumber() @IsPositive() amount: number;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() metadata?: Record<string, any>;
}
