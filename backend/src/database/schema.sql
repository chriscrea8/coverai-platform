-- ============================================================
-- CoverAI InsurTech Platform - PostgreSQL Schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── ENUMS ────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM ('consumer', 'sme_owner', 'insurance_partner', 'admin');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'pending_verification');
CREATE TYPE policy_status AS ENUM ('active', 'expired', 'cancelled', 'pending', 'lapsed');
CREATE TYPE claim_status AS ENUM ('submitted', 'under_review', 'approved', 'rejected', 'paid');
CREATE TYPE payment_status AS ENUM ('pending', 'successful', 'failed', 'refunded');
CREATE TYPE commission_status AS ENUM ('pending', 'processing', 'paid', 'disputed');
CREATE TYPE provider_status AS ENUM ('active', 'inactive', 'pending_review');
CREATE TYPE product_status AS ENUM ('active', 'inactive', 'draft');
CREATE TYPE notification_type AS ENUM ('email', 'sms', 'push');
CREATE TYPE partner_status AS ENUM ('active', 'inactive', 'suspended');

-- ── USERS ────────────────────────────────────────────────────

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'consumer',
    status user_status NOT NULL DEFAULT 'active',
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    avatar_url TEXT,
    refresh_token_hash VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMPTZ,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── SME PROFILES ─────────────────────────────────────────────

CREATE TABLE sme_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_name VARCHAR(255) NOT NULL,
    industry VARCHAR(100) NOT NULL,
    location VARCHAR(255) NOT NULL,
    state VARCHAR(100),
    registration_number VARCHAR(100) UNIQUE,
    business_size VARCHAR(50),
    annual_revenue DECIMAL(15,2),
    employee_count INTEGER,
    description TEXT,
    logo_url TEXT,
    website VARCHAR(255),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── INSURANCE PROVIDERS ──────────────────────────────────────

CREATE TABLE insurance_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    api_base_url TEXT,
    api_key_encrypted TEXT,
    api_secret_encrypted TEXT,
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(20),
    logo_url TEXT,
    description TEXT,
    naicom_license VARCHAR(100),
    status provider_status NOT NULL DEFAULT 'pending_review',
    supported_currencies TEXT[] DEFAULT ARRAY['NGN'],
    webhook_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── INSURANCE PRODUCTS ───────────────────────────────────────

CREATE TABLE insurance_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES insurance_providers(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    product_code VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    coverage_details JSONB NOT NULL DEFAULT '{}',
    premium_min DECIMAL(12,2),
    premium_max DECIMAL(12,2),
    commission_rate DECIMAL(5,4) NOT NULL DEFAULT 0.10,
    eligibility_rules JSONB DEFAULT '{}',
    required_documents TEXT[] DEFAULT ARRAY[]::TEXT[],
    duration_months INTEGER DEFAULT 12,
    is_sme_product BOOLEAN DEFAULT FALSE,
    status product_status NOT NULL DEFAULT 'draft',
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── POLICIES ─────────────────────────────────────────────────

CREATE TABLE policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    sme_id UUID REFERENCES sme_profiles(id) ON DELETE SET NULL,
    product_id UUID NOT NULL REFERENCES insurance_products(id) ON DELETE RESTRICT,
    provider_id UUID NOT NULL REFERENCES insurance_providers(id) ON DELETE RESTRICT,
    premium_amount DECIMAL(12,2) NOT NULL,
    commission_amount DECIMAL(12,2) NOT NULL,
    coverage_amount DECIMAL(15,2),
    policy_status policy_status NOT NULL DEFAULT 'pending',
    start_date DATE,
    end_date DATE,
    document_url TEXT,
    provider_policy_id VARCHAR(255),
    provider_response JSONB DEFAULT '{}',
    policy_details JSONB DEFAULT '{}',
    auto_renew BOOLEAN DEFAULT FALSE,
    renewal_reminder_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── PAYMENTS ─────────────────────────────────────────────────

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    policy_id UUID REFERENCES policies(id) ON DELETE SET NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'NGN',
    payment_status payment_status NOT NULL DEFAULT 'pending',
    payment_reference VARCHAR(255) UNIQUE NOT NULL,
    gateway VARCHAR(50) NOT NULL DEFAULT 'paystack',
    gateway_reference VARCHAR(255),
    gateway_response JSONB DEFAULT '{}',
    paid_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── COMMISSIONS ──────────────────────────────────────────────

CREATE TABLE commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE RESTRICT,
    provider_id UUID NOT NULL REFERENCES insurance_providers(id) ON DELETE RESTRICT,
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    gross_premium DECIMAL(12,2) NOT NULL,
    commission_rate DECIMAL(5,4) NOT NULL,
    commission_amount DECIMAL(12,2) NOT NULL,
    platform_fee DECIMAL(12,2) DEFAULT 0,
    net_commission DECIMAL(12,2),
    status commission_status NOT NULL DEFAULT 'pending',
    paid_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── CLAIMS ───────────────────────────────────────────────────

CREATE TABLE claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_number VARCHAR(50) UNIQUE NOT NULL,
    policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    claim_amount DECIMAL(12,2) NOT NULL,
    approved_amount DECIMAL(12,2),
    description TEXT NOT NULL,
    incident_date DATE NOT NULL,
    incident_location VARCHAR(255),
    status claim_status NOT NULL DEFAULT 'submitted',
    evidence_files TEXT[] DEFAULT ARRAY[]::TEXT[],
    provider_claim_id VARCHAR(255),
    reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewer_notes TEXT,
    rejection_reason TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── FILES ────────────────────────────────────────────────────

CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entity_type VARCHAR(50),
    entity_id UUID,
    file_key VARCHAR(500) NOT NULL,
    file_url TEXT NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size BIGINT,
    is_public BOOLEAN DEFAULT FALSE,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── CHAT LOGS ────────────────────────────────────────────────

CREATE TABLE chat_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    message TEXT NOT NULL,
    tokens_used INTEGER,
    model_used VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── NOTIFICATIONS ────────────────────────────────────────────

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'read')),
    entity_type VARCHAR(50),
    entity_id UUID,
    metadata JSONB DEFAULT '{}',
    sent_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── PARTNERS ─────────────────────────────────────────────────

