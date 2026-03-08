import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChatDto {
  @ApiProperty({ description: 'Message to send to ARIA' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: 'Session ID for conversation continuity' })
  @IsOptional()
  @IsString()
  sessionId?: string;
}
