import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

// ─────────────────────────────────────────────────────────────────────────────
// CURACEL GROW API INTEGRATION
//
// Sandbox base URL:    https://api.playbox.grow.curacel.co/api
// Production base URL: https://api.grow.curacel.co/api
//
// To activate:
//   1. Get your API key from app.grow.curacel.co (email: grow@curacel.ai)
//   2. Add CURACEL_API_KEY to Railway environment variables
//   3. Set CURACEL_ENV=production for live mode (default: sandbox)
//
// Without an API key the service runs in PASSTHROUGH mode — it returns
// mock data from a local static catalogue so the rest of the platform
// works while you wait for API access.
// ─────────────────────────────────────────────────────────────────────────────

export interface CuracelProduct {
  id: number;
  code: string;
  title: string;
  insurer: { code: string; name: string; logo_url: string | null };
  product_type: { id: number; name: string; slug: string; icon_url: string | null };
  price: number | null;
  premium_type: 'fixed' | 'relative';
  premium_rate: number;
  premium_rate_unit: 'NGN' | '%';
  min_premium: number | null;
  partner_commission_rate: string;
  cover_benefits: Array<{ id: number; cover: string; benefit: string }>;
  cover_duration: number;
  premium_frequencies: string[];
  coverage_details: string | null;
  product_exception: string | null;
  description: string;
}

export interface CuracelQuote {
  id: string;
  code: string;
  product_code: string;
  premium: number;
  currency: string;
  customer: Record<string, any>;
  fields: Record<string, any>;
  status: string;
  created_at: string;
}

export interface CuracelOrder {
  id: string;
  code: string;
  quote_code: string;
  status: string;
  policy_number: string | null;
  premium: number;
  created_at: string;
}

export interface CuracelPolicy {
  id: string;
  code: string;
  order_code: string;
  policy_number: string;
  status: string;
  start_date: string;
  end_date: string;
  certificate_url: string | null;
  insurer: string;
}

export interface CuracelClaim {
  id: string;
  code: string;
  policy_code: string;
  status: string;
  amount: number;
  description: string;
  created_at: string;
}