CREATE TABLE partners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    api_key VARCHAR(255) UNIQUE NOT NULL,
    api_secret VARCHAR(255) NOT NULL,
    status partner_status NOT NULL DEFAULT 'active',
    allowed_ips TEXT[] DEFAULT ARRAY[]::TEXT[],
    webhook_url TEXT,
    permissions TEXT[] DEFAULT ARRAY['create_policy', 'read_policy', 'create_claim']::TEXT[],
    request_count BIGINT DEFAULT 0,
    last_request_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── INDEXES ──────────────────────────────────────────────────

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_sme_owner ON sme_profiles(owner_id);
CREATE INDEX idx_policies_user ON policies(user_id);
CREATE INDEX idx_policies_status ON policies(policy_status);
CREATE INDEX idx_policies_end_date ON policies(end_date);
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_reference ON payments(payment_reference);
CREATE INDEX idx_claims_user ON claims(user_id);
CREATE INDEX idx_claims_policy ON claims(policy_id);
CREATE INDEX idx_claims_status ON claims(status);
CREATE INDEX idx_commissions_policy ON commissions(policy_id);
CREATE INDEX idx_commissions_status ON commissions(status);
CREATE INDEX idx_chat_logs_user ON chat_logs(user_id);
CREATE INDEX idx_chat_logs_session ON chat_logs(session_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_files_entity ON files(entity_type, entity_id);

-- ── UPDATED_AT TRIGGER ───────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sme_updated_at BEFORE UPDATE ON sme_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_providers_updated_at BEFORE UPDATE ON insurance_providers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON insurance_products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_policies_updated_at BEFORE UPDATE ON policies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_commissions_updated_at BEFORE UPDATE ON commissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_claims_updated_at BEFORE UPDATE ON claims FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_partners_updated_at BEFORE UPDATE ON partners FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── MIGRATION v002 ADDITIONS ─────────────────────────────────
-- Applied: email OTP, KYC, extended profile, processing fees,
-- leads, recommendation context. See migration_v002.sql for ALTERs.

-- ── PROCESSING FEES ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS processing_fees (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    policy_id       UUID REFERENCES policies(id) ON DELETE SET NULL,
    payment_id      UUID REFERENCES payments(id) ON DELETE SET NULL,
    fee_type        VARCHAR(50)  NOT NULL DEFAULT 'ai_recommendation',
    amount          DECIMAL(10,2) NOT NULL,
    currency        CHAR(3)      NOT NULL DEFAULT 'NGN',
    status          VARCHAR(20)  NOT NULL DEFAULT 'pending',
    description     TEXT,
    collected_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── LEADS ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS leads (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    product_id      UUID REFERENCES insurance_products(id) ON DELETE SET NULL,
    provider_id     UUID REFERENCES insurance_providers(id) ON DELETE SET NULL,
    lead_type       VARCHAR(50)  NOT NULL DEFAULT 'complex_policy',
    estimated_value DECIMAL(15,2),
    status          VARCHAR(20)  NOT NULL DEFAULT 'new',
    ai_score        INTEGER,
    ai_reason       TEXT,
    referral_fee    DECIMAL(10,2),
    referral_paid   BOOLEAN      NOT NULL DEFAULT FALSE,
    notes           TEXT,
    contacted_at    TIMESTAMPTZ,
    converted_at    TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ  DEFAULT NOW() + INTERVAL '30 days',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── USER RECOMMENDATION CONTEXT ──────────────────────────────

CREATE TABLE IF NOT EXISTS user_recommendation_context (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    industry         VARCHAR(100),
    has_vehicle      BOOLEAN  DEFAULT FALSE,
    has_property     BOOLEAN  DEFAULT FALSE,
    employee_count   INTEGER,
    annual_revenue   DECIMAL(15,2),
    asset_value      DECIMAL(15,2),
    preferred_cover  TEXT[],
    raw_context      JSONB    DEFAULT '{}',
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
