-- ============================================================
-- Migration 003: Receiving, Thawing, Cooking, Calibration, Preshipment
-- ============================================================

-- Helper: no-self-verify/approve check (reusable macro pattern)
-- Applied as CHECK constraints on each table

-- ─── RECEIVING LOGS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.receiving_logs (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status                text NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft','submitted','verified','approved','locked','reopened')),
  date                  date NOT NULL,
  time_received         time NOT NULL,
  product_id            uuid REFERENCES public.products(id),
  lot_id                uuid REFERENCES public.lots(id),
  supplier              text NOT NULL,
  quantity_lbs          numeric(10, 2),
  internal_temp_f       numeric(5, 2),
  packaging_condition   text CHECK (packaging_condition IN ('acceptable','deficient')),
  labeling_ok           boolean,
  vehicle_temp_f        numeric(5, 2),
  notes                 text,
  -- Workflow
  created_by            uuid NOT NULL REFERENCES public.profiles(id),
  submitted_at          timestamptz,
  verified_by           uuid REFERENCES public.profiles(id),
  verified_at           timestamptz,
  approved_by           uuid REFERENCES public.profiles(id),
  approved_at           timestamptz,
  locked_at             timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT receiving_no_self_verify  CHECK (verified_by  IS NULL OR verified_by  != created_by),
  CONSTRAINT receiving_no_self_approve CHECK (approved_by IS NULL OR approved_by != created_by)
);

ALTER TABLE public.receiving_logs ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER receiving_logs_updated_at BEFORE UPDATE ON public.receiving_logs
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER receiving_logs_audit AFTER INSERT OR UPDATE OR DELETE ON public.receiving_logs
  FOR EACH ROW EXECUTE PROCEDURE public.audit_log_changes();

-- ─── THAWING LOGS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.thawing_logs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status            text NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft','submitted','verified','approved','locked','reopened')),
  date              date NOT NULL,
  product_id        uuid NOT NULL REFERENCES public.products(id),
  lot_id            uuid REFERENCES public.lots(id),
  lot_batch_number  text,
  thawing_method    text NOT NULL CHECK (thawing_method IN ('cooler','running_water')),
  start_time        time NOT NULL,
  start_temp_f      numeric(5, 2) NOT NULL,
  end_time          time,
  end_temp_f        numeric(5, 2),
  water_temp_f      numeric(5, 2),
  notes             text,
  -- Workflow
  created_by        uuid NOT NULL REFERENCES public.profiles(id),
  employee_initials text,
  submitted_at      timestamptz,
  verified_by       uuid REFERENCES public.profiles(id),
  verified_at       timestamptz,
  approved_by       uuid REFERENCES public.profiles(id),
  approved_at       timestamptz,
  locked_at         timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT thawing_no_self_verify  CHECK (verified_by  IS NULL OR verified_by  != created_by),
  CONSTRAINT thawing_no_self_approve CHECK (approved_by IS NULL OR approved_by != created_by),
  CONSTRAINT thawing_running_water_temp CHECK (
    thawing_method != 'running_water'
    OR water_temp_f IS NULL
    OR water_temp_f <= 70
  )
);

ALTER TABLE public.thawing_logs ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER thawing_logs_updated_at BEFORE UPDATE ON public.thawing_logs
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER thawing_logs_audit AFTER INSERT OR UPDATE OR DELETE ON public.thawing_logs
  FOR EACH ROW EXECUTE PROCEDURE public.audit_log_changes();

-- ─── COOKING / CHILLING LOGS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cooking_chilling_logs (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status                      text NOT NULL DEFAULT 'draft'
                                CHECK (status IN ('draft','submitted','verified','approved','locked','reopened')),
  log_type                    text NOT NULL CHECK (log_type IN ('cooking','chilling')),
  ccp_number                  text NOT NULL
                                CHECK (ccp_number IN ('CCP_1B','CCP_1B_1','CCP_1B_2','CCP_2B','CCP_2B_1')),
  date                        date NOT NULL,
  product_id                  uuid NOT NULL REFERENCES public.products(id),
  lot_id                      uuid REFERENCES public.lots(id),
  readings                    jsonb NOT NULL DEFAULT '[]',
  -- Chilling-specific phase tracking
  chilling_start_time         time,
  chilling_start_temp_f       numeric(5, 2),
  phase_one_end_time          time,
  phase_one_end_temp_f        numeric(5, 2),
  phase_two_end_time          time,
  phase_two_end_temp_f        numeric(5, 2),
  -- Verification block (once per work day, supervisor)
  verification_date           date,
  observation_time            time,
  observation_by              uuid REFERENCES public.profiles(id),
  review_time                 time,
  review_by                   uuid REFERENCES public.profiles(id),
  thermometer_calibrated      boolean,
  notes                       text,
  -- Workflow
  created_by                  uuid NOT NULL REFERENCES public.profiles(id),
  submitted_at                timestamptz,
  verified_by                 uuid REFERENCES public.profiles(id),
  verified_at                 timestamptz,
  approved_by                 uuid REFERENCES public.profiles(id),
  approved_at                 timestamptz,
  locked_at                   timestamptz,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cooking_no_self_verify  CHECK (verified_by  IS NULL OR verified_by  != created_by),
  CONSTRAINT cooking_no_self_approve CHECK (approved_by IS NULL OR approved_by != created_by)
);

