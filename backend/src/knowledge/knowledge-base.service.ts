import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { KnowledgeBase } from './knowledge-base.entity';
import { KNOWLEDGE_BASE_SEED } from './knowledge-base.seed';

@Injectable()
export class KnowledgeBaseService implements OnApplicationBootstrap {
  private readonly logger = new Logger(KnowledgeBaseService.name);

  constructor(
    @InjectRepository(KnowledgeBase)
    private readonly kbRepo: Repository<KnowledgeBase>,
  ) {}

  async onApplicationBootstrap() {
    try {
      const count = await this.kbRepo.count();
      if (count === 0) {
        const entities = KNOWLEDGE_BASE_SEED.map(item => this.kbRepo.create(item));
        await this.kbRepo.save(entities);
        this.logger.log(`✅ Knowledge base seeded with ${entities.length} entries`);
      }
    } catch (e) {
      this.logger.warn('Knowledge base auto-seed skipped: ' + e.message);
    }
  }

  // Semantic search without vector embeddings — keyword + category matching
  async search(query: string, limit = 5): Promise<KnowledgeBase[]> {
    const q = query.toLowerCase();

    // Extract keywords from query
    const keywords = q.split(/\s+/).filter(w => w.length > 3);

    // Detect category from query
    let subcategory: string | null = null;
    if (/motor|car|vehicle|third.?party|comprehensive|drive/.test(q)) subcategory = 'motor';
    else if (/health|medical|hospital|hmo|doctor/.test(q)) subcategory = 'health';
    else if (/life|death|burial|beneficiary|sum.?assured/.test(q)) subcategory = 'life';
    else if (/fire|burglary|property|shop|building|theft/.test(q)) subcategory = 'property';
    else if (/sme|business|company|enterprise|employee|liability/.test(q)) subcategory = 'sme';

    // Build search - first try subcategory match
    let results: KnowledgeBase[] = [];

    if (subcategory) {
      results = await this.kbRepo.find({
        where: { subcategory, isActive: true },
        order: { useCount: 'DESC' },
        take: limit,
      });
    }

    // If not enough, search by keyword matching on question
    if (results.length < limit) {
      const keywordResults = await Promise.all(
        keywords.slice(0, 3).map(kw =>
          this.kbRepo.find({
            where: { question: ILike(`%${kw}%`), isActive: true },
            take: 3,
          })
        )
      );

      const extra = keywordResults.flat().filter(
        r => !results.find(existing => existing.id === r.id)
      );
      results = [...results, ...extra].slice(0, limit);
    }

    // Track usage
    if (results.length > 0) {
      await Promise.all(
        results.map(r => this.kbRepo.update(r.id, { useCount: r.useCount + 1 }))
      ).catch(() => {});
    }

    return results;
  }

  async getAll(category?: string, subcategory?: string) {
    const where: any = { isActive: true };
    if (category) where.category = category;
    if (subcategory) where.subcategory = subcategory;
    return this.kbRepo.find({ where, order: { useCount: 'DESC' } });
  }

  async create(dto: Partial<KnowledgeBase>) {
    return this.kbRepo.save(this.kbRepo.create(dto));
  }

  async bulkCreate(items: Partial<KnowledgeBase>[]) {
    const entities = items.map(item => this.kbRepo.create(item));
    return this.kbRepo.save(entities);
  }

  formatForPrompt(items: KnowledgeBase[]): string {
    if (!items.length) return '';
    return `\n\n## KNOWLEDGE BASE — Relevant FAQs & Policy Info:\n` +
      items.map(item =>
        `**Q: ${item.question}**\nA: ${item.answer}`
      ).join('\n\n');
  }
}
