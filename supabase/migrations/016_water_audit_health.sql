-- ============================================================
-- 016_water_audit_health.sql
-- Retained Water Protocol  (9 CFR 441 — Deadline Jul 1, 2026)
-- Drinking Water Quality   (9 CFR 416.4)
-- Internal HACCP Audit     (9 CFR 417.8)
-- Health Declarations      (9 CFR 416.8)
-- ============================================================

-- ── Retained Water Logs (9 CFR 441) ──────────────────────────
CREATE TABLE IF NOT EXISTS retained_water_logs (
  id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      UUID          REFERENCES organizations(id) ON DELETE CASCADE,
  test_date            DATE          NOT NULL,
  product_name         TEXT          NOT NULL,
  product_type         TEXT          NOT NULL DEFAULT 'rte'
    CHECK (product_type IN ('rte','raw_intact','raw_non_intact','cooked','other')),
  lot_number           TEXT,
  -- Weight measurements (grams for precision)
  raw_weight_g         NUMERIC(10,2) NOT NULL,
  processed_weight_g   NUMERIC(10,2) NOT NULL,
  water_absorbed_g     NUMERIC(10,2) GENERATED ALWAYS AS
    (GREATEST(processed_weight_g - raw_weight_g, 0)) STORED,
  water_retained_pct   NUMERIC(6,3)  GENERATED ALWAYS AS
    (CASE WHEN raw_weight_g > 0
     THEN ROUND(((processed_weight_g - raw_weight_g) / raw_weight_g * 100)::numeric, 3)
     ELSE 0 END) STORED,
  -- Chilling method
  chilling_method      TEXT          NOT NULL DEFAULT 'air'
    CHECK (chilling_method IN ('water_immersion','spray_chilling','air_chilling','combination')),
  chiller_temp_f       NUMERIC(5,1),
  chiller_time_min     INT,
  -- Regulatory limit (species-specific per FSIS compliance guide)
  -- Poultry: 8%, Pork: varies, Beef: 0% (no added water)
  regulatory_limit_pct NUMERIC(6,3)  NOT NULL DEFAULT 8.000,
  -- Result
  result               TEXT          NOT NULL DEFAULT 'pending'
    CHECK (result IN ('pass','fail','pending')),
  -- Corrective action
  corrective_action    TEXT,
  product_on_hold      BOOLEAN       NOT NULL DEFAULT FALSE,
  disposition          TEXT
    CHECK (disposition IN ('release','rework','destroy','pending') OR disposition IS NULL),
  -- Sign-off
  tested_by            UUID          REFERENCES profiles(id),
  verified_by          UUID          REFERENCES profiles(id),
  verified_at          TIMESTAMPTZ,
  notes                TEXT,
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── Water Quality Testing (9 CFR 416.4) ──────────────────────
CREATE TABLE IF NOT EXISTS water_testing_logs (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID          REFERENCES organizations(id) ON DELETE CASCADE,
  test_date         DATE          NOT NULL,
  test_time         TIME          NOT NULL DEFAULT CURRENT_TIME,
  test_type         TEXT          NOT NULL DEFAULT 'daily_chlorine'
    CHECK (test_type IN ('daily_chlorine','monthly_bacteriological','quarterly_chemical','annual_full','complaint')),
  water_source      TEXT          NOT NULL DEFAULT 'municipal'
    CHECK (water_source IN ('municipal','well','surface','other')),
  sample_location   TEXT          NOT NULL,
  -- Measurements
  chlorine_residual_ppm  NUMERIC(5,2),   -- potable: 0.2–4.0 ppm
  water_pressure_psi     NUMERIC(6,2),
  water_temp_f           NUMERIC(5,1),
  ph                     NUMERIC(4,2),   -- potable: 6.5–8.5
  turbidity_ntu          NUMERIC(6,3),   -- treated: < 0.3 NTU
  -- Bacteriological
  coliform_result        TEXT
    CHECK (coliform_result IN ('absent','present','pending') OR coliform_result IS NULL),
  e_coli_result          TEXT
    CHECK (e_coli_result IN ('absent','present','pending') OR e_coli_result IS NULL),
  -- Result
  result            TEXT          NOT NULL DEFAULT 'pending'
    CHECK (result IN ('pass','fail','pending')),
  corrective_action TEXT,
  -- Sign-off
  tested_by         UUID          REFERENCES profiles(id),
  lab_name          TEXT,
  lab_report_url    TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── Internal HACCP Audit Records (9 CFR 417.8) ───────────────
CREATE TABLE IF NOT EXISTS internal_audits (
  id                          UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id             UUID     REFERENCES organizations(id) ON DELETE CASCADE,
  audit_date                  DATE     NOT NULL,
  audit_type                  TEXT     NOT NULL DEFAULT 'haccp_plan_review'
    CHECK (audit_type IN ('haccp_plan_review','ccp_monitoring','record_review','validation','pre_inspection','full_system')),
  auditor_name                TEXT     NOT NULL,
  auditor_role                TEXT,
  -- Scope
  areas_audited               TEXT[],
  total_items_checked         INT      NOT NULL DEFAULT 0,
  items_passed                INT      NOT NULL DEFAULT 0,
  items_failed                INT      NOT NULL DEFAULT 0,
  -- Findings (by severity)
  critical_findings           TEXT,    -- Requires immediate action
  major_findings              TEXT,    -- Action within 24-48h
  minor_findings              TEXT,    -- Action within 30 days
  -- Actions
  corrective_actions_required BOOLEAN  NOT NULL DEFAULT FALSE,
  corrective_action_detail    TEXT,
  corrective_action_deadline  DATE,
  follow_up_date              DATE,
  follow_up_completed         BOOLEAN  NOT NULL DEFAULT FALSE,
  -- Result
  overall_result              TEXT     NOT NULL DEFAULT 'satisfactory'
    CHECK (overall_result IN ('satisfactory','conditional','unsatisfactory')),
  -- Sign-off
  reviewed_by                 UUID     REFERENCES profiles(id),
  reviewed_at                 TIMESTAMPTZ,
  notes                       TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Health Declarations (9 CFR 416.8) ────────────────────────
CREATE TABLE IF NOT EXISTS health_declarations (
  id                UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID     REFERENCES organizations(id) ON DELETE CASCADE,
  declaration_date  DATE     NOT NULL,
  declaration_time  TIME     NOT NULL DEFAULT CURRENT_TIME,
  employee_id       UUID     NOT NULL REFERENCES profiles(id),
  shift             TEXT     NOT NULL DEFAULT 'morning'
    CHECK (shift IN ('morning','afternoon','night','split')),
  -- Health screening (9 CFR 416.8 — 5 symptoms that require exclusion)
  symptom_free      BOOLEAN  NOT NULL DEFAULT TRUE,
  -- If not symptom free, which symptoms
  has_vomiting      BOOLEAN  NOT NULL DEFAULT FALSE,
  has_diarrhea      BOOLEAN  NOT NULL DEFAULT FALSE,
  has_jaundice      BOOLEAN  NOT NULL DEFAULT FALSE,
  has_sore_throat_fever BOOLEAN NOT NULL DEFAULT FALSE,
  has_infected_wound BOOLEAN NOT NULL DEFAULT FALSE,
  -- Decision
  cleared_to_work   BOOLEAN  NOT NULL DEFAULT TRUE,
  restriction_note  TEXT,    -- e.g. "Non-food contact areas only"
  -- Sign-off
  supervisor_id     UUID     REFERENCES profiles(id),
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Triggers ─────────────────────────────────────────────────
DROP TRIGGER IF EXISTS retained_water_updated_at ON retained_water_logs;
CREATE TRIGGER retained_water_updated_at
  BEFORE UPDATE ON retained_water_logs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS water_testing_updated_at ON water_testing_logs;
CREATE TRIGGER water_testing_updated_at
  BEFORE UPDATE ON water_testing_logs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS internal_audits_updated_at ON internal_audits;
CREATE TRIGGER internal_audits_updated_at
  BEFORE UPDATE ON internal_audits
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE retained_water_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_testing_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_audits     ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_declarations ENABLE ROW LEVEL SECURITY;

-- retained_water
DROP POLICY IF EXISTS "rw_select" ON retained_water_logs;
CREATE POLICY "rw_select" ON retained_water_logs
  FOR SELECT USING (organization_id = current_org_id() OR organization_id IS NULL);
DROP POLICY IF EXISTS "rw_insert" ON retained_water_logs;
CREATE POLICY "rw_insert" ON retained_water_logs
  FOR INSERT WITH CHECK (organization_id = current_org_id() OR organization_id IS NULL);
DROP POLICY IF EXISTS "rw_update" ON retained_water_logs;
CREATE POLICY "rw_update" ON retained_water_logs
  FOR UPDATE USING (organization_id = current_org_id() OR organization_id IS NULL);

-- water_testing
DROP POLICY IF EXISTS "wt_select" ON water_testing_logs;
CREATE POLICY "wt_select" ON water_testing_logs
  FOR SELECT USING (organization_id = current_org_id() OR organization_id IS NULL);
DROP POLICY IF EXISTS "wt_insert" ON water_testing_logs;
CREATE POLICY "wt_insert" ON water_testing_logs
  FOR INSERT WITH CHECK (organization_id = current_org_id() OR organization_id IS NULL);
DROP POLICY IF EXISTS "wt_update" ON water_testing_logs;
CREATE POLICY "wt_update" ON water_testing_logs
  FOR UPDATE USING (organization_id = current_org_id() OR organization_id IS NULL);

-- internal_audits
DROP POLICY IF EXISTS "ia_select" ON internal_audits;
CREATE POLICY "ia_select" ON internal_audits
  FOR SELECT USING (organization_id = current_org_id() OR organization_id IS NULL);
DROP POLICY IF EXISTS "ia_insert" ON internal_audits;
CREATE POLICY "ia_insert" ON internal_audits
  FOR INSERT WITH CHECK (organization_id = current_org_id() OR organization_id IS NULL);
DROP POLICY IF EXISTS "ia_update" ON internal_audits;
CREATE POLICY "ia_update" ON internal_audits
  FOR UPDATE USING (organization_id = current_org_id() OR organization_id IS NULL);

-- health_declarations
DROP POLICY IF EXISTS "hd_select" ON health_declarations;
CREATE POLICY "hd_select" ON health_declarations
  FOR SELECT USING (organization_id = current_org_id() OR organization_id IS NULL);
DROP POLICY IF EXISTS "hd_insert" ON health_declarations;
CREATE POLICY "hd_insert" ON health_declarations
  FOR INSERT WITH CHECK (organization_id = current_org_id() OR organization_id IS NULL);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_rw_date      ON retained_water_logs(test_date DESC);
CREATE INDEX IF NOT EXISTS idx_rw_result    ON retained_water_logs(result);
CREATE INDEX IF NOT EXISTS idx_wt_date      ON water_testing_logs(test_date DESC);
CREATE INDEX IF NOT EXISTS idx_wt_type      ON water_testing_logs(test_type);
CREATE INDEX IF NOT EXISTS idx_ia_date      ON internal_audits(audit_date DESC);
CREATE INDEX IF NOT EXISTS idx_ia_result    ON internal_audits(overall_result);
CREATE INDEX IF NOT EXISTS idx_hd_date      ON health_declarations(declaration_date DESC);
CREATE INDEX IF NOT EXISTS idx_hd_employee  ON health_declarations(employee_id, declaration_date DESC);
CREATE INDEX IF NOT EXISTS idx_hd_cleared   ON health_declarations(cleared_to_work);