// ── Static fallback catalogue (sandbox data collected 2026-03-18) ─────────────
const STATIC_PRODUCTS: Partial<CuracelProduct>[] = [
  { id: 3,  code: '3t5eg',                                    title: 'AXA PRADO 1',                                    insurer: { code: 'AXA', name: 'AXA MANSARD',  logo_url: 'https://www.axamansard.com/images/axa-logo.png' }, product_type: { id: 3,  name: 'Life',               slug: 'life',               icon_url: null }, price: 34,     premium_type: 'fixed',    premium_rate: 34,     premium_rate_unit: 'NGN', partner_commission_rate: '2.00',  premium_frequencies: ['annually'] },
  { id: 5,  code: 'EASYCARE',                                 title: 'Easy Care',                                      insurer: { code: 'AXA', name: 'AXA MANSARD',  logo_url: 'https://www.axamansard.com/images/axa-logo.png' }, product_type: { id: 1,  name: 'Health',             slug: 'health',             icon_url: null }, price: 58446,  premium_type: 'fixed',    premium_rate: 58446,  premium_rate_unit: 'NGN', partner_commission_rate: '5.00',  premium_frequencies: ['annually', 'monthly'] },
  { id: 6,  code: '987fgdry',                                 title: 'MEMPHIS CORE',                                   insurer: { code: 'LWY', name: 'Leadway',      logo_url: null },                                            product_type: { id: 4,  name: 'Goods in Transit',   slug: 'git',                icon_url: null }, price: 33,     premium_type: 'relative', premium_rate: 0.33,   premium_rate_unit: '%',   partner_commission_rate: '1.00',  premium_frequencies: ['per_shipment'] },
  { id: 7,  code: '435te',                                    title: 'SMART INSURE LITE',                              insurer: { code: 'LWY', name: 'Leadway',      logo_url: null },                                            product_type: { id: 5,  name: 'Marine',             slug: 'marine',             icon_url: null }, price: 0.25,   premium_type: 'relative', premium_rate: 0.0025, premium_rate_unit: '%',   partner_commission_rate: '1.00',  premium_frequencies: ['per_voyage'] },
  { id: 9,  code: 'w4t4w',                                    title: 'SMART INSURE PLUS',                              insurer: { code: 'LWY', name: 'Leadway',      logo_url: null },                                            product_type: { id: 3,  name: 'Life',               slug: 'life',               icon_url: null }, price: 51,     premium_type: 'fixed',    premium_rate: 51,     premium_rate_unit: 'NGN', partner_commission_rate: '2.00',  premium_frequencies: ['annually', 'monthly'] },
  { id: 11, code: '5342',                                     title: 'Mutual Cover 2',                                 insurer: { code: 'OM',  name: 'OLD MUTUAL',   logo_url: null },                                            product_type: { id: 5,  name: 'Marine',             slug: 'marine',             icon_url: null }, price: 0.25,   premium_type: 'relative', premium_rate: 0.0025, premium_rate_unit: '%',   partner_commission_rate: '1.00',  premium_frequencies: ['per_voyage'] },
  { id: 14, code: 'auto-comprehensive-insurance-saloon-suvs', title: 'Auto - Comprehensive Insurance (Saloon/SUVs)',   insurer: { code: 'AXA', name: 'AXA MANSARD',  logo_url: 'https://www.axamansard.com/images/axa-logo.png' }, product_type: { id: 10, name: 'Comprehensive Auto', slug: 'comprehensive_auto',  icon_url: null }, price: null,   premium_type: 'relative', premium_rate: 3,      premium_rate_unit: '%',   partner_commission_rate: '3.00',  premium_frequencies: ['annually'] },
  { id: 15, code: 'auto-third-party-insurance',               title: 'Auto - Third Party Insurance',                   insurer: { code: 'AXA', name: 'AXA MANSARD',  logo_url: 'https://www.axamansard.com/images/axa-logo.png' }, product_type: { id: 2,  name: '3rd Party Auto',     slug: '3rd_party_auto',     icon_url: null }, price: 15000,  premium_type: 'fixed',    premium_rate: 15000,  premium_rate_unit: 'NGN', partner_commission_rate: '3.00',  premium_frequencies: ['annually'] },
  { id: 16, code: 'smart-insure-comprehensive',               title: 'Smart Insure Comprehensive',                     insurer: { code: 'LWY', name: 'Leadway',      logo_url: null },                                            product_type: { id: 10, name: 'Comprehensive Auto', slug: 'comprehensive_auto',  icon_url: null }, price: null,   premium_type: 'relative', premium_rate: 2.5,    premium_rate_unit: '%',   partner_commission_rate: '3.00',  premium_frequencies: ['annually'] },
  { id: 17, code: 'smart-insure-third-party',                 title: 'Smart Insure Third Party',                       insurer: { code: 'LWY', name: 'Leadway',      logo_url: null },                                            product_type: { id: 2,  name: '3rd Party Auto',     slug: '3rd_party_auto',     icon_url: null }, price: 5000,   premium_type: 'fixed',    premium_rate: 5000,   premium_rate_unit: 'NGN', partner_commission_rate: '3.00',  premium_frequencies: ['annually'] },
  { id: 20, code: 'micro-health-basic',                       title: 'Micro Health Basic',                             insurer: { code: 'AXA', name: 'AXA MANSARD',  logo_url: 'https://www.axamansard.com/images/axa-logo.png' }, product_type: { id: 12, name: 'Micro Health',       slug: 'micro_health',       icon_url: null }, price: 5000,   premium_type: 'fixed',    premium_rate: 5000,   premium_rate_unit: 'NGN', partner_commission_rate: '5.00',  premium_frequencies: ['monthly', 'quarterly', 'annually'] },
  { id: 21, code: 'personal-accident-basic',                  title: 'Personal Accident Basic',                        insurer: { code: 'LWY', name: 'Leadway',      logo_url: null },                                            product_type: { id: 13, name: 'Personal Accident',  slug: 'personal_accident',  icon_url: null }, price: 2500,   premium_type: 'fixed',    premium_rate: 2500,   premium_rate_unit: 'NGN', partner_commission_rate: '4.00',  premium_frequencies: ['annually'] },
];

