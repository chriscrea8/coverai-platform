-- ============================================================
-- CoverAI — Fake Provider Seed Data (for testing)
-- Run in Neon SQL Editor
-- Includes 5 providers with API keys + their products
-- ============================================================

-- ── 1. PROVIDERS ────────────────────────────────────────────

INSERT INTO insurance_providers (
  id, name, slug, api_base_url, api_key_encrypted,
  contact_email, contact_phone, description, naicom_license,
  status, sync_status, synced_product_count
) VALUES
(
  'a1b2c3d4-0001-0001-0001-000000000001',
  'Leadway Assurance',
  'leadway-assurance',
  'https://coverai-platform.vercel.app/api/mock-provider/leadway',
  'lw_live_test_key_abc123xyz',
  'partnerships@leadway.com', '+234 1 271 0000',
  'Nigeria''s leading composite insurer offering life, general, and health insurance products.',
  'NAICOM/INS/LW/2024/001',
  'active', 'idle', 0
),
(
  'a1b2c3d4-0002-0002-0002-000000000002',
  'AXA Mansard Insurance',
  'axa-mansard',
  'https://coverai-platform.vercel.app/api/mock-provider/axa',
  'axa_live_test_key_def456uvw',
  'corporate@axamansard.com', '+234 1 279 0000',
  'Pan-African insurance group offering innovative SME and corporate insurance solutions.',
  'NAICOM/INS/AXA/2024/002',
  'active', 'idle', 0
),
(
  'a1b2c3d4-0003-0003-0003-000000000003',
  'Coronation Insurance',
  'coronation-insurance',
  'https://coverai-platform.vercel.app/api/mock-provider/coronation',
  'cor_live_test_key_ghi789rst',
  'info@coronationinsurance.com.ng', '+234 1 461 0000',
  'Technology-driven insurer focused on accessible business insurance for growing companies.',
  'NAICOM/INS/COR/2024/003',
  'active', 'idle', 0
),
(
  'a1b2c3d4-0004-0004-0004-000000000004',
  'NEM Insurance',
  'nem-insurance',
  'https://coverai-platform.vercel.app/api/mock-provider/nem',
  'nem_live_test_key_jkl012mno',
  'corporate@neminsurance.net', '+234 1 263 0000',
  'Over 50 years of experience providing comprehensive general insurance solutions in Nigeria.',
  'NAICOM/INS/NEM/2024/004',
  'active', 'idle', 0
),
(
  'a1b2c3d4-0005-0005-0005-000000000005',
  'Sovereign Trust Insurance',
  'sovereign-trust',
  NULL,
  NULL,
  'info@sovereigntrust.com.ng', '+234 1 774 0000',
  'Specialist insurer with deep expertise in marine, aviation, and oil & gas coverage.',
  'NAICOM/INS/SOV/2024/005',
  'active', NULL, 0
)
ON CONFLICT (slug) DO NOTHING;


-- ── 2. PRODUCTS (manually seeded for Sovereign Trust which has no API) ──────

INSERT INTO insurance_products (
  provider_id, product_name, product_code, category, description,
  premium_min, premium_max, commission_rate, duration_months,
  coverage_details, is_sme_product, status
) VALUES
(
  'a1b2c3d4-0005-0005-0005-000000000005',
  'Marine Cargo Cover',
  'SOV-MARINE-001',
  'marine',
  'Comprehensive cover for goods in transit by sea, air, or road. Protects against loss, damage, and theft.',
  150000, 2000000, 0.12, 12,
  '{"sea": true, "air": true, "road": true, "all_risks": true, "war_risk": false}',
  true, 'active'
),
(
  'a1b2c3d4-0005-0005-0005-000000000005',
  'Oil & Gas Liability',
  'SOV-OIL-001',
  'liability',
  'Specialist third-party liability cover for upstream and downstream oil & gas operations.',
  500000, 10000000, 0.10, 12,
  '{"third_party_liability": true, "environmental": true, "workers_comp": true}',
  false, 'active'
)
ON CONFLICT (product_code) DO NOTHING;


-- ── 3. VERIFY ───────────────────────────────────────────────

SELECT name, slug, status,
       CASE WHEN api_key_encrypted IS NOT NULL THEN '✓ API key set' ELSE '— No API' END AS api_status
FROM insurance_providers
WHERE id LIKE 'a1b2c3d4%'
ORDER BY name;
