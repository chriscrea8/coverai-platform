-- ============================================================
-- CoverAI Migration v003
-- Fixes: 
--   1. policies.product_id / provider_id NOT NULL → nullable
--      (allows purchase of fallback/AI plans with no DB product)
--   2. commissions.provider_id NOT NULL → nullable
--      (commission records for plans without a provider)
--   3. users OTP columns (in case v002 was not run)
-- ============================================================

-- 1. Policies: make product_id and provider_id nullable
ALTER TABLE policies
  ALTER COLUMN product_id DROP NOT NULL,
  ALTER COLUMN provider_id DROP NOT NULL;

-- Also drop the RESTRICT foreign key and replace with SET NULL
-- so orphaned references don't block inserts
ALTER TABLE policies
  DROP CONSTRAINT IF EXISTS policies_product_id_fkey,
  DROP CONSTRAINT IF EXISTS policies_provider_id_fkey;

ALTER TABLE policies
  ADD CONSTRAINT policies_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES insurance_products(id) ON DELETE SET NULL,
  ADD CONSTRAINT policies_provider_id_fkey
    FOREIGN KEY (provider_id) REFERENCES insurance_providers(id) ON DELETE SET NULL;

-- 2. Commissions: make provider_id nullable
ALTER TABLE commissions
  ALTER COLUMN provider_id DROP NOT NULL;

ALTER TABLE commissions
  DROP CONSTRAINT IF EXISTS commissions_provider_id_fkey;

ALTER TABLE commissions
  ADD CONSTRAINT commissions_provider_id_fkey
    FOREIGN KEY (provider_id) REFERENCES insurance_providers(id) ON DELETE SET NULL;

-- 3. Users OTP columns (safe - IF NOT EXISTS)
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_otp VARCHAR(6);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_otp_expires TIMESTAMPTZ;

-- Verify
SELECT 
  column_name, 
  is_nullable, 
  data_type
FROM information_schema.columns
WHERE table_name = 'policies'
  AND column_name IN ('product_id', 'provider_id')
ORDER BY column_name;

-- 4. Provider sync tracking columns (safe to re-run)
ALTER TABLE insurance_providers ADD COLUMN IF NOT EXISTS sync_status VARCHAR(20);
ALTER TABLE insurance_providers ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
ALTER TABLE insurance_providers ADD COLUMN IF NOT EXISTS synced_product_count INT DEFAULT 0;

-- 5. Add 'in_app' to notification_type enum (safe)
DO $$ BEGIN
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'in_app';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 6. Ensure notifications table exists with correct schema
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'in_app',   -- 'in_app' | 'email'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',          -- 'pending' | 'sent' | 'read'
  entity_type VARCHAR(50),                       -- 'policy' | 'claim' | 'payment'
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast per-user lookups
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_type_status ON notifications(user_id, type, status);

-- 7. Ensure notification.metadata column exists (may be missing in older schema)
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS entity_id UUID;

-- Verify notifications table
SELECT COUNT(*) AS notification_count FROM notifications;

-- 8. Bank payout details on users
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_account_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_code VARCHAR(10);

-- 9. Payment frequency / installment / microinsurance columns on policies
DO $$ BEGIN
  CREATE TYPE payment_frequency AS ENUM ('weekly', 'monthly', 'quarterly', 'annually');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE policies ADD COLUMN IF NOT EXISTS payment_frequency payment_frequency NOT NULL DEFAULT 'annually';
ALTER TABLE policies ADD COLUMN IF NOT EXISTS installment_amount DECIMAL(12,2);
ALTER TABLE policies ADD COLUMN IF NOT EXISTS next_payment_date DATE;
ALTER TABLE policies ADD COLUMN IF NOT EXISTS grace_period_end DATE;
ALTER TABLE policies ADD COLUMN IF NOT EXISTS payments_made INTEGER NOT NULL DEFAULT 0;
ALTER TABLE policies ADD COLUMN IF NOT EXISTS payments_total INTEGER NOT NULL DEFAULT 1;
ALTER TABLE policies ADD COLUMN IF NOT EXISTS lapsed_at TIMESTAMPTZ;

-- Ensure LAPSED is in the policy_status enum
DO $$ BEGIN
  ALTER TYPE policy_status ADD VALUE IF NOT EXISTS 'lapsed';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
