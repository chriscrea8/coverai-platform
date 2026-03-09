import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Policy } from '../policies/policy.entity';
import { InsuranceProduct } from '../insurance-products/insurance-product.entity';
import { InsuranceProvider } from '../insurance-providers/insurance-provider.entity';
import { User } from '../users/user.entity';

interface RecommendedProduct {
  product: any;
  score: number;
  reason: string;
  matchType: 'content_based' | 'collaborative' | 'popular';
  estimatedPremium?: { min: number; max: number };
  processingFee: number; // Platform convenience fee
}

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  // Platform processing fee for AI recommendation convenience (₦)
  private readonly PROCESSING_FEE_CONSUMER = 500;
  private readonly PROCESSING_FEE_SME = 2000;

  constructor(
    @InjectRepository(Policy)     private policyRepo:   Repository<Policy>,
    @InjectRepository(InsuranceProduct) private productRepo: Repository<InsuranceProduct>,
    @InjectRepository(InsuranceProvider) private providerRepo: Repository<InsuranceProvider>,
    @InjectRepository(User)       private userRepo:     Repository<User>,
  ) {}

  async getRecommendations(userId: string, context?: {
    industry?: string;
    employeeCount?: number;
    revenue?: number;
    assets?: number;
    hasVehicle?: boolean;
    hasProperty?: boolean;
  }): Promise<RecommendedProduct[]> {
    // Fetch data in parallel
    const [user, allProducts, userPolicies, allPolicies] = await Promise.all([
      this.userRepo.findOne({ where: { id: userId } }),
      this.productRepo.find({ where: { status: 'active' }, order: { createdAt: 'DESC' } }),
      this.policyRepo.find({ where: { userId }, order: { createdAt: 'DESC' } }),
      this.policyRepo.find({ order: { createdAt: 'DESC' }, take: 500 }),
    ]);

    if (!user || !allProducts.length) return [];

    const isSme = user.role === 'sme_owner';
    const processingFee = isSme ? this.PROCESSING_FEE_SME : this.PROCESSING_FEE_CONSUMER;

    // Products already owned by user
    const ownedProductIds = new Set(userPolicies.map(p => p.productId));

    // ── 1. CONTENT-BASED FILTERING ──────────────────────────────
    const contentScored = allProducts
      .filter(p => !ownedProductIds.has(p.id))
      .map(product => ({
        product,
        score: this.computeContentScore(product, user, context || {}),
        matchType: 'content_based' as const,
        reason: this.getReason(product, user, context || {}),
        estimatedPremium: {
          min: Number(product.premiumMin || 0),
          max: Number(product.premiumMax || 0),
        },
        processingFee,
      }))
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score);

    // ── 2. COLLABORATIVE FILTERING ──────────────────────────────
    // Find similar users: same role, purchased policies recently
    const popularProductIds = this.computePopularProducts(allPolicies, ownedProductIds);

    const collaborativeRecs = popularProductIds
      .filter(({ productId }) => !ownedProductIds.has(productId))
      .slice(0, 5)
      .map(({ productId, count }) => {
        const product = allProducts.find(p => p.id === productId);
        if (!product) return null;
        return {
          product,
          score: 40 + Math.min(count * 5, 30), // Max 70 from collaborative
          matchType: 'collaborative' as const,
          reason: `Purchased by ${count} similar users on CoverAI`,
          estimatedPremium: {
            min: Number(product.premiumMin || 0),
            max: Number(product.premiumMax || 0),
          },
          processingFee,
        };
      })
      .filter(Boolean);

    // ── 3. MERGE & DEDUPLICATE ───────────────────────────────────
    const seen = new Set<string>();
    const merged: RecommendedProduct[] = [];

    for (const rec of [...contentScored, ...collaborativeRecs]) {
      if (rec && !seen.has(rec.product.id)) {
        seen.add(rec.product.id);
        merged.push(rec as RecommendedProduct);
      }
    }

    // Sort by score, cap at 6 recommendations
    return merged
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map(r => ({
        ...r,
        product: {
          ...r.product,
          name: r.product.productName,
          productType: r.product.category,
          minPremium: r.product.premiumMin,
          maxPremium: r.product.premiumMax,
        },
      }));
  }

  async getQuote(productId: string, userId: string, userContext: Record<string, any>) {
    const [product, user] = await Promise.all([
      this.productRepo.findOne({ where: { id: productId } }),
      this.userRepo.findOne({ where: { id: userId } }),
    ]);
    if (!product || !user) return null;

    const isSme = user.role === 'sme_owner';
    const processingFee = isSme ? this.PROCESSING_FEE_SME : this.PROCESSING_FEE_CONSUMER;

    // Compute a dynamic premium estimate based on user context
    const basePremium = Number(product.premiumMin || 5000);
    const maxPremium = Number(product.premiumMax || basePremium * 5);

    let factor = 1.0;

    // Adjust based on revenue (SME)
    if (userContext.revenue) {
      const rev = Number(userContext.revenue);
      if (rev > 50_000_000) factor *= 1.8;
      else if (rev > 10_000_000) factor *= 1.4;
      else if (rev > 1_000_000) factor *= 1.2;
    }

    // Adjust based on employees
    if (userContext.employeeCount) {
      const count = Number(userContext.employeeCount);
      if (count > 50) factor *= 1.5;
      else if (count > 10) factor *= 1.2;
    }

    // Adjust based on assets
    if (userContext.assetValue) {
      const assets = Number(userContext.assetValue);
      const coverageRatio = assets > 0 ? 0.005 : 0; // 0.5% of asset value as premium
      const assetPremium = assets * coverageRatio;
      if (assetPremium > basePremium) factor *= assetPremium / basePremium;
    }

    const estimatedPremium = Math.min(
      Math.round(basePremium * factor / 100) * 100, // Round to nearest 100
      maxPremium,
    );

    const commission = estimatedPremium * Number(product.commissionRate || 0.10);

    return {
      product: {
        id: product.id,
        name: product.productName,
        category: product.category,
        description: product.description,
        durationMonths: product.durationMonths,
      },
      quote: {
        estimatedPremium,
        commissionRate: Number(product.commissionRate || 0.10),
        commissionAmount: Math.round(commission),
        processingFee,
        totalDue: estimatedPremium + processingFee,
        currency: 'NGN',
        validFor: '30 minutes',
        generatedAt: new Date().toISOString(),
      },
      userContext,
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────
  private computeContentScore(
    product: InsuranceProduct,
    user: User,
    ctx: Record<string, any>,
  ): number {
    let score = 0;
    const cat = product.category?.toLowerCase();
    const isSme = user.role === 'sme_owner';

    // Role alignment
    if (isSme && product.isSmeProduct) score += 30;
    if (!isSme && !product.isSmeProduct) score += 15;

    // Industry / category matching
    if (ctx.hasVehicle && (cat === 'motor')) score += 35;
    if (ctx.hasProperty && (cat === 'property' || cat === 'fire')) score += 35;
    if (isSme && (cat === 'business' || cat === 'liability')) score += 25;
    if (ctx.employeeCount > 0 && cat === 'health') score += 20;
    if (ctx.industry === 'technology' && cat === 'cyber') score += 40;
    if (ctx.industry === 'agriculture' && cat === 'agriculture') score += 40;
    if (ctx.industry === 'shipping' && cat === 'marine') score += 40;

    // Base score for active products
    if (product.status === 'active') score += 10;

    return score;
  }

  private getReason(product: InsuranceProduct, user: User, ctx: Record<string, any>): string {
    const cat = product.category?.toLowerCase();
    const isSme = user.role === 'sme_owner';

    if (ctx.hasVehicle && cat === 'motor') return 'Based on your vehicle ownership';
    if (ctx.hasProperty && (cat === 'property' || cat === 'fire')) return 'Recommended for property owners';
    if (isSme && product.isSmeProduct) return 'Tailored for SME businesses like yours';
    if (ctx.industry === 'technology' && cat === 'cyber') return 'Essential for tech businesses';
    if (ctx.industry === 'agriculture' && cat === 'agriculture') return 'Designed for your farming sector';
    if (ctx.employeeCount > 0 && cat === 'health') return 'Health cover for your team';
    return `Popular ${cat} coverage in Nigeria`;
  }

  private computePopularProducts(
    allPolicies: Policy[],
    exclude: Set<string>,
  ): { productId: string; count: number }[] {
    const counts: Record<string, number> = {};
    for (const p of allPolicies) {
      if (p.productId && !exclude.has(p.productId)) {
        counts[p.productId] = (counts[p.productId] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .map(([productId, count]) => ({ productId, count }))
      .sort((a, b) => b.count - a.count);
  }
}
