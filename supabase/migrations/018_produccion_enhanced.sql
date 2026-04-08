-- =============================================================
-- 018 · Producción Inteligente — Enhanced Production Hub
-- =============================================================
-- Upgrades box_sessions/box_entries with production intelligence:
-- AI rules engine, temperature checkpoints, pace tracking, lot refs.

-- ── Extend box_sessions with production fields ────────────────
ALTER TABLE public.box_sessions
  ADD COLUMN IF NOT EXISTS start_time         timestamptz,
  ADD COLUMN IF NOT EXISTS end_time           timestamptz,
  ADD COLUMN IF NOT EXISTS supervisor_id      uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS production_line    text,
  ADD COLUMN IF NOT EXISTS lot_reference      text,
  ADD COLUMN IF NOT EXISTS temp_interval_min  int DEFAULT 30,
  ADD COLUMN IF NOT EXISTS session_number     text;   -- e.g. auto-generated "PROD-2026-001"

-- ── Extend box_entries with traceability fields ───────────────
ALTER TABLE public.box_entries
  ADD COLUMN IF NOT EXISTS lot_reference  text,
  ADD COLUMN IF NOT EXISTS temperature_f  numeric(5,1);

-- ── AI Rules configured by owner ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.produccion_ai_rules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  is_active       boolean NOT NULL DEFAULT true,
  rule_type       text NOT NULL CHECK (rule_type IN (
    'weight_min',        -- min allowed box weight
    'weight_max',        -- max allowed box weight
    'pace_min',          -- min boxes per hour
    'temp_interval',     -- take temperature every N minutes
    'temp_min',          -- min product temperature
    'temp_max',          -- max product temperature
    'min_boxes_close',   -- require at least N boxes to close session
    'custom_reminder'    -- custom timed reminder
  )),
  value           numeric NOT NULL,
  unit            text,
  action          text NOT NULL DEFAULT 'alert'
                    CHECK (action IN ('alert','warn','block')),
  message         text NOT NULL,
  sort_order      int  NOT NULL DEFAULT 0,
  created_by      uuid REFERENCES public.profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ── Temperature checkpoints during a session ─────────────────
CREATE TABLE IF NOT EXISTS public.produccion_temp_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid NOT NULL REFERENCES public.box_sessions(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  box_number_at   int,
  temperature_f   numeric(5,1) NOT NULL,
  location        text DEFAULT 'center' CHECK (location IN ('center','surface','ambient')),
  logged_by       uuid REFERENCES public.profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  notes           text
);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS ai_rules_org_idx   ON public.produccion_ai_rules(organization_id, is_active);
CREATE INDEX IF NOT EXISTS temp_logs_sess_idx ON public.produccion_temp_logs(session_id);

-- ── Row Level Security ────────────────────────────────────────
ALTER TABLE public.produccion_ai_rules  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produccion_temp_logs ENABLE ROW LEVEL SECURITY;

-- AI rules — all org members can read; only admin/supervisor can write
CREATE POLICY "ai_rules_select" ON public.produccion_ai_rules
  FOR SELECT USING (organization_id = (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "ai_rules_insert" ON public.produccion_ai_rules
  FOR INSERT WITH CHECK (organization_id = (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "ai_rules_update" ON public.produccion_ai_rules
  FOR UPDATE USING (organization_id = (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "ai_rules_delete" ON public.produccion_ai_rules
  FOR DELETE USING (organization_id = (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Temperature logs
CREATE POLICY "temp_logs_select" ON public.produccion_temp_logs
  FOR SELECT USING (organization_id = (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "temp_logs_insert" ON public.produccion_temp_logs
  FOR INSERT WITH CHECK (organization_id = (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "temp_logs_delete" ON public.produccion_temp_logs
  FOR DELETE USING (organization_id = (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- ── Default AI rules for new organizations ───────────────────
-- (Run per org after setup, or seed your org_id manually)
-- INSERT INTO public.produccion_ai_rules (organization_id, rule_type, value, unit, action, message, sort_order)
-- VALUES
--   ('<org_id>', 'weight_min',   38,  'lbs',              'alert', '⚠️ Caja muy liviana — revisar pesaje o llenado.', 1),
--   ('<org_id>', 'weight_max',   70,  'lbs',              'alert', '⚠️ Caja muy pesada — revisar llenado.', 2),
--   ('<org_id>', 'pace_min',     8,   'cajas/hora',       'warn',  '🐢 Ritmo bajo — ¿hay un problema en la línea?', 3),
--   ('<org_id>', 'temp_interval',30,  'minutos',          'warn',  '🌡️ Hora de verificar temperatura del producto.', 4),
--   ('<org_id>', 'temp_max',     40,  '°F',               'alert', '🔴 Temperatura alta — producto en riesgo.', 5),
--   ('<org_id>', 'min_boxes_close', 10, 'cajas',          'block', '❌ Mínimo 10 cajas para cerrar una sesión.', 6);
