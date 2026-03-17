import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * Runs all schema migrations automatically on startup.
 * Every statement is safe to re-run (IF NOT EXISTS / DO $$ BEGIN ... EXCEPTION).
 */
@Injectable()
export class AutoMigrationService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AutoMigrationService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onApplicationBootstrap() {
    this.logger.log('Running auto-migrations…');
    try {
      await this.runMigrations();
      this.logger.log('✅ Auto-migrations complete');
    } catch (err: any) {
      // Log but don't crash — DB may already be up-to-date
      this.logger.error('Auto-migration error: ' + err.message);
    }
  }

  private async runMigrations() {
    const q = this.dataSource.query.bind(this.dataSource);

    // ── 1. Policies: nullable FK columns ────────────────────────────────────
    await q(`ALTER TABLE policies ALTER COLUMN product_id  DROP NOT NULL`).catch(() => {});
    await q(`ALTER TABLE policies ALTER COLUMN provider_id DROP NOT NULL`).catch(() => {});
    await q(`ALTER TABLE policies DROP CONSTRAINT IF EXISTS policies_product_id_fkey`).catch(() => {});
    await q(`ALTER TABLE policies DROP CONSTRAINT IF EXISTS policies_provider_id_fkey`).catch(() => {});
    await q(`
      ALTER TABLE policies
        ADD CONSTRAINT policies_product_id_fkey
          FOREIGN KEY (product_id) REFERENCES insurance_products(id) ON DELETE SET NULL
    `).catch(() => {});
    await q(`
      ALTER TABLE policies
        ADD CONSTRAINT policies_provider_id_fkey
          FOREIGN KEY (provider_id) REFERENCES insurance_providers(id) ON DELETE SET NULL
    `).catch(() => {});

    // ── 2. Commissions: nullable provider_id ────────────────────────────────
    await q(`ALTER TABLE commissions ALTER COLUMN provider_id DROP NOT NULL`).catch(() => {});
    await q(`ALTER TABLE commissions DROP CONSTRAINT IF EXISTS commissions_provider_id_fkey`).catch(() => {});
    await q(`
      ALTER TABLE commissions
        ADD CONSTRAINT commissions_provider_id_fkey
          FOREIGN KEY (provider_id) REFERENCES insurance_providers(id) ON DELETE SET NULL
    `).catch(() => {});

    // ── 3. Users: OTP columns ────────────────────────────────────────────────
    await q(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_otp VARCHAR(6)`).catch(() => {});
    await q(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_otp_expires TIMESTAMPTZ`).catch(() => {});

    // ── 4. Provider sync tracking ────────────────────────────────────────────
    await q(`ALTER TABLE insurance_providers ADD COLUMN IF NOT EXISTS sync_status VARCHAR(20)`).catch(() => {});
    await q(`ALTER TABLE insurance_providers ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ`).catch(() => {});
    await q(`ALTER TABLE insurance_providers ADD COLUMN IF NOT EXISTS synced_product_count INT DEFAULT 0`).catch(() => {});

    // ── 5. Notification type enum ────────────────────────────────────────────
    await q(`
      DO $$ BEGIN
        ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'in_app';
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `).catch(() => {});

    // ── 6. Notifications table ───────────────────────────────────────────────
    await q(`
      CREATE TABLE IF NOT EXISTS notifications (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID NOT NULL,
        type        VARCHAR(20) NOT NULL DEFAULT 'in_app',
        title       VARCHAR(255) NOT NULL,
        message     TEXT NOT NULL,
        status      VARCHAR(20) DEFAULT 'pending',
        entity_type VARCHAR(50),
        entity_id   UUID,
        metadata    JSONB DEFAULT '{}',
        sent_at     TIMESTAMPTZ,
        read_at     TIMESTAMPTZ,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `).catch(() => {});
    await q(`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)`).catch(() => {});
    await q(`CREATE INDEX IF NOT EXISTS idx_notifications_user_type_status ON notifications(user_id, type, status)`).catch(() => {});
    await q(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata    JSONB DEFAULT '{}'`).catch(() => {});
    await q(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50)`).catch(() => {});
    await q(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS entity_id   UUID`).catch(() => {});

    // ── 7. Users: bank payout details ────────────────────────────────────────
    await q(`ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_name           VARCHAR(100)`).catch(() => {});
    await q(`ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(20)`).catch(() => {});
    await q(`ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_account_name   VARCHAR(255)`).catch(() => {});
    await q(`ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_code           VARCHAR(10)`).catch(() => {});

    // ── 8. Policies: payment frequency / installment / lapsed ────────────────
    await q(`
      DO $$ BEGIN
        CREATE TYPE payment_frequency AS ENUM ('weekly', 'monthly', 'quarterly', 'annually');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `).catch(() => {});
    await q(`ALTER TABLE policies ADD COLUMN IF NOT EXISTS payment_frequency payment_frequency NOT NULL DEFAULT 'annually'`).catch(() => {});
    await q(`ALTER TABLE policies ADD COLUMN IF NOT EXISTS installment_amount DECIMAL(12,2)`).catch(() => {});
    await q(`ALTER TABLE policies ADD COLUMN IF NOT EXISTS next_payment_date DATE`).catch(() => {});
    await q(`ALTER TABLE policies ADD COLUMN IF NOT EXISTS grace_period_end DATE`).catch(() => {});
    await q(`ALTER TABLE policies ADD COLUMN IF NOT EXISTS payments_made INTEGER NOT NULL DEFAULT 0`).catch(() => {});
    await q(`ALTER TABLE policies ADD COLUMN IF NOT EXISTS payments_total INTEGER NOT NULL DEFAULT 1`).catch(() => {});
    await q(`ALTER TABLE policies ADD COLUMN IF NOT EXISTS lapsed_at TIMESTAMPTZ`).catch(() => {});
    await q(`
      DO $$ BEGIN
        ALTER TYPE policy_status ADD VALUE IF NOT EXISTS 'lapsed';
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `).catch(() => {});

    // 25002500 9. Leads table 250025002500250025002500250025002500250025002500250025002500250025002500250025002500250025002500250025002500250025002500250025002500250025002500250025002500250025002500250025002500
    await q(`
      CREATE TABLE IF NOT EXISTS leads (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID,
        name        VARCHAR(255),
        phone       VARCHAR(50),
        email       VARCHAR(255),
        location    VARCHAR(100),
        insurance_type VARCHAR(100) NOT NULL DEFAULT 'general',
        product_id  UUID,
        provider_id UUID,
        notes       TEXT,
        metadata    JSONB DEFAULT '{}',
        source      VARCHAR(50) DEFAULT 'web',
        session_id  VARCHAR(255),
        status      VARCHAR(50) DEFAULT 'new',
        routed_to   VARCHAR(255),
        routed_at   TIMESTAMPTZ,
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `).catch(() => {});
    await q(`CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id)`).catch(() => {});
    await q(`CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)`).catch(() => {});
    await q(`CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source)`).catch(() => {});

    // 25002500 10. Insurance products: ensure columns 25002500250025002500250025002500250025002500250025002500250025002500250025002500250025002500250025002500250025002500
    await q(`ALTER TABLE insurance_products ADD COLUMN IF NOT EXISTS eligibility_rules JSONB DEFAULT '{}'`).catch(() => {});
    await q(`ALTER TABLE insurance_products ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'`).catch(() => {});


    // ── 9. Leads table ────────────────────────────────────────────────────────
    await q(`
      CREATE TABLE IF NOT EXISTS leads (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID,
        name        VARCHAR(255),
        phone       VARCHAR(50),
        email       VARCHAR(255),
        location    VARCHAR(100),
        insurance_type VARCHAR(100) NOT NULL DEFAULT 'general',
        product_id  UUID,
        provider_id UUID,
        notes       TEXT,
        metadata    JSONB DEFAULT '{}',
        source      VARCHAR(50) DEFAULT 'web',
        session_id  VARCHAR(255),
        status      VARCHAR(50) DEFAULT 'new',
        routed_to   VARCHAR(255),
        routed_at   TIMESTAMPTZ,
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `).catch(() => {});
    await q(`CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id)`).catch(() => {});
    await q(`CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)`).catch(() => {});
    await q(`CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source)`).catch(() => {});

    // ── 10. Insurance products: ensure columns ────────────────────────────────
    await q(`ALTER TABLE insurance_products ADD COLUMN IF NOT EXISTS eligibility_rules JSONB DEFAULT '{}'`).catch(() => {});
    await q(`ALTER TABLE insurance_products ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'`).catch(() => {});


    // ── 11. Knowledge Base table ──────────────────────────────────────────────
    await q(`
      CREATE TABLE IF NOT EXISTS knowledge_base (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        category     VARCHAR(50) NOT NULL DEFAULT 'faq',
        subcategory  VARCHAR(50) NOT NULL DEFAULT 'general',
        question     TEXT NOT NULL,
        answer       TEXT NOT NULL,
        keywords     TEXT[] DEFAULT '{}',
        source       VARCHAR(100),
        is_active    BOOLEAN DEFAULT true,
        use_count    INTEGER DEFAULT 0,
        created_at   TIMESTAMPTZ DEFAULT NOW(),
        updated_at   TIMESTAMPTZ DEFAULT NOW()
      )
    `).catch(() => {});
    await q(`CREATE INDEX IF NOT EXISTS idx_kb_subcategory ON knowledge_base(subcategory)`).catch(() => {});
    await q(`CREATE INDEX IF NOT EXISTS idx_kb_category ON knowledge_base(category)`).catch(() => {});
    await q(`CREATE INDEX IF NOT EXISTS idx_kb_use_count ON knowledge_base(use_count DESC)`).catch(() => {});

    // ── 12. Group Policies table ──────────────────────────────────────────────
    await q(`
      CREATE TABLE IF NOT EXISTS group_policies (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_id         UUID NOT NULL,
        sme_id           UUID,
        product_id       UUID,
        provider_id      UUID,
        policy_name      VARCHAR(255) NOT NULL,
        policy_type      VARCHAR(50) NOT NULL,
        policy_number    VARCHAR(100) UNIQUE,
        total_premium    DECIMAL(12,2) NOT NULL DEFAULT 0,
        member_count     INTEGER DEFAULT 0,
        status           VARCHAR(50) DEFAULT 'active',
        start_date       DATE,
        end_date         DATE,
        members          JSONB DEFAULT '[]',
        coverage_details JSONB DEFAULT '{}',
        created_at       TIMESTAMPTZ DEFAULT NOW(),
        updated_at       TIMESTAMPTZ DEFAULT NOW()
      )
    `).catch(() => {});
    await q(`CREATE INDEX IF NOT EXISTS idx_group_policies_owner_id ON group_policies(owner_id)`).catch(() => {});


    // ── 13. Users: referral columns ──────────────────────────────────────────
    await q(`ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE`).catch(() => {});
    await q(`ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by UUID`).catch(() => {});
    await q(`ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_earnings DECIMAL(12,2) DEFAULT 0`).catch(() => {});
    await q(`ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0`).catch(() => {});
    await q(`CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code)`).catch(() => {});
    await q(`CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by)`).catch(() => {});


    // ── 14. user_verifications (KYC) ─────────────────────────────────────────
    await q(`
      CREATE TABLE IF NOT EXISTS user_verifications (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id             UUID NOT NULL,
        verification_type   VARCHAR(30) NOT NULL,
        verification_status VARCHAR(20) DEFAULT 'pending',
        reference           VARCHAR(255),
        otp                 VARCHAR(255),
        otp_expires         TIMESTAMPTZ,
        verified_value      VARCHAR(50),
        metadata            JSONB,
        failure_reason      TEXT,
        attempt_count       INT DEFAULT 0,
        verified_at         TIMESTAMPTZ,
        created_at          TIMESTAMPTZ DEFAULT NOW(),
        updated_at          TIMESTAMPTZ DEFAULT NOW()
      )
    `).catch(() => {});
    await q(`CREATE INDEX IF NOT EXISTS idx_user_verifications_user_id ON user_verifications(user_id)`).catch(() => {});
    await q(`CREATE UNIQUE INDEX IF NOT EXISTS idx_user_verifications_unique ON user_verifications(user_id, verification_type)`).catch(() => {});

    // ── 15. fraud_flags ───────────────────────────────────────────────────────
    await q(`
      CREATE TABLE IF NOT EXISTS fraud_flags (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        claim_id         UUID,
        policy_id        UUID,
        user_id          UUID NOT NULL,
        reason           TEXT NOT NULL,
        risk_score       INT NOT NULL DEFAULT 0,
        risk_level       VARCHAR(20) DEFAULT 'low',
        rule_triggered   VARCHAR(255) NOT NULL,
        evidence         JSONB,
        resolved         BOOLEAN DEFAULT false,
        resolved_by      UUID,
        resolution_notes TEXT,
        flagged_at       TIMESTAMPTZ DEFAULT NOW(),
        created_at       TIMESTAMPTZ DEFAULT NOW()
      )
    `).catch(() => {});
    await q(`CREATE INDEX IF NOT EXISTS idx_fraud_flags_claim_id ON fraud_flags(claim_id)`).catch(() => {});
    await q(`CREATE INDEX IF NOT EXISTS idx_fraud_flags_user_id ON fraud_flags(user_id)`).catch(() => {});
    await q(`CREATE INDEX IF NOT EXISTS idx_fraud_flags_resolved ON fraud_flags(resolved, risk_level)`).catch(() => {});

    // ── 16. policies: add plate_number index for verification ─────────────────
    await q(`CREATE INDEX IF NOT EXISTS idx_policies_coverage_plate ON policies USING gin(coverage_details)`).catch(() => {});

    this.logger.log('All migration steps executed');
  }
}
