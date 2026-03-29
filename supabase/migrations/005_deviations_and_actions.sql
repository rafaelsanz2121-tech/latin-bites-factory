-- ============================================================
-- Migration 005: Deviations and Corrective/Preventive Actions
-- ============================================================

-- ─── DEVIATIONS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.deviations (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  severity                text NOT NULL CHECK (severity IN ('critical','major','minor')),
  status                  text NOT NULL DEFAULT 'open'
                            CHECK (status IN ('open','under_review','corrective_action_pending','closed')),
  date_identified         date NOT NULL,
  identified_by           uuid NOT NULL REFERENCES public.profiles(id),
  area_id                 uuid REFERENCES public.areas(id),
  -- Polymorphic source log reference
  source_log_type         text,
  source_log_id           uuid,
  description             text NOT NULL,
  immediate_action        text,
  -- USDA notification (required for critical deviations)
  usda_notified           boolean NOT NULL DEFAULT false,
  usda_notification_date  date,
  -- Resolution
  closed_by               uuid REFERENCES public.profiles(id),
  closed_at               timestamptz,
  closure_notes           text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.deviations ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER deviations_updated_at BEFORE UPDATE ON public.deviations
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER deviations_audit AFTER INSERT OR UPDATE OR DELETE ON public.deviations
  FOR EACH ROW EXECUTE PROCEDURE public.audit_log_changes();

-- ─── CORRECTIVE / PREVENTIVE ACTIONS (CAPA) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.corrective_actions (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  capa_type               text NOT NULL DEFAULT 'corrective'
                            CHECK (capa_type IN ('corrective','preventive')),
  status                  text NOT NULL DEFAULT 'open'
                            CHECK (status IN ('open','in_progress','pending_verification','closed')),
  deviation_id            uuid REFERENCES public.deviations(id),
  date_opened             date NOT NULL,
  assigned_to             uuid NOT NULL REFERENCES public.profiles(id),
  assigned_by             uuid NOT NULL REFERENCES public.profiles(id),
  root_cause              text NOT NULL,
  action_description      text NOT NULL,
  due_date                date NOT NULL,
  -- Completion
  completed_by            uuid REFERENCES public.profiles(id),
  completed_at            timestamptz,
  completion_notes        text,
  -- Verification (QA closes)
  verified_effective_by   uuid REFERENCES public.profiles(id),
  verified_effective_at   timestamptz,
  verification_notes      text,
  -- Preventive follow-up
  preventive_measure      text,
  preventive_due_date     date,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.corrective_actions ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER corrective_actions_updated_at BEFORE UPDATE ON public.corrective_actions
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER corrective_actions_audit AFTER INSERT OR UPDATE OR DELETE ON public.corrective_actions
  FOR EACH ROW EXECUTE PROCEDURE public.audit_log_changes();