@Injectable()
export class CuracelService {
  private readonly logger = new Logger(CuracelService.name);
  private readonly client: AxiosInstance | null = null;
  private readonly hasApiKey: boolean;
  private readonly isSandbox: boolean;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('CURACEL_API_KEY');
    const env = this.configService.get<string>('CURACEL_ENV') || 'sandbox';
    this.isSandbox = env !== 'production';
    this.hasApiKey = !!apiKey;

    if (apiKey) {
      const baseURL = this.isSandbox
        ? 'https://api.playbox.grow.curacel.co/api/v1'
        : 'https://api.grow.curacel.co/api/v1';

      this.client = axios.create({
        baseURL,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      });

      this.logger.log(`✅ Curacel integration active — ${this.isSandbox ? 'SANDBOX' : 'PRODUCTION'} mode`);
    } else {
      this.logger.warn('⚠️  No CURACEL_API_KEY — running with static product catalogue. Add key to Railway to enable live insurer products.');
    }
  }

  // ── PRODUCTS ──────────────────────────────────────────────────────────────

  async getProductTypes() {
    if (this.client) {
      try {
        const res = await this.client.get('/product-types');
        return res.data;
      } catch (e) {
        this.logger.warn('Curacel getProductTypes failed: ' + e.message);
      }
    }
    return {
      data: [
        { id: 1, name: 'Health', slug: 'health' },
        { id: 2, name: '3rd Party Auto', slug: '3rd_party_auto' },
        { id: 3, name: 'Life', slug: 'life' },
        { id: 4, name: 'Goods in Transit', slug: 'git' },
        { id: 5, name: 'Marine', slug: 'marine' },
        { id: 7, name: 'Gadget', slug: 'gadget' },
        { id: 8, name: 'Fire and Burglary', slug: 'fire_burglary' },
        { id: 10, name: 'Comprehensive Auto', slug: 'comprehensive_auto' },
        { id: 12, name: 'Micro Health', slug: 'micro_health' },
        { id: 13, name: 'Personal Accident', slug: 'personal_accident' },
      ]
    };
  }

  async getProducts(params?: { type?: number | string; page?: number; per_page?: number; calculate_premium?: number }) {
    if (this.client) {
      try {
        const res = await this.client.get('/products', { params });
        return res.data;
      } catch (e) {
        this.logger.warn('Curacel getProducts failed: ' + e.message);
      }
    }
    // Fallback: filter static products
    let products = [...STATIC_PRODUCTS];
    if (params?.type) {
      products = products.filter(p => p.product_type?.id === Number(params.type) || p.product_type?.slug === params.type);
    }
    return { data: products, meta: { total: products.length, per_page: 50, current_page: 1, last_page: 1 } };
  }

  async getProduct(code: string) {
    if (this.client) {
      try {
        const res = await this.client.get(`/products/${code}`);
        return res.data;
      } catch (e) {
        this.logger.warn('Curacel getProduct failed: ' + e.message);
      }
    }
    const product = STATIC_PRODUCTS.find(p => p.code === code || String(p.id) === String(code));
    return product ? { data: product } : null;
  }

  // ── QUOTATIONS ────────────────────────────────────────────────────────────

  async createQuote(dto: {
    product_code: string;
    customer: { first_name: string; last_name: string; email: string; phone: string };
    fields?: Record<string, any>;
    asset_value?: number;
  }): Promise<CuracelQuote | null> {
    if (!this.client) {
      this.logger.warn('Curacel createQuote called without API key — returning mock quote');
      const product = STATIC_PRODUCTS.find(p => p.code === dto.product_code);
      return {
        id: `mock-${Date.now()}`,
        code: `QT-${Date.now()}`,
        product_code: dto.product_code,
        premium: product?.price || 15000,
        currency: 'NGN',
        customer: dto.customer,
        fields: dto.fields || {},
        status: 'pending',
        created_at: new Date().toISOString(),
      };
    }
    try {
      const res = await this.client.post('/quotations', dto);
      return res.data?.data || res.data;
    } catch (e) {
      this.logger.error('Curacel createQuote error: ' + e.response?.data?.message || e.message);
      return null;
    }
  }

  async convertQuoteToOrder(quoteCode: string): Promise<CuracelOrder | null> {
    if (!this.client) {
      return {
        id: `mock-order-${Date.now()}`,
        code: `ORD-${Date.now()}`,
        quote_code: quoteCode,
        status: 'pending',
        policy_number: null,
        premium: 15000,
        created_at: new Date().toISOString(),
      };
    }
    try {
      const res = await this.client.post(`/quotations/${quoteCode}/convert`);
      return res.data?.data || res.data;
    } catch (e) {
      this.logger.error('Curacel convertQuoteToOrder error: ' + e.message);
      return null;
    }
  }

  // ── POLICIES ──────────────────────────────────────────────────────────────

  async getPolicies(params?: { page?: number }) {
    if (!this.client) return { data: [], meta: { total: 0 } };
    try {
      const res = await this.client.get('/policies', { params });
      return res.data;
    } catch (e) {
      this.logger.warn('Curacel getPolicies failed: ' + e.message);
      return { data: [], meta: { total: 0 } };
    }
  }

  async getPolicy(policyCode: string) {
    if (!this.client) return null;
    try {
      const res = await this.client.get(`/policies/${policyCode}`);
      return res.data?.data || res.data;
    } catch (e) {
      this.logger.warn('Curacel getPolicy failed: ' + e.message);
      return null;
    }
  }

  // ── CLAIMS ────────────────────────────────────────────────────────────────

  async submitClaim(dto: {
    policy_code: string;
    description: string;
    amount: number;
    incident_date: string;
    attachments?: string[];
  }): Promise<CuracelClaim | null> {
    if (!this.client) {
      return {
        id: `mock-claim-${Date.now()}`,
        code: `CLM-CURACEL-${Date.now()}`,
        policy_code: dto.policy_code,
        status: 'submitted',
        amount: dto.amount,
        description: dto.description,
        created_at: new Date().toISOString(),
      };
    }
    try {
      const res = await this.client.post('/claims', dto);
      return res.data?.data || res.data;
    } catch (e) {
      this.logger.error('Curacel submitClaim error: ' + e.message);
      return null;
    }
  }

  async getClaims(params?: { page?: number }) {
    if (!this.client) return { data: [], meta: { total: 0 } };
    try {
      const res = await this.client.get('/claims', { params });
      return res.data;
    } catch (e) {
      this.logger.warn('Curacel getClaims failed: ' + e.message);
      return { data: [], meta: { total: 0 } };
    }
  }

  // ── CUSTOMERS ─────────────────────────────────────────────────────────────

  async createCustomer(dto: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    date_of_birth?: string;
  }) {
    if (!this.client) return { data: { id: `mock-customer-${Date.now()}`, ...dto } };
    try {
      const res = await this.client.post('/customers', dto);
      return res.data;
    } catch (e) {
      this.logger.warn('Curacel createCustomer failed: ' + e.message);
      return null;
    }
  }

  // ── WALLETS ───────────────────────────────────────────────────────────────

  async getWalletBalance() {
    if (!this.client) return { data: { balance: 0, currency: 'NGN' } };
    try {
      const res = await this.client.get('/wallet');
      return res.data;
    } catch (e) {
      this.logger.warn('Curacel getWalletBalance failed: ' + e.message);
      return { data: { balance: 0, currency: 'NGN' } };
    }
  }

  // ── HELPERS ───────────────────────────────────────────────────────────────

  getStatus() {
    return {
      connected: this.hasApiKey,
      mode: this.hasApiKey ? (this.isSandbox ? 'sandbox' : 'production') : 'passthrough',
      message: this.hasApiKey
        ? `Connected to Curacel ${this.isSandbox ? 'Sandbox' : 'Production'}`
        : 'Running with static catalogue. Add CURACEL_API_KEY to Railway to enable live products.',
    };
  }

  calculatePremium(product: Partial<CuracelProduct>, assetValue?: number): number {
    if (product.premium_type === 'fixed') {
      return product.premium_rate || product.price || 0;
    }
    // Relative: rate is a percentage of asset value
    if (assetValue && product.premium_rate) {
      const rate = product.premium_rate_unit === '%'
        ? product.premium_rate / 100
        : product.premium_rate / 10000; // basis points
      return Math.round(assetValue * rate);
    }
    return product.min_premium || 0;
  }
}
