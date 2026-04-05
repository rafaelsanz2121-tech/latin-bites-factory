-- ============================================================
-- 015_allergen_pest_recall.sql
-- Allergen Control Log  (9 CFR 417 / FALCPA 2004 + Sesame 2023)
-- Pest Control Log      (9 CFR 416.2(a))
-- Mock Recall Records   (FSMA traceability exercise)
-- ============================================================

-- ── Allergen Control Checks ──────────────────────────────────
CREATE TABLE IF NOT EXISTS allergen_checks (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID        REFERENCES organizations(id) ON DELETE CASCADE,
  check_date       DATE        NOT NULL,
  check_time       TIME        NOT NULL DEFAULT CURRENT_TIME,
  check_type       TEXT        NOT NULL DEFAULT 'changeover'
    CHECK (check_type IN ('changeover','startup','end_of_run','scheduled','complaint')),
  area             TEXT        NOT NULL,
  product_before   TEXT,       -- product run before this check
  product_after    TEXT,       -- product to run after this check
  -- 9 Major Allergens (FALCPA) + Sesame (Jan 1 2023)
  milk_present     BOOLEAN     NOT NULL DEFAULT FALSE,
  eggs_present     BOOLEAN     NOT NULL DEFAULT FALSE,
  fish_present     BOOLEAN     NOT NULL DEFAULT FALSE,
  shellfish_present BOOLEAN    NOT NULL DEFAULT FALSE,
  tree_nuts_present BOOLEAN    NOT NULL DEFAULT FALSE,
  peanuts_present  BOOLEAN     NOT NULL DEFAULT FALSE,
  wheat_present    BOOLEAN     NOT NULL DEFAULT FALSE,
  soy_present      BOOLEAN     NOT NULL DEFAULT FALSE,
  sesame_present   BOOLEAN     NOT NULL DEFAULT FALSE,
  -- Verification steps
  equipment_cleaned     BOOLEAN NOT NULL DEFAULT FALSE,
  label_reviewed        BOOLEAN NOT NULL DEFAULT FALSE,
  rinsate_sample_taken  BOOLEAN NOT NULL DEFAULT FALSE,
  rinsate_result        TEXT    CHECK (rinsate_result IN ('pass','fail','not_required') OR rinsate_result IS NULL),
  -- Outcome
  cleared_for_run  BOOLEAN     NOT NULL DEFAULT TRUE,
  hold_reason      TEXT,
  corrective_action TEXT,
  -- Sign-off
  checked_by       UUID        REFERENCES profiles(id),
  verified_by      UUID        REFERENCES profiles(id),
  verified_at      TIMESTAMPTZ,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Pest Control Logs ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pest_control_logs (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID        REFERENCES organizations(id) ON DELETE CASCADE,
  inspection_date     DATE        NOT NULL,
  inspection_type     TEXT        NOT NULL DEFAULT 'routine'
    CHECK (inspection_type IN ('routine','complaint','post_treatment','seasonal','follow_up')),
  inspector_type      TEXT        NOT NULL DEFAULT 'internal'
    CHECK (inspector_type IN ('internal','external')),
  exterminator_name   TEXT,
  exterminator_cert   TEXT,
  -- Areas inspected (JSON array of area names)
  areas_inspected     TEXT[],
  -- Trap monitoring
  traps_checked       INT         NOT NULL DEFAULT 0,
  traps_with_activity INT         NOT NULL DEFAULT 0,
  -- Findings
  findings            TEXT        NOT NULL DEFAULT 'none'
    CHECK (findings IN ('none','evidence_only','activity_observed','infestation')),
  pest_types          TEXT[],     -- ['rodent','cockroach','fly','stored_product','bird','other']
  activity_locations  TEXT,
  -- Treatment
  treatment_performed BOOLEAN     NOT NULL DEFAULT FALSE,
  treatment_type      TEXT,       -- 'bait','spray','fumigation','trap_replacement','exclusion','other'
  chemicals_used      TEXT,
  -- Follow-up
  corrective_action   TEXT,
  next_inspection_date DATE,
  -- Sign-off
  inspected_by        UUID        REFERENCES profiles(id),
  reviewed_by         UUID        REFERENCES profiles(id),
  reviewed_at         TIMESTAMPTZ,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Mock Recall Records ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS mock_recalls (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        UUID        REFERENCES organizations(id) ON DELETE CASCADE,
  recall_date            DATE        NOT NULL,
  -- Scenario
  recall_type            TEXT        NOT NULL DEFAULT 'mock'
    CHECK (recall_type IN ('mock','actual')),
  trigger_reason         TEXT        NOT NULL
    CHECK (trigger_reason IN ('allergen','contamination','labeling','foreign_material','temperature_abuse','supplier_alert','customer_complaint','other')),
  trigger_detail         TEXT,
  -- Product scope
  product_name           TEXT        NOT NULL,
  lot_numbers            TEXT        NOT NULL,   -- comma-separated
  production_date_start  DATE,
  production_date_end    DATE,
  -- Traceability forward (distribution)
  total_units_produced   NUMERIC(10,2),
  units_at_facility      NUMERIC(10,2) NOT NULL DEFAULT 0,
  units_dispatched       NUMERIC(10,2) NOT NULL DEFAULT 0,
  units_recovered        NUMERIC(10,2) NOT NULL DEFAULT 0,
  customers_notified     INT          NOT NULL DEFAULT 0,
  -- Performance metrics
  time_to_identify_min   INT,         -- minutes from trigger to lot identified
  time_to_notify_min     INT,         -- minutes from trigger to customers notified
  -- Outcome
  recovery_pct           NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE WHEN units_dispatched > 0
    THEN ROUND((units_recovered / units_dispatched * 100)::numeric, 2)
    ELSE 0 END
  ) STORED,
  usda_notified          BOOLEAN      NOT NULL DEFAULT FALSE,
  usda_notified_at       TIMESTAMPTZ,
  outcome                TEXT        NOT NULL DEFAULT 'completed'
    CHECK (outcome IN ('completed','in_progress','cancelled')),
  -- Root cause & improvement
  root_cause             TEXT,
  corrective_action      TEXT,
  system_gaps_identified TEXT,
  -- Sign-off
  conducted_by           UUID        REFERENCES profiles(id),
  reviewed_by            UUID        REFERENCES profiles(id),
  reviewed_at            TIMESTAMPTZ,
  notes                  TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Triggers ─────────────────────────────────────────────────
DROP TRIGGER IF EXISTS allergen_checks_updated_at ON allergen_checks;
CREATE TRIGGER allergen_checks_updated_at
  BEFORE UPDATE ON allergen_checks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS pest_control_logs_updated_at ON pest_control_logs;
CREATE TRIGGER pest_control_logs_updated_at
  BEFORE UPDATE ON pest_control_logs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS mock_recalls_updated_at ON mock_recalls;
CREATE TRIGGER mock_recalls_updated_at
  BEFORE UPDATE ON mock_recalls
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE allergen_checks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE pest_control_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_recalls       ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allergen_select" ON allergen_checks;
CREATE POLICY "allergen_select" ON allergen_checks
  FOR SELECT USING (organization_id = current_org_id() OR organization_id IS NULL);
DROP POLICY IF EXISTS "allergen_insert" ON allergen_checks;
CREATE POLICY "allergen_insert" ON allergen_checks
  FOR INSERT WITH CHECK (organization_id = current_org_id() OR organization_id IS NULL);
DROP POLICY IF EXISTS "allergen_update" ON allergen_checks;
CREATE POLICY "allergen_update" ON allergen_checks
  FOR UPDATE USING (organization_id = current_org_id() OR organization_id IS NULL);

DROP POLICY IF EXISTS "pest_select" ON pest_control_logs;
CREATE POLICY "pest_select" ON pest_control_logs
  FOR SELECT USING (organization_id = current_org_id() OR organization_id IS NULL);
DROP POLICY IF EXISTS "pest_insert" ON pest_control_logs;
CREATE POLICY "pest_insert" ON pest_control_logs
  FOR INSERT WITH CHECK (organization_id = current_org_id() OR organization_id IS NULL);
DROP POLICY IF EXISTS "pest_update" ON pest_control_logs;
CREATE POLICY "pest_update" ON pest_control_logs
  FOR UPDATE USING (organization_id = current_org_id() OR organization_id IS NULL);

DROP POLICY IF EXISTS "recall_select" ON mock_recalls;
CREATE POLICY "recall_select" ON mock_recalls
  FOR SELECT USING (organization_id = current_org_id() OR organization_id IS NULL);
DROP POLICY IF EXISTS "recall_insert" ON mock_recalls;
CREATE POLICY "recall_insert" ON mock_recalls
  FOR INSERT WITH CHECK (organization_id = current_org_id() OR organization_id IS NULL);
DROP POLICY IF EXISTS "recall_update" ON mock_recalls;
CREATE POLICY "recall_update" ON mock_recalls
  FOR UPDATE USING (organization_id = current_org_id() OR organization_id IS NULL);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_allergen_date     ON allergen_checks(check_date DESC);
CREATE INDEX IF NOT EXISTS idx_allergen_cleared  ON allergen_checks(cleared_for_run);
CREATE INDEX IF NOT EXISTS idx_pest_date         ON pest_control_logs(inspection_date DESC);
CREATE INDEX IF NOT EXISTS idx_pest_findings     ON pest_control_logs(findings);
CREATE INDEX IF NOT EXISTS idx_recall_date       ON mock_recalls(recall_date DESC);
CREATE INDEX IF NOT EXISTS idx_recall_type       ON mock_recalls(recall_type);
