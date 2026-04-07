-- =============================================================
-- 017 · Box Tracker — Control de cajas por sesión de producción
-- =============================================================
-- Permite registrar el peso de cada caja producida en tiempo real,
-- llevar el conteo total y peso acumulado por cliente/producto/turno.

-- ── Sesiones de producción ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.box_sessions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  production_order_id  uuid REFERENCES public.production_orders(id),
  client_name          text NOT NULL,
  product_name         text NOT NULL,
  shift_date           date NOT NULL DEFAULT CURRENT_DATE,
  started_by           uuid REFERENCES public.profiles(id),
  status               text NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active', 'completed', 'cancelled')),
  target_boxes         int,
  target_weight_lbs    numeric(10,2),
  notes                text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  completed_at         timestamptz
);

-- ── Registros individuales de cajas ──────────────────────────
CREATE TABLE IF NOT EXISTS public.box_entries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid NOT NULL REFERENCES public.box_sessions(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  box_number      int  NOT NULL,
  weight_lbs      numeric(8,2) NOT NULL CHECK (weight_lbs > 0),
  logged_by       uuid REFERENCES public.profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  notes           text
);

-- ── Índices ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS box_sessions_org_idx    ON public.box_sessions(organization_id);
CREATE INDEX IF NOT EXISTS box_sessions_date_idx   ON public.box_sessions(shift_date DESC);
CREATE INDEX IF NOT EXISTS box_sessions_status_idx ON public.box_sessions(status);
CREATE INDEX IF NOT EXISTS box_entries_session_idx ON public.box_entries(session_id);
CREATE INDEX IF NOT EXISTS box_entries_created_idx ON public.box_entries(created_at DESC);

-- ── Row Level Security ────────────────────────────────────────
ALTER TABLE public.box_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.box_entries  ENABLE ROW LEVEL SECURITY;

-- Sessions: SELECT
CREATE POLICY "box_sessions_select" ON public.box_sessions
  FOR SELECT USING (
    organization_id = (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Sessions: INSERT
CREATE POLICY "box_sessions_insert" ON public.box_sessions
  FOR INSERT WITH CHECK (
    organization_id = (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Sessions: UPDATE (close session, add notes)
CREATE POLICY "box_sessions_update" ON public.box_sessions
  FOR UPDATE USING (
    organization_id = (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Entries: SELECT
CREATE POLICY "box_entries_select" ON public.box_entries
  FOR SELECT USING (
    organization_id = (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Entries: INSERT
CREATE POLICY "box_entries_insert" ON public.box_entries
  FOR INSERT WITH CHECK (
    organization_id = (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Entries: DELETE (para corregir errores de captura)
CREATE POLICY "box_entries_delete" ON public.box_entries
  FOR DELETE USING (
    organization_id = (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );
