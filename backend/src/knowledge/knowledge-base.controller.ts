import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { KnowledgeBaseService } from './knowledge-base.service';
import { KnowledgeBase } from './knowledge-base.entity';
import { KNOWLEDGE_BASE_SEED } from './knowledge-base.seed';

@ApiTags('Knowledge Base')
@Controller('knowledge')
export class KnowledgeBaseController {
  constructor(private readonly kbService: KnowledgeBaseService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search knowledge base' })
  search(@Query('q') query: string, @Query('limit') limit?: string) {
    return this.kbService.search(query, limit ? parseInt(limit) : 5);
  }

  @Get()
  @ApiOperation({ summary: 'Get all knowledge base entries' })
  getAll(@Query('category') category?: string, @Query('subcategory') subcategory?: string) {
    return this.kbService.getAll(category, subcategory);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Add knowledge base entry (admin)' })
  create(@Body() dto: Partial<KnowledgeBase>) {
    return this.kbService.create(dto);
  }

  @Post('seed')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Seed knowledge base with default FAQs (admin)' })
  async seed() {
    const existing = await this.kbService.getAll();
    if (existing.length > 0) {
      return { message: `Knowledge base already has ${existing.length} entries. Skipping seed.` };
    }
    const result = await this.kbService.bulkCreate(KNOWLEDGE_BASE_SEED);
    return { message: `Successfully seeded ${result.length} knowledge base entries.` };
  }
}
