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
