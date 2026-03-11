// ── policies/policies.dto.ts ─────────────────────────────────
import { IsUUID, IsNumber, IsPositive, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

// Strip any value that isn't a valid UUID so the request isn't rejected
// (e.g. 'null', empty string, or placeholder IDs from the frontend)
function sanitizeUuid(value: any): string | undefined {
  if (!value || typeof value !== 'string') return undefined;
  const uuid4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuid4Regex.test(value.trim()) ? value.trim() : undefined;
}

export class PurchasePolicyDto {
  @ApiPropertyOptional() @IsUUID('all') @IsOptional() @Transform(({ value }) => sanitizeUuid(value)) productId?: string;
  @ApiPropertyOptional() @IsUUID('all') @IsOptional() @Transform(({ value }) => sanitizeUuid(value)) providerId?: string;
  @ApiPropertyOptional() @IsUUID('all') @IsOptional() @Transform(({ value }) => sanitizeUuid(value)) smeId?: string;
  @ApiProperty() @IsNumber() @IsPositive() premiumAmount: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() coverageAmount?: number;
  @ApiPropertyOptional() @IsOptional() policyDetails?: Record<string, any>;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoRenew?: boolean;
}
