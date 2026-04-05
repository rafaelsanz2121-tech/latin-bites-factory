-- ============================================================
-- 014_metal_supplier_dispatch.sql
-- Metal Detector CCP Log (9 CFR 417 CCP monitoring)
-- Supplier Verification (9 CFR 417.4)
-- Dispatch / Shipping Log (9 CFR 320 recordkeeping)
-- ============================================================

-- ── Metal Detector Logs ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS metal_detector_logs (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      UUID        REFERENCES organizations(id) ON DELETE CASCADE,
  check_date           DATE        NOT NULL,
  check_time           TIME        NOT NULL DEFAULT CURRENT_TIME,
  check_type           TEXT        NOT NULL DEFAULT 'pre_op'
    CHECK (check_type IN ('pre_op','hourly','product_change','post_maintenance','end_of_day')),
  product_name         TEXT,
  lot_number           TEXT,
  equipment_id         TEXT,        -- which detector unit
  -- Test pieces (sensitivity verification)
  ferrous_mm           NUMERIC(4,1),
  non_ferrous_mm       NUMERIC(4,1),
  stainless_mm         NUMERIC(4,1),
  ferrous_pass         BOOLEAN     NOT NULL DEFAULT TRUE,
  non_ferrous_pass     BOOLEAN     NOT NULL DEFAULT TRUE,
  stainless_pass       BOOLEAN     NOT NULL DEFAULT TRUE,
  overall_pass         BOOLEAN     GENERATED ALWAYS AS (ferrous_pass AND non_ferrous_pass AND stainless_pass) STORED,
  -- Production run
  units_inspected      INT,
  units_rejected       INT         NOT NULL DEFAULT 0,
  -- Corrective action (required on fail)
  corrective_action    TEXT,
  product_on_hold      BOOLEAN     NOT NULL DEFAULT FALSE,
  product_disposition  TEXT        CHECK (product_disposition IN ('rework','destroy','release','pending') OR product_disposition IS NULL),
  -- Sign-off
  operator_id          UUID        REFERENCES profiles(id),
  verified_by          UUID        REFERENCES profiles(id),
  verified_at          TIMESTAMPTZ,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Suppliers ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suppliers (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      UUID        REFERENCES organizations(id) ON DELETE CASCADE,
  name                 TEXT        NOT NULL,
  company_type         TEXT        NOT NULL DEFAULT 'processor'
    CHECK (company_type IN ('processor','packer','distributor','broker','farm','transporter','other')),
  contact_name         TEXT,
  phone                TEXT,
  email                TEXT,
  address              TEXT,
  est_number           TEXT,        -- USDA EST if applicable
  products_supplied    TEXT,        -- free text list
  risk_level           TEXT        NOT NULL DEFAULT 'medium'
    CHECK (risk_level IN ('low','medium','high')),
  is_approved          BOOLEAN     NOT NULL DEFAULT FALSE,
  approval_date        DATE,
  approval_expiry      DATE,
  notes                TEXT,
  is_active            BOOLEAN     NOT NULL DEFAULT TRUE,
  created_by           UUID        REFERENCES profiles(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Supplier Verifications ───────────────────────────────────
CREATE TABLE IF NOT EXISTS supplier_verifications (
  id                         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id            UUID        REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id                UUID        NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  verification_date          DATE        NOT NULL,
  verification_type          TEXT        NOT NULL
    CHECK (verification_type IN ('coa_review','on_site_audit','inspection','questionnaire','third_party_audit','document_review')),
  result                     TEXT        NOT NULL DEFAULT 'approved'
    CHECK (result IN ('approved','conditional','rejected')),
  findings                   TEXT,
  corrective_action_required BOOLEAN     NOT NULL DEFAULT FALSE,
  corrective_action          TEXT,
  next_review_date           DATE,
  verified_by                UUID        REFERENCES profiles(id),
  documents_url              TEXT,
  notes                      TEXT,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Dispatch / Shipping Logs ─────────────────────────────────
CREATE TABLE IF NOT EXISTS dispatch_logs (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         UUID        REFERENCES organizations(id) ON DELETE CASCADE,
  dispatch_date           DATE        NOT NULL,
  dispatch_time           TIME        NOT NULL DEFAULT CURRENT_TIME,
  bill_of_lading          TEXT,
  lot_numbers             TEXT,        -- comma-separated lot numbers
  product_name            TEXT        NOT NULL,
  quantity                NUMERIC(10,2) NOT NULL,
  unit                    TEXT        NOT NULL DEFAULT 'lbs',
  destination_name        TEXT        NOT NULL,
  destination_address     TEXT,
  carrier_name            TEXT,
  truck_plate             TEXT,
  driver_name             TEXT,
  driver_license          TEXT,
  seal_number             TEXT,
  temp_at_loading_f       NUMERIC(5,1),
  temp_acceptable         BOOLEAN,
  usda_inspector_present  BOOLEAN     NOT NULL DEFAULT FALSE,
  inspector_name          TEXT,
  status                  TEXT        NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','dispatched','received','disputed')),
  notes                   TEXT,
  dispatched_by           UUID        REFERENCES profiles(id),
  reviewed_by             UUID        REFERENCES profiles(id),
  reviewed_at             TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Triggers ─────────────────────────────────────────────────
DROP TRIGGER IF EXISTS metal_detector_logs_updated_at ON metal_detector_logs;
CREATE TRIGGER metal_detector_logs_updated_at
  BEFORE UPDATE ON metal_detector_logs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS suppliers_updated_at ON suppliers;
CREATE TRIGGER suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS dispatch_logs_updated_at ON dispatch_logs;
CREATE TRIGGER dispatch_logs_updated_at
  BEFORE UPDATE ON dispatch_logs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE metal_detector_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_logs         ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "metal_select"  ON metal_detector_logs;
CREATE POLICY "metal_select"  ON metal_detector_logs
  FOR SELECT USING (organization_id = current_org_id() OR organization_id IS NULL);
DROP POLICY IF EXISTS "metal_insert"  ON metal_detector_logs;
CREATE POLICY "metal_insert"  ON metal_detector_logs
  FOR INSERT WITH CHECK (organization_id = current_org_id() OR organization_id IS NULL);
DROP POLICY IF EXISTS "metal_update"  ON metal_detector_logs;
CREATE POLICY "metal_update"  ON metal_detector_logs
  FOR UPDATE USING (organization_id = current_org_id() OR organization_id IS NULL);

DROP POLICY IF EXISTS "supplier_select" ON suppliers;
CREATE POLICY "supplier_select" ON suppliers
  FOR SELECT USING (organization_id = current_org_id() OR organization_id IS NULL);
DROP POLICY IF EXISTS "supplier_insert" ON suppliers;
CREATE POLICY "supplier_insert" ON suppliers
  FOR INSERT WITH CHECK (organization_id = current_org_id() OR organization_id IS NULL);
DROP POLICY IF EXISTS "supplier_update" ON suppliers;
CREATE POLICY "supplier_update" ON suppliers
  FOR UPDATE USING (organization_id = current_org_id() OR organization_id IS NULL);

DROP POLICY IF EXISTS "supverif_select" ON supplier_verifications;
CREATE POLICY "supverif_select" ON supplier_verifications
  FOR SELECT USING (organization_id = current_org_id() OR organization_id IS NULL);
DROP POLICY IF EXISTS "supverif_insert" ON supplier_verifications;
CREATE POLICY "supverif_insert" ON supplier_verifications
  FOR INSERT WITH CHECK (organization_id = current_org_id() OR organization_id IS NULL);

DROP POLICY IF EXISTS "dispatch_select" ON dispatch_logs;
CREATE POLICY "dispatch_select" ON dispatch_logs
  FOR SELECT USING (organization_id = current_org_id() OR organization_id IS NULL);
DROP POLICY IF EXISTS "dispatch_insert" ON dispatch_logs;
CREATE POLICY "dispatch_insert" ON dispatch_logs
  FOR INSERT WITH CHECK (organization_id = current_org_id() OR organization_id IS NULL);
DROP POLICY IF EXISTS "dispatch_update" ON dispatch_logs;
CREATE POLICY "dispatch_update" ON dispatch_logs
  FOR UPDATE USING (organization_id = current_org_id() OR organization_id IS NULL);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_metal_date      ON metal_detector_logs(check_date DESC);
CREATE INDEX IF NOT EXISTS idx_metal_pass      ON metal_detector_logs(overall_pass);
CREATE INDEX IF NOT EXISTS idx_supplier_active ON suppliers(is_active, is_approved);
CREATE INDEX IF NOT EXISTS idx_supverif_sup    ON supplier_verifications(supplier_id, verification_date DESC);
CREATE INDEX IF NOT EXISTS idx_dispatch_date   ON dispatch_logs(dispatch_date DESC);
CREATE INDEX IF NOT EXISTS idx_dispatch_status ON dispatch_logs(status);