ALTER TABLE public.cooking_chilling_logs ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER cooking_chilling_logs_updated_at BEFORE UPDATE ON public.cooking_chilling_logs
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER cooking_chilling_logs_audit AFTER INSERT OR UPDATE OR DELETE ON public.cooking_chilling_logs
  FOR EACH ROW EXECUTE PROCEDURE public.audit_log_changes();

-- ─── THERMOMETER CALIBRATION LOGS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.calibration_logs (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status                  text NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft','submitted','verified','approved','locked','reopened')),
  date                    date NOT NULL,
  thermometer_id          text NOT NULL,
  thermometer_type        text,
  ice_water_reference_f   numeric(5, 2) NOT NULL DEFAULT 32.0,
  ice_water_reading_f     numeric(5, 2) NOT NULL,
  is_in_tolerance         boolean GENERATED ALWAYS AS (
                            ABS(ice_water_reading_f - ice_water_reference_f) <= 2
                          ) STORED,
  corrective_action_taken text,
  notes                   text,
  -- Workflow
  created_by              uuid NOT NULL REFERENCES public.profiles(id),
  submitted_at            timestamptz,
  verified_by             uuid REFERENCES public.profiles(id),
  verified_at             timestamptz,
  approved_by             uuid REFERENCES public.profiles(id),
  approved_at             timestamptz,
  locked_at               timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT calibration_no_self_verify  CHECK (verified_by  IS NULL OR verified_by  != created_by),
  CONSTRAINT calibration_no_self_approve CHECK (approved_by IS NULL OR approved_by != created_by)
);

ALTER TABLE public.calibration_logs ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER calibration_logs_updated_at BEFORE UPDATE ON public.calibration_logs
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER calibration_logs_audit AFTER INSERT OR UPDATE OR DELETE ON public.calibration_logs
  FOR EACH ROW EXECUTE PROCEDURE public.audit_log_changes();

-- ─── PRE-SHIPMENT REVIEWS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.preshipment_reviews (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status              text NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','submitted','verified','approved','locked','reopened')),
  review_date         date NOT NULL,
  lot_id              uuid NOT NULL REFERENCES public.lots(id),
  product_id          uuid NOT NULL REFERENCES public.products(id),
  all_ccps_met        boolean,
  cooking_log_id      uuid REFERENCES public.cooking_chilling_logs(id),
  thawing_log_id      uuid REFERENCES public.thawing_logs(id),
  calibration_log_id  uuid REFERENCES public.calibration_logs(id),
  any_deviations      boolean NOT NULL DEFAULT false,
  deviation_ids       uuid[] NOT NULL DEFAULT '{}',
  disposition         text CHECK (disposition IN ('approved_for_shipment','hold','destroyed')),
  disposition_notes   text,
  notes               text,
  -- Workflow
  created_by          uuid NOT NULL REFERENCES public.profiles(id),
  submitted_at        timestamptz,
  verified_by         uuid REFERENCES public.profiles(id),
  verified_at         timestamptz,
  approved_by         uuid REFERENCES public.profiles(id),
  approved_at         timestamptz,
  locked_at           timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT preshipment_no_self_verify  CHECK (verified_by  IS NULL OR verified_by  != created_by),
  CONSTRAINT preshipment_no_self_approve CHECK (approved_by IS NULL OR approved_by != created_by)
);

ALTER TABLE public.preshipment_reviews ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER preshipment_reviews_updated_at BEFORE UPDATE ON public.preshipment_reviews
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
