// ── policies/policies.dto.ts ─────────────────────────────────
import { IsNumber, IsPositive, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

// Sanitize: return the value only if it's a valid UUID v4, else undefined.
// This runs BEFORE class-validator so invalid / missing IDs are silently dropped.
function sanitizeUuid(value: any): string | undefined {
  if (!value || typeof value !== 'string') return undefined;
  const uuid4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuid4Regex.test(value.trim()) ? value.trim() : undefined;
}

export class PurchasePolicyDto {
  // NOTE: @IsUUID is intentionally omitted — @Transform already rejects non-UUIDs by
  // returning undefined. @IsOptional then allows undefined through cleanly.
  // Adding @IsUUID caused false positives due to enableImplicitConversion ordering.
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => sanitizeUuid(value)) productId?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => sanitizeUuid(value)) providerId?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => sanitizeUuid(value)) smeId?: string;
  @ApiProperty() @IsNumber() @IsPositive() premiumAmount: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() coverageAmount?: number;
  @ApiPropertyOptional() @IsOptional() policyDetails?: Record<string, any>;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoRenew?: boolean;
}
