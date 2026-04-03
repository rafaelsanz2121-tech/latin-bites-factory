-- ============================================================
-- 012_enterprise_modules.sql
-- Enterprise expansion: Inventory, Cost Tracking, Labor Hours
-- ============================================================

-- ── INVENTORY ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inventory_categories (
  id              UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID  NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT  NOT NULL,
  color           TEXT  DEFAULT '#6b7280'
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT          NOT NULL,
  sku             TEXT,
  category        TEXT          NOT NULL
                    CHECK (category IN ('raw_material','packaging','finished_good','supply','chemical')),
  unit            TEXT          NOT NULL DEFAULT 'lbs',
  current_stock   NUMERIC(12,3) NOT NULL DEFAULT 0,
  min_stock       NUMERIC(12,3) NOT NULL DEFAULT 0,
  max_stock       NUMERIC(12,3),
  cost_per_unit   NUMERIC(10,4),
  supplier        TEXT,
  location        TEXT,          -- walk-in, dry storage, etc.
  notes           TEXT,
  is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  item_id         UUID          NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  movement_type   TEXT          NOT NULL
                    CHECK (movement_type IN ('in','out','adjustment','waste','return')),
  quantity        NUMERIC(12,3) NOT NULL,
  unit_cost       NUMERIC(10,4),
  -- link to source document
  reference_type  TEXT          CHECK (reference_type IN ('receiving_log','production_order','manual','preshipment')),
  reference_id    UUID,
  notes           TEXT,
  created_by      UUID          REFERENCES profiles(id),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Auto-update stock on movement
CREATE OR REPLACE FUNCTION apply_inventory_movement()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.movement_type = 'in' OR NEW.movement_type = 'return' THEN
    UPDATE inventory_items SET current_stock = current_stock + NEW.quantity, updated_at = NOW()
    WHERE id = NEW.item_id;
  ELSIF NEW.movement_type IN ('out','waste') THEN
    UPDATE inventory_items SET current_stock = GREATEST(0, current_stock - NEW.quantity), updated_at = NOW()
    WHERE id = NEW.item_id;
  ELSE -- adjustment
    UPDATE inventory_items SET current_stock = NEW.quantity, updated_at = NOW()
    WHERE id = NEW.item_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inventory_movement ON inventory_movements;
CREATE TRIGGER trg_inventory_movement
  AFTER INSERT ON inventory_movements
  FOR EACH ROW EXECUTE FUNCTION apply_inventory_movement();

-- ── COST TRACKING ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cost_items (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  production_order_id UUID          REFERENCES production_orders(id) ON DELETE SET NULL,
  cost_type           TEXT          NOT NULL
                        CHECK (cost_type IN ('raw_material','labor','packaging','overhead','other')),
  description         TEXT          NOT NULL,
  quantity            NUMERIC(12,3) NOT NULL DEFAULT 1,
  unit_cost           NUMERIC(10,4) NOT NULL DEFAULT 0,
  -- generated column: quantity × unit_cost
  total_cost          NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  inventory_item_id   UUID          REFERENCES inventory_items(id) ON DELETE SET NULL,
  notes               TEXT,
  created_by          UUID          REFERENCES profiles(id),
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- View: cost summary per production order
CREATE OR REPLACE VIEW production_order_costs AS
SELECT
  po.id                             AS production_order_id,
  po.order_number,
  po.organization_id,
  COALESCE(SUM(ci.total_cost) FILTER (WHERE ci.cost_type = 'raw_material'), 0)  AS raw_material_cost,
  COALESCE(SUM(ci.total_cost) FILTER (WHERE ci.cost_type = 'labor'), 0)         AS labor_cost,
  COALESCE(SUM(ci.total_cost) FILTER (WHERE ci.cost_type = 'packaging'), 0)     AS packaging_cost,
  COALESCE(SUM(ci.total_cost) FILTER (WHERE ci.cost_type = 'overhead'), 0)      AS overhead_cost,
  COALESCE(SUM(ci.total_cost) FILTER (WHERE ci.cost_type = 'other'), 0)         AS other_cost,
  COALESCE(SUM(ci.total_cost), 0)                                               AS total_cost,
  po.quantity_lbs,
  CASE
    WHEN po.quantity_lbs > 0 THEN ROUND(COALESCE(SUM(ci.total_cost), 0) / po.quantity_lbs, 4)
    ELSE 0
  END                                                                           AS cost_per_lb
FROM production_orders po
LEFT JOIN cost_items ci ON ci.production_order_id = po.id
GROUP BY po.id, po.order_number, po.organization_id, po.quantity_lbs;

-- ── LABOR HOURS (Control de Horas de Producción) ─────────────
-- Complements ADP/QuickBooks — tracks which hours went to which order

CREATE TABLE IF NOT EXISTS employee_rates (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  hourly_rate     NUMERIC(8,2) NOT NULL,
  effective_from  DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, effective_from)
);

CREATE TABLE IF NOT EXISTS labor_entries (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id         UUID          NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  production_order_id UUID          REFERENCES production_orders(id) ON DELETE SET NULL,
  work_date           DATE          NOT NULL DEFAULT CURRENT_DATE,
  hours_worked        NUMERIC(5,2)  NOT NULL CHECK (hours_worked > 0 AND hours_worked <= 24),
  hourly_rate         NUMERIC(8,2)  NOT NULL,  -- snapshot from employee_rates at time of entry
  total_pay           NUMERIC(10,2) GENERATED ALWAYS AS (hours_worked * hourly_rate) STORED,
  area                TEXT,
  task_description    TEXT,
  is_overtime         BOOLEAN       NOT NULL DEFAULT FALSE,
  created_by          UUID          REFERENCES profiles(id),
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Auto-insert labor cost_item when a labor_entry is created
CREATE OR REPLACE FUNCTION sync_labor_cost()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.production_order_id IS NOT NULL THEN
    INSERT INTO cost_items (
      organization_id, production_order_id, cost_type,
      description, quantity, unit_cost, created_by
    ) VALUES (
      NEW.organization_id,
      NEW.production_order_id,
      'labor',
      'Mano de obra — ' || TO_CHAR(NEW.work_date, 'DD/MM/YYYY'),
      NEW.hours_worked,
      NEW.hourly_rate,
      NEW.created_by
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_labor_cost ON labor_entries;
CREATE TRIGGER trg_sync_labor_cost
  AFTER INSERT ON labor_entries
  FOR EACH ROW EXECUTE FUNCTION sync_labor_cost();

-- ── FINANCIAL SNAPSHOTS (for the owner dashboard) ────────────
CREATE TABLE IF NOT EXISTS financial_snapshots (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  period_start    DATE        NOT NULL,
  period_end      DATE        NOT NULL,
  total_revenue   NUMERIC(12,2) DEFAULT 0,
  total_cogs      NUMERIC(12,2) DEFAULT 0,  -- cost of goods sold
  gross_profit    NUMERIC(12,2) GENERATED ALWAYS AS (total_revenue - total_cogs) STORED,
  gross_margin    NUMERIC(5,2),             -- percentage, calculated by app
  labor_cost      NUMERIC(12,2) DEFAULT 0,
  material_cost   NUMERIC(12,2) DEFAULT 0,
  packaging_cost  NUMERIC(12,2) DEFAULT 0,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── RLS POLICIES ─────────────────────────────────────────────
DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'inventory_items','inventory_movements','inventory_categories',
    'cost_items','employee_rates','labor_entries','financial_snapshots'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);

    -- SELECT: own org only
    EXECUTE format('
      DROP POLICY IF EXISTS "select_own_org" ON %I;
      CREATE POLICY "select_own_org" ON %I
        FOR SELECT USING (organization_id = current_org_id());
    ', tbl, tbl);

    -- INSERT: own org only
    EXECUTE format('
      DROP POLICY IF EXISTS "insert_own_org" ON %I;
      CREATE POLICY "insert_own_org" ON %I
        FOR INSERT WITH CHECK (organization_id = current_org_id());
    ', tbl, tbl);

    -- UPDATE: own org only
    EXECUTE format('
      DROP POLICY IF EXISTS "update_own_org" ON %I;
      CREATE POLICY "update_own_org" ON %I
        FOR UPDATE USING (organization_id = current_org_id());
    ', tbl, tbl);
  END LOOP;
END $$;

-- ── INDEXES ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_inv_items_org      ON inventory_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_inv_movements_org  ON inventory_movements(organization_id);
CREATE INDEX IF NOT EXISTS idx_inv_movements_item ON inventory_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_cost_items_order   ON cost_items(production_order_id);
CREATE INDEX IF NOT EXISTS idx_labor_org          ON labor_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_labor_employee     ON labor_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_labor_order        ON labor_entries(production_order_id);
CREATE INDEX IF NOT EXISTS idx_labor_date         ON labor_entries(work_date);
