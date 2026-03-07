// ── policies/policies.dto.ts ─────────────────────────────────
import { IsUUID, IsNumber, IsPositive, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PurchasePolicyDto {
  @ApiProperty() @IsUUID() productId: string;
  @ApiProperty() @IsUUID() providerId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() smeId?: string;
  @ApiProperty() @IsNumber() @IsPositive() premiumAmount: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() coverageAmount?: number;
  @ApiPropertyOptional() @IsOptional() policyDetails?: Record<string, any>;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoRenew?: boolean;
}
