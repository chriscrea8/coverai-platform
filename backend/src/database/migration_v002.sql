-- ============================================================
-- CoverAI InsurTech Platform — Migration v002
-- Covers all schema gaps discovered by code/entity audit
-- Run this against your Neon DB after deploying backend changes
-- Safe to run: all statements use IF NOT EXISTS / DO $$ guards
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. USERS TABLE
--    Missing: email OTP, KYC fields, extended profile fields
-- ────────────────────────────────────────────────────────────

-- Email OTP verification (used by auth.service.ts)
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_otp  VARCHAR(6);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_otp_expires        TIMESTAMPTZ;

-- Extended profile (used by users.service.ts / settings page)
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth            DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address                  TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS city                     VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS state                    VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS nationality              VARCHAR(100) DEFAULT 'Nigerian';

-- KYC fields (used by users.service.ts submitKyc)
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_status               VARCHAR(20)  NOT NULL DEFAULT 'not_started';
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_id_type              VARCHAR(30);
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_id_number            VARCHAR(100); -- stored masked e.g. *******7890
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_document_url         TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_selfie_url           TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_submitted_at         TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_verified_at          TIMESTAMPTZ;

-- Index on KYC status for admin filtering
CREATE INDEX IF NOT EXISTS idx_users_kyc_status ON users(kyc_status);
-- Index for OTP lookups (rare but good to have)
CREATE INDEX IF NOT EXISTS idx_users_otp_expires ON users(email_otp_expires) WHERE email_otp_expires IS NOT NULL;

-- ────────────────────────────────────────────────────────────
-- 2. INSURANCE PROVIDERS TABLE
--    Missing: address column (used in admin create/update)
-- ────────────────────────────────────────────────────────────

ALTER TABLE insurance_providers ADD COLUMN IF NOT EXISTS address TEXT;

-- ────────────────────────────────────────────────────────────
-- 3. INSURANCE PRODUCTS TABLE
--    Schema has required_documents TEXT[]; entity doesn't use it
--    but it should exist. Already in schema so just a guard.
-- ────────────────────────────────────────────────────────────
-- No changes needed — schema and entity are aligned.

-- ────────────────────────────────────────────────────────────
-- 4. POLICIES TABLE
--    provider_policy_id and renewal_reminder_sent are in schema
--    but NOT in the entity — they're only used at DB level.
--    No action needed. Already in schema.
-- ────────────────────────────────────────────────────────────
-- No changes needed.

-- ────────────────────────────────────────────────────────────
-- 5. SME PROFILES TABLE
--    Schema has annual_revenue, logo_url, website
--    Entity is missing these. Add them to schema (already there)
--    and to entity for future use. No migration needed on schema.
--    NOTE: entity gaps (logo_url, annual_revenue, website) are
--    in the schema already — they just aren't mapped in the
--    TypeORM entity. Safe as-is; TypeORM won't drop them.
-- ────────────────────────────────────────────────────────────
-- No changes needed.

-- ────────────────────────────────────────────────────────────
-- 6. PAYMENTS TABLE
--    No gaps found between entity and schema.
-- ────────────────────────────────────────────────────────────
-- No changes needed.

-- ────────────────────────────────────────────────────────────
-- 7. COMMISSIONS TABLE
--    commission_status enum in schema includes 'disputed'
--    but entity uses plain VARCHAR default — no conflict.
-- ────────────────────────────────────────────────────────────
-- No changes needed.

-- ────────────────────────────────────────────────────────────
-- 8. NEW: PROCESSING FEES TABLE
--    Tracks the platform convenience/AI service fee per policy
--    purchase. Supports the monetisation model in recommendations.
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS processing_fees (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    policy_id       UUID REFERENCES policies(id) ON DELETE SET NULL,
    payment_id      UUID REFERENCES payments(id) ON DELETE SET NULL,
    fee_type        VARCHAR(50)  NOT NULL DEFAULT 'ai_recommendation', -- ai_recommendation | risk_assessment | tpa_validation
    amount          DECIMAL(10,2) NOT NULL,
    currency        CHAR(3)      NOT NULL DEFAULT 'NGN',
    status          VARCHAR(20)  NOT NULL DEFAULT 'pending',           -- pending | collected | waived | refunded
    description     TEXT,
    collected_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_processing_fees_user     ON processing_fees(user_id);
CREATE INDEX IF NOT EXISTS idx_processing_fees_policy   ON processing_fees(policy_id);
CREATE INDEX IF NOT EXISTS idx_processing_fees_status   ON processing_fees(status);

CREATE TRIGGER IF NOT EXISTS update_processing_fees_updated_at
    BEFORE UPDATE ON processing_fees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ────────────────────────────────────────────────────────────
-- 9. NEW: LEADS TABLE
--    Tracks high-intent users for potential referral monetisation
--    (AI identifies complex policies → refer to insurer for a fee)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS leads (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    product_id      UUID REFERENCES insurance_products(id) ON DELETE SET NULL,
    provider_id     UUID REFERENCES insurance_providers(id) ON DELETE SET NULL,
    lead_type       VARCHAR(50)  NOT NULL DEFAULT 'complex_policy',  -- complex_policy | high_value | manual_underwriting
    estimated_value DECIMAL(15,2),                                   -- estimated annual premium
    status          VARCHAR(20)  NOT NULL DEFAULT 'new',             -- new | contacted | converted | rejected | expired
    ai_score        INTEGER,                                         -- recommendation engine score 0–100
    ai_reason       TEXT,                                            -- why AI flagged this
    referral_fee    DECIMAL(10,2),                                   -- agreed fee with insurer
    referral_paid   BOOLEAN      NOT NULL DEFAULT FALSE,
    notes           TEXT,
    contacted_at    TIMESTAMPTZ,
    converted_at    TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ  DEFAULT NOW() + INTERVAL '30 days',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_user     ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_status   ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_provider ON leads(provider_id);

CREATE TRIGGER IF NOT EXISTS update_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ────────────────────────────────────────────────────────────
-- 10. NEW: USER RECOMMENDATION CONTEXT TABLE
--     Stores user-provided context for the recommendation engine
--     (industry, vehicle, property, employees, revenue)
--     so we don't re-ask every time and improve accuracy over time
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_recommendation_context (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    industry         VARCHAR(100),
    has_vehicle      BOOLEAN  DEFAULT FALSE,
    has_property     BOOLEAN  DEFAULT FALSE,
    employee_count   INTEGER,
    annual_revenue   DECIMAL(15,2),
    asset_value      DECIMAL(15,2),
    preferred_cover  TEXT[],                                          -- e.g. {'motor','health','fire'}
    raw_context      JSONB    DEFAULT '{}',                          -- flexible extra data
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rec_context_user ON user_recommendation_context(user_id);

-- ────────────────────────────────────────────────────────────
-- 11. UPDATED_AT TRIGGER: extend to new tables
--     (processing_fees and leads already have their own triggers above;
--     user_recommendation_context uses a manual update)
-- ────────────────────────────────────────────────────────────
-- Triggers already created inline above.

-- ────────────────────────────────────────────────────────────
-- 12. SECURITY: index on password_reset_token for fast lookups
--     (was missing — causes a full table scan on reset)
-- ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_users_reset_token
    ON users(password_reset_token)
    WHERE password_reset_token IS NOT NULL;

-- ────────────────────────────────────────────────────────────
-- VERIFICATION QUERIES
-- Run these after applying migration to confirm everything landed
-- ────────────────────────────────────────────────────────────

-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'users'
-- ORDER BY ordinal_position;

-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- ORDER BY table_name;
