-- ============================================================
-- 011_multi_tenant.sql
-- Multi-tenancy foundation: Organizations + tenant isolation
-- All existing data is migrated to Latin Bites org (seed)
-- ============================================================

-- ── Organizations (tenants) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT        NOT NULL,
  slug                  TEXT        UNIQUE NOT NULL,
  plan                  TEXT        NOT NULL DEFAULT 'starter'
                          CHECK (plan IN ('starter', 'pro', 'enterprise')),
  stripe_customer_id    TEXT,
  stripe_subscription_id TEXT,
  subscription_status   TEXT        NOT NULL DEFAULT 'trial'
                          CHECK (subscription_status IN ('trial','active','past_due','canceled','paused')),
  trial_ends_at         TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '14 days',
  est_number            TEXT,
  phone                 TEXT,
  address               TEXT,
  city                  TEXT,
  state                 TEXT,
  zip                   TEXT,
  logo_url              TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Seed: Latin Bites Factory as tenant #1 ──────────────────
INSERT INTO organizations (id, name, slug, plan, subscription_status, est_number, city, state)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Latin Bites Factory',
  'latin-bites',
  'enterprise',
  'active',
  'M/P2643',
  'Miami',
  'FL'
) ON CONFLICT (id) DO NOTHING;

-- ── Add org column to profiles ───────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

UPDATE profiles
  SET organization_id = '00000000-0000-0000-0000-000000000001'
  WHERE organization_id IS NULL;

-- ── Add org column to all log / operational tables ───────────
DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'receiving_logs', 'thawing_logs', 'cooking_chilling_logs',
    'calibration_logs', 'preop_sanitation_reports',
    'operational_sanitation_logs', 'preshipment_reviews',
    'deviations', 'corrective_actions',
    'production_orders', 'lots', 'clients', 'recipes',
    'products', 'areas'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    -- Add column only if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl AND table_schema = 'public') THEN
      EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE', tbl);
      EXECUTE format('UPDATE %I SET organization_id = %L WHERE organization_id IS NULL', tbl, '00000000-0000-0000-0000-000000000001');
    END IF;
  END LOOP;
END $$;

-- ── Helper: get caller's org_id ─────────────────────────────
CREATE OR REPLACE FUNCTION current_org_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- ── RLS on organizations ─────────────────────────────────────
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_select_own" ON organizations;
CREATE POLICY "org_select_own" ON organizations
  FOR SELECT USING (id = current_org_id());

DROP POLICY IF EXISTS "org_update_own" ON organizations;
CREATE POLICY "org_update_own" ON organizations
  FOR UPDATE USING (id = current_org_id());

-- ── updated_at trigger ───────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS organizations_updated_at ON organizations;
CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_org       ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_deviations_org     ON deviations(organization_id);
CREATE INDEX IF NOT EXISTS idx_prod_orders_org    ON production_orders(organization_id);
