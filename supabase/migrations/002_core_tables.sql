-- ============================================================
-- Migration 002: Products, Lots, Status Enum, CCP Types
-- ============================================================

-- Products
CREATE TABLE IF NOT EXISTS public.products (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text UNIQUE NOT NULL,
  name        text NOT NULL,
  description text,
  is_active   boolean NOT NULL DEFAULT true
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_select_all" ON public.products FOR SELECT USING (true);
CREATE POLICY "products_admin_modify" ON public.products FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Lots / Batches
CREATE TABLE IF NOT EXISTS public.lots (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_number      text NOT NULL,
  product_id      uuid NOT NULL REFERENCES public.products(id),
  received_date   date,
  quantity_lbs    numeric(10, 2),
  supplier        text,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lots_authenticated" ON public.lots FOR ALL USING (auth.role() = 'authenticated');

-- Audit trail (append-only)
CREATE TABLE IF NOT EXISTS public.audit_trail (
  id            bigserial PRIMARY KEY,
  table_name    text NOT NULL,
  record_id     uuid NOT NULL,
  action        text NOT NULL CHECK (action IN ('insert','update','delete','status_change','lock','unlock')),
  changed_by    uuid REFERENCES public.profiles(id),
  changed_at    timestamptz NOT NULL DEFAULT now(),
  old_values    jsonb,
  new_values    jsonb
);

ALTER TABLE public.audit_trail ENABLE ROW LEVEL SECURITY;
-- No UPDATE or DELETE policies — append-only
CREATE POLICY "audit_trail_select" ON public.audit_trail FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'qa', 'supervisor'))
);
CREATE POLICY "audit_trail_insert" ON public.audit_trail FOR INSERT WITH CHECK (true);

-- Audit trail trigger factory function
CREATE OR REPLACE FUNCTION public.audit_log_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_trail (table_name, record_id, action, changed_by, new_values)
    VALUES (TG_TABLE_NAME, NEW.id, 'insert', auth.uid(), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_trail (table_name, record_id, action, changed_by, old_values, new_values)
    VALUES (TG_TABLE_NAME, NEW.id, 'update', auth.uid(), to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_trail (table_name, record_id, action, changed_by, old_values)
    VALUES (TG_TABLE_NAME, OLD.id, 'delete', auth.uid(), to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Audit exports tracking
CREATE TABLE IF NOT EXISTS public.audit_exports (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exported_by   uuid NOT NULL REFERENCES public.profiles(id),
  export_type   text NOT NULL,
  date_from     date NOT NULL,
  date_to       date NOT NULL,
  filters       jsonb,
  file_url      text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_exports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_exports_own" ON public.audit_exports FOR SELECT USING (
  exported_by = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'qa'))
);
CREATE POLICY "audit_exports_insert" ON public.audit_exports FOR INSERT WITH CHECK (
  auth.uid() = exported_by
);
