-- ============================================================
-- Migration 004: Pre-Op Sanitation and Operational Sanitation
-- ============================================================

-- ─── PRE-OP SANITATION REPORTS ──────────────────────────────────────────────
-- Done DAILY before operations begin (not weekly)
CREATE TABLE IF NOT EXISTS public.preop_sanitation_reports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status          text NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','submitted','verified','approved','locked','reopened')),
  report_date     date NOT NULL,
  inspection_time time,                                    -- time inspection was performed
  area_id         uuid REFERENCES public.areas(id),
  general_notes   text,                                    -- notes / corrective actions taken
  -- Score counters (denormalized for fast queries)
  total_items     integer NOT NULL DEFAULT 0,
  pass_count      integer NOT NULL DEFAULT 0,
  fail_count      integer NOT NULL DEFAULT 0,
  na_count        integer NOT NULL DEFAULT 0,
  -- Workflow
  created_by      uuid NOT NULL REFERENCES public.profiles(id),
  submitted_at    timestamptz,
  submitted_by    uuid REFERENCES public.profiles(id),
  verified_by     uuid REFERENCES public.profiles(id),
  verified_at     timestamptz,
  approved_by     uuid REFERENCES public.profiles(id),
  approved_at     timestamptz,
  locked_at       timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT preop_no_self_verify  CHECK (verified_by  IS NULL OR verified_by  != created_by),
  CONSTRAINT preop_no_self_approve CHECK (approved_by IS NULL OR approved_by != created_by)
);

ALTER TABLE public.preop_sanitation_reports ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER preop_sanitation_reports_updated_at BEFORE UPDATE ON public.preop_sanitation_reports
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER preop_sanitation_reports_audit AFTER INSERT OR UPDATE OR DELETE ON public.preop_sanitation_reports
  FOR EACH ROW EXECUTE PROCEDURE public.audit_log_changes();

-- Pre-op items (each scored item in a report)
CREATE TABLE IF NOT EXISTS public.preop_sanitation_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id   uuid NOT NULL REFERENCES public.preop_sanitation_reports(id) ON DELETE CASCADE,
  section     text NOT NULL,
  item_key    text NOT NULL,
  item_label  text NOT NULL,
  value       text CHECK (value IN ('pass','fail','na')),  -- pass / fail / na
  period      text NOT NULL DEFAULT 'single' CHECK (period IN ('am','pm','single')),
  notes       text,
  sort_order  integer NOT NULL DEFAULT 0
);

ALTER TABLE public.preop_sanitation_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "preop_items_via_report" ON public.preop_sanitation_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.preop_sanitation_reports r
      WHERE r.id = report_id
        AND (
          r.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin','qa','supervisor')
          )
        )
    )
  );

-- ─── OPERATIONAL SANITATION LOGS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.operational_sanitation_logs (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status                  text NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft','submitted','verified','approved','locked','reopened')),
  log_date                date NOT NULL,
  -- Dynamic inspection blocks stored as jsonb
  -- [{block_number, time, inspector_initials, is_changeover, items:{...}, notes}]
  inspection_blocks       jsonb NOT NULL DEFAULT '[]',
  -- Sanitizer check (once per day)
  sanitizer_check_done    boolean NOT NULL DEFAULT false,
  sanitizer_before_ppm    numeric(6, 1),
  sanitizer_after_ppm     numeric(6, 1),
  sanitizer_max_ppm       numeric(6, 1) NOT NULL DEFAULT 200,
  -- Blades/Mechanical inspection
  blades_before_ok        boolean,
  blades_after_ok         boolean,
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
  CONSTRAINT ops_sanitation_no_self_verify  CHECK (verified_by  IS NULL OR verified_by  != created_by),
  CONSTRAINT ops_sanitation_no_self_approve CHECK (approved_by IS NULL OR approved_by != created_by)
);

ALTER TABLE public.operational_sanitation_logs ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER operational_sanitation_logs_updated_at BEFORE UPDATE ON public.operational_sanitation_logs
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER operational_sanitation_logs_audit AFTER INSERT OR UPDATE OR DELETE ON public.operational_sanitation_logs
  FOR EACH ROW EXECUTE PROCEDURE public.audit_log_changes();
