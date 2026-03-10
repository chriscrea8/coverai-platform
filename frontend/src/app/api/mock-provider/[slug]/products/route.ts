/**
 * CoverAI Mock Provider API
 * Deploy this as a Next.js API route, or just add these routes to the
 * existing frontend's /app/api/ directory.
 *
 * Each provider endpoint returns products in the exact shape
 * that syncProviderProducts() can normalise.
 *
 * Base: /api/mock-provider/[slug]/products
 *
 * Test URLs (after deploy):
 *   GET https://coverai-platform.vercel.app/api/mock-provider/leadway/products
 *   GET https://coverai-platform.vercel.app/api/mock-provider/axa/products
 *   GET https://coverai-platform.vercel.app/api/mock-provider/coronation/products
 *   GET https://coverai-platform.vercel.app/api/mock-provider/nem/products
 *
 * Update seed_providers.sql api_base_url to:
 *   https://coverai-platform.vercel.app/api/mock-provider/leadway
 *   etc.
 */

import { NextRequest, NextResponse } from 'next/server'

const PRODUCTS: Record<string, any[]> = {
  leadway: [
    {
      code: 'LW-SME-SHIELD-001',
      name: 'SME Business Shield',
      category: 'business',
      description: 'All-in-one coverage for small businesses. Protects against fire, burglary, employer liability, and public liability.',
      premium_min: 45000,
      premium_max: 350000,
      commission_rate: 0.12,
      duration_months: 12,
      coverage_details: { fire: true, burglary: true, employer_liability: true, public_liability: true, business_interruption: false },
    },
    {
      code: 'LW-MOTOR-COMP-001',
      name: 'Comprehensive Motor Cover',
      category: 'motor',
      description: 'Full protection for commercial vehicles including accidental damage, theft, and third-party liability.',
      premium_min: 80000,
      premium_max: 600000,
      commission_rate: 0.10,
      duration_months: 12,
      coverage_details: { accidental_damage: true, theft: true, third_party: true, fire: true, flood: true },
    },
    {
      code: 'LW-GROUP-LIFE-001',
      name: 'Group Life Assurance',
      category: 'life',
      description: 'Employer-sponsored group life cover. Provides death benefit equal to 3x annual salary.',
      premium_min: 25000,
      premium_max: 1200000,
      commission_rate: 0.08,
      duration_months: 12,
      coverage_details: { death_benefit: true, permanent_disability: true, critical_illness: false },
    },
    {
      code: 'LW-HEALTH-SME-001',
      name: 'SME Health Insurance',
      category: 'health',
      description: 'Comprehensive HMO plan for SME staff. Covers outpatient, inpatient, maternity, and dental.',
      premium_min: 60000,
      premium_max: 480000,
      commission_rate: 0.10,
      duration_months: 12,
      coverage_details: { outpatient: true, inpatient: true, maternity: true, dental: true, optical: false },
    },
  ],

  axa: [
    {
      code: 'AXA-BIZ-PROTECT-001',
      name: 'Business Protector Plus',
      category: 'business',
      description: 'Premium SME insurance combining property, liability, and cyber cover in one policy.',
      premium_min: 75000,
      premium_max: 800000,
      commission_rate: 0.12,
      duration_months: 12,
      coverage_details: { property: true, public_liability: true, cyber: true, business_interruption: true },
    },
    {
      code: 'AXA-CYBER-001',
      name: 'Cyber Risk Insurance',
      category: 'cyber',
      description: 'Covers financial losses from cyberattacks, data breaches, ransomware, and business interruption.',
      premium_min: 120000,
      premium_max: 2000000,
      commission_rate: 0.15,
      duration_months: 12,
      coverage_details: { data_breach: true, ransomware: true, social_engineering: true, business_interruption: true },
    },
    {
      code: 'AXA-TRADE-CREDIT-001',
      name: 'Trade Credit Insurance',
      category: 'business',
      description: 'Protects businesses against the risk of non-payment from customers. Ideal for B2B companies.',
      premium_min: 200000,
      premium_max: 5000000,
      commission_rate: 0.10,
      duration_months: 12,
      coverage_details: { domestic_buyers: true, export_buyers: false, political_risk: false },
    },
    {
      code: 'AXA-PROP-ALL-RISK-001',
      name: 'Property All Risks',
      category: 'property',
      description: 'Broad coverage for commercial property against all physical loss or damage.',
      premium_min: 55000,
      premium_max: 3000000,
      commission_rate: 0.10,
      duration_months: 12,
      coverage_details: { fire: true, flood: true, subsidence: true, accidental_damage: true, malicious_damage: true },
    },
  ],

  coronation: [
    {
      code: 'COR-STARTUP-001',
      name: 'Startup Business Cover',
      category: 'business',
      description: 'Tailored insurance package for tech startups and early-stage companies. Low entry premium.',
      premium_min: 18000,
      premium_max: 150000,
      commission_rate: 0.13,
      duration_months: 12,
      coverage_details: { public_liability: true, employer_liability: true, office_contents: true, cyber: false },
    },
    {
      code: 'COR-RETAIL-001',
      name: 'Retail Business Insurance',
      category: 'business',
      description: 'Designed for shops, supermarkets and retail outlets. Covers stock, equipment, and cash.',
      premium_min: 35000,
      premium_max: 280000,
      commission_rate: 0.12,
      duration_months: 12,
      coverage_details: { stock: true, equipment: true, cash: true, burglary: true, fire: true },
    },
    {
      code: 'COR-AGRIC-001',
      name: 'Agricultural Business Cover',
      category: 'agriculture',
      description: 'Protects farming businesses against crop failure, livestock loss, and farm equipment breakdown.',
      premium_min: 40000,
      premium_max: 500000,
      commission_rate: 0.12,
      duration_months: 12,
      coverage_details: { crop: true, livestock: true, equipment: true, weather: true },
    },
    {
      code: 'COR-TRAVEL-BIZ-001',
      name: 'Business Travel Insurance',
      category: 'travel',
      description: 'Annual multi-trip cover for business travellers. Includes medical, trip cancellation, and loss of docs.',
      premium_min: 22000,
      premium_max: 180000,
      commission_rate: 0.11,
      duration_months: 12,
      coverage_details: { medical: true, evacuation: true, trip_cancellation: true, lost_documents: true, baggage: true },
    },
  ],

  nem: [
    {
      code: 'NEM-FIRE-SPEC-001',
      name: 'Fire & Special Perils',
      category: 'property',
      description: 'Covers buildings and contents against fire, lightning, explosion, and related perils.',
      premium_min: 30000,
      premium_max: 4000000,
      commission_rate: 0.10,
      duration_months: 12,
      coverage_details: { fire: true, lightning: true, explosion: true, aircraft: true, storm: true },
    },
    {
      code: 'NEM-BURGLARY-001',
      name: 'Burglary & Theft Cover',
      category: 'business',
      description: 'Indemnifies loss of or damage to contents and stock caused by burglary, housebreaking, or robbery.',
      premium_min: 20000,
      premium_max: 600000,
      commission_rate: 0.11,
      duration_months: 12,
      coverage_details: { burglary: true, robbery: true, cash_in_safe: true, cash_in_transit: false },
    },
    {
      code: 'NEM-PUBLIC-LIA-001',
      name: 'Public Liability Insurance',
      category: 'liability',
      description: 'Protects businesses from third-party claims for bodily injury or property damage.',
      premium_min: 25000,
      premium_max: 750000,
      commission_rate: 0.10,
      duration_months: 12,
      coverage_details: { bodily_injury: true, property_damage: true, products_liability: true, legal_costs: true },
    },
    {
      code: 'NEM-ENGINEERING-001',
      name: 'Contractor All Risks',
      category: 'business',
      description: 'Covers construction projects against accidental damage, third party liability, and plant breakdown.',
      premium_min: 100000,
      premium_max: 8000000,
      commission_rate: 0.10,
      duration_months: 24,
      coverage_details: { contract_works: true, third_party: true, plant_equipment: true, existing_structures: false },
    },
    {
      code: 'NEM-WORKMEN-001',
      name: "Workmen's Compensation",
      category: 'liability',
      description: 'Statutory cover for employees against injury, illness, or death arising from employment.',
      premium_min: 15000,
      premium_max: 400000,
      commission_rate: 0.10,
      duration_months: 12,
      coverage_details: { medical_expenses: true, death_benefit: true, permanent_disability: true, temporary_disability: true },
    },
  ],
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const products = PRODUCTS[params.slug]
  if (!products) {
    return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
  }
  // Simulate slight delay like a real API
  await new Promise(r => setTimeout(r, 200))
  return NextResponse.json(products)
}
