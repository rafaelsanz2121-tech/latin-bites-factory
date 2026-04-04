-- ============================================================
-- 013_listeria_training.sql
-- Listeria Environmental Monitoring (9 CFR Part 430)
-- Employee Training Records (9 CFR 417.7)
-- ============================================================

-- ── Listeria Environmental Monitoring ───────────────────────
CREATE TABLE IF NOT EXISTS listeria_samples (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID        REFERENCES organizations(id) ON DELETE CASCADE,
  sample_date      DATE        NOT NULL,
  zone             INT         NOT NULL CHECK (zone BETWEEN 1 AND 4),
  location         TEXT        NOT NULL,
  surface_type     TEXT        NOT NULL
    CHECK (surface_type IN ('food_contact','non_food_contact','drain','air','utensil','hand_contact')),
  test_method      TEXT,       -- e.g. '3M Petrifilm', 'PCR', 'ELISA'
  result           TEXT        NOT NULL DEFAULT 'pending'
    CHECK (result IN ('negative','positive','pending')),
  -- Corrective action (required when positive — 9 CFR 430.4)
  action_taken     TEXT,
  area_sanitized   BOOLEAN     NOT NULL DEFAULT FALSE,
  product_on_hold  BOOLEAN     NOT NULL DEFAULT FALSE,
  lot_on_hold      TEXT,
  retest_required  BOOLEAN     NOT NULL DEFAULT FALSE,
  retest_date      DATE,
  retest_result    TEXT
    CHECK (retest_result IN ('negative','positive','pending') OR retest_result IS NULL),
  notes            TEXT,
  collected_by     UUID        REFERENCES profiles(id),
  reviewed_by      UUID        REFERENCES profiles(id),
  reviewed_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Employee Training Records (9 CFR 417.7) ─────────────────
CREATE TABLE IF NOT EXISTS training_records (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID        REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id      UUID        NOT NULL REFERENCES profiles(id),
  training_type    TEXT        NOT NULL,
  training_date    DATE        NOT NULL,
  expiry_date      DATE,
  trainer_name     TEXT,
  trainer_cert_no  TEXT,
  score            INT         CHECK (score BETWEEN 0 AND 100),
  result           TEXT        NOT NULL DEFAULT 'passed'
    CHECK (result IN ('passed','failed','pending')),
  certificate_url  TEXT,
  notes            TEXT,
  created_by       UUID        REFERENCES profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── updated_at trigger for listeria_samples ──────────────────
DROP TRIGGER IF EXISTS listeria_samples_updated_at ON listeria_samples;
CREATE TRIGGER listeria_samples_updated_at
  BEFORE UPDATE ON listeria_samples
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Seed org_id on both tables ────────────────────────────────
ALTER TABLE listeria_samples
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

ALTER TABLE training_records
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE listeria_samples  ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_records  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "listeria_select" ON listeria_samples;
CREATE POLICY "listeria_select" ON listeria_samples
  FOR SELECT USING (organization_id = current_org_id() OR organization_id IS NULL);

DROP POLICY IF EXISTS "listeria_insert" ON listeria_samples;
CREATE POLICY "listeria_insert" ON listeria_samples
  FOR INSERT WITH CHECK (organization_id = current_org_id() OR organization_id IS NULL);

DROP POLICY IF EXISTS "listeria_update" ON listeria_samples;
CREATE POLICY "listeria_update" ON listeria_samples
  FOR UPDATE USING (organization_id = current_org_id() OR organization_id IS NULL);

DROP POLICY IF EXISTS "training_select" ON training_records;
CREATE POLICY "training_select" ON training_records
  FOR SELECT USING (organization_id = current_org_id() OR organization_id IS NULL);

DROP POLICY IF EXISTS "training_insert" ON training_records;
CREATE POLICY "training_insert" ON training_records
  FOR INSERT WITH CHECK (organization_id = current_org_id() OR organization_id IS NULL);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_listeria_date      ON listeria_samples(sample_date DESC);
CREATE INDEX IF NOT EXISTS idx_listeria_result    ON listeria_samples(result);
CREATE INDEX IF NOT EXISTS idx_listeria_zone      ON listeria_samples(zone);
CREATE INDEX IF NOT EXISTS idx_training_employee  ON training_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_training_type      ON training_records(training_type);
CREATE INDEX IF NOT EXISTS idx_training_expiry    ON training_records(expiry_date);

-- ── Helpful view: current training status per employee ───────
CREATE OR REPLACE VIEW employee_training_status AS
SELECT
  p.id            AS employee_id,
  p.full_name,
  p.role,
  tr.training_type,
  tr.training_date,
  tr.expiry_date,
  tr.result,
  CASE
    WHEN tr.expiry_date IS NULL      THEN 'no_expiry'
    WHEN tr.expiry_date < CURRENT_DATE THEN 'expired'
    WHEN tr.expiry_date < CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
    ELSE 'valid'
  END AS training_status,
  tr.id AS record_id
FROM profiles p
LEFT JOIN LATERAL (
  SELECT * FROM training_records t
  WHERE t.employee_id = p.id
  ORDER BY training_date DESC
) tr ON TRUE
WHERE p.is_active = TRUE;
