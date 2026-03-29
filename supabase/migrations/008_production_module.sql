-- ============================================================
-- Migration 008: Production Module — Clients, Recipes, Orders
-- ============================================================

-- ─── CLIENTS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clients (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name  text NOT NULL,
  contact_name  text,
  phone         text,
  email         text,
  address       text,
  notes         text,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER clients_updated_at BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER clients_audit AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW EXECUTE PROCEDURE public.audit_log_changes();

-- ─── RECIPES ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.recipes (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id            uuid NOT NULL REFERENCES public.clients(id),
  product_id           uuid NOT NULL REFERENCES public.products(id),
  recipe_name          text NOT NULL,
  description          text,
  special_instructions text,
  seasoning_notes      text,        -- e.g. salt levels, spice mix
  packaging_spec       text,        -- e.g. "2lb vacuum sealed bags"
  allergen_notes       text,
  is_active            boolean NOT NULL DEFAULT true,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, product_id, recipe_name)
);

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER recipes_updated_at BEFORE UPDATE ON public.recipes
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER recipes_audit AFTER INSERT OR UPDATE OR DELETE ON public.recipes
  FOR EACH ROW EXECUTE PROCEDURE public.audit_log_changes();

-- ─── PRODUCTION ORDERS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.production_orders (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number             text NOT NULL UNIQUE,  -- auto like PO-2026-03-28-001
  client_id                uuid NOT NULL REFERENCES public.clients(id),
  product_id               uuid NOT NULL REFERENCES public.products(id),
  recipe_id                uuid REFERENCES public.recipes(id),
  lot_id                   uuid REFERENCES public.lots(id),  -- raw material lot used
  quantity_lbs             numeric(10,2) NOT NULL,
  order_date               date NOT NULL,
  scheduled_date           date,
  status                   text NOT NULL DEFAULT 'planned'
                             CHECK (status IN (
                               'planned','in_production','cooking','chilling',
                               'packaging','refrigerating','ready','shipped','cancelled'
                             )),
  -- Phase timestamps (auto-set when status changes)
  production_started_at    timestamptz,
  cooking_started_at       timestamptz,
  chilling_started_at      timestamptz,
  packaging_started_at     timestamptz,
  refrigerating_started_at timestamptz,
  ready_at                 timestamptz,
  shipped_at               timestamptz,
  -- Tracking
  created_by               uuid NOT NULL REFERENCES public.profiles(id),
  notes                    text,
  internal_temp_final      numeric(5,2),  -- final product temp before shipping
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.production_orders ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER production_orders_updated_at BEFORE UPDATE ON public.production_orders
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER production_orders_audit AFTER INSERT OR UPDATE OR DELETE ON public.production_orders
  FOR EACH ROW EXECUTE PROCEDURE public.audit_log_changes();

-- ─── FUNCTION: auto-stamp phase timestamps on status change ──────────────────
CREATE OR REPLACE FUNCTION public.stamp_production_phase_timestamps()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'in_production' AND OLD.status != 'in_production' THEN
    NEW.production_started_at := COALESCE(NEW.production_started_at, now());
  END IF;
  IF NEW.status = 'cooking' AND OLD.status != 'cooking' THEN
    NEW.cooking_started_at := COALESCE(NEW.cooking_started_at, now());
  END IF;
  IF NEW.status = 'chilling' AND OLD.status != 'chilling' THEN
    NEW.chilling_started_at := COALESCE(NEW.chilling_started_at, now());
  END IF;
  IF NEW.status = 'packaging' AND OLD.status != 'packaging' THEN
    NEW.packaging_started_at := COALESCE(NEW.packaging_started_at, now());
  END IF;
  IF NEW.status = 'refrigerating' AND OLD.status != 'refrigerating' THEN
    NEW.refrigerating_started_at := COALESCE(NEW.refrigerating_started_at, now());
  END IF;
  IF NEW.status = 'ready' AND OLD.status != 'ready' THEN
    NEW.ready_at := COALESCE(NEW.ready_at, now());
  END IF;
  IF NEW.status = 'shipped' AND OLD.status != 'shipped' THEN
    NEW.shipped_at := COALESCE(NEW.shipped_at, now());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER production_orders_phase_timestamps
  BEFORE UPDATE ON public.production_orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE PROCEDURE public.stamp_production_phase_timestamps();

-- ─── FUNCTION: generate order_number ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_production_order_number()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  date_part   text;
  seq_num     int;
  candidate   text;
BEGIN
  IF NEW.order_number IS NOT NULL AND NEW.order_number != '' THEN
    RETURN NEW;
  END IF;

  date_part := to_char(NEW.order_date, 'YYYY-MM-DD');

  SELECT COUNT(*) + 1
    INTO seq_num
    FROM public.production_orders
   WHERE order_number LIKE 'PO-' || date_part || '-%';

  candidate := 'PO-' || date_part || '-' || LPAD(seq_num::text, 3, '0');

  -- Guard against duplicates on concurrent inserts
  WHILE EXISTS (SELECT 1 FROM public.production_orders WHERE order_number = candidate) LOOP
    seq_num := seq_num + 1;
    candidate := 'PO-' || date_part || '-' || LPAD(seq_num::text, 3, '0');
  END LOOP;

  NEW.order_number := candidate;
  RETURN NEW;
END;
$$;

CREATE TRIGGER production_orders_set_order_number
  BEFORE INSERT ON public.production_orders
  FOR EACH ROW
  EXECUTE PROCEDURE public.generate_production_order_number();

-- ─── RLS POLICIES: CLIENTS ───────────────────────────────────────────────────

-- All authenticated users can read clients
CREATE POLICY "clients_select" ON public.clients
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Admin and supervisor can insert
CREATE POLICY "clients_insert" ON public.clients
  FOR INSERT WITH CHECK (
    get_my_role() IN ('admin', 'supervisor')
  );

-- Admin and supervisor can update
CREATE POLICY "clients_update" ON public.clients
  FOR UPDATE USING (
    get_my_role() IN ('admin', 'supervisor')
  );

-- Only admin can delete
CREATE POLICY "clients_delete" ON public.clients
  FOR DELETE USING (
    get_my_role() = 'admin'
  );

-- ─── RLS POLICIES: RECIPES ───────────────────────────────────────────────────

-- All authenticated users can read recipes
CREATE POLICY "recipes_select" ON public.recipes
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Admin and supervisor can insert
CREATE POLICY "recipes_insert" ON public.recipes
  FOR INSERT WITH CHECK (
    get_my_role() IN ('admin', 'supervisor')
  );

-- Admin and supervisor can update
CREATE POLICY "recipes_update" ON public.recipes
  FOR UPDATE USING (
    get_my_role() IN ('admin', 'supervisor')
  );

-- Only admin can delete
CREATE POLICY "recipes_delete" ON public.recipes
  FOR DELETE USING (
    get_my_role() = 'admin'
  );

-- ─── RLS POLICIES: PRODUCTION ORDERS ─────────────────────────────────────────

-- All authenticated users can read production orders
CREATE POLICY "production_orders_select" ON public.production_orders
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Admin and supervisor can insert
CREATE POLICY "production_orders_insert" ON public.production_orders
  FOR INSERT WITH CHECK (
    get_my_role() IN ('admin', 'supervisor')
  );

-- Admin and supervisor can update
CREATE POLICY "production_orders_update" ON public.production_orders
  FOR UPDATE USING (
    get_my_role() IN ('admin', 'supervisor')
  );

-- Only admin can delete
CREATE POLICY "production_orders_delete" ON public.production_orders
  FOR DELETE USING (
    get_my_role() = 'admin'
  );

-- ─── SEED DATA: SAMPLE CLIENTS ───────────────────────────────────────────────

INSERT INTO public.clients (company_name, contact_name, phone, email, notes) VALUES
  (
    'Latino Foods Co.',
    'Carlos Mendoza',
    '(305) 555-0101',
    'carlos@latinofoodsco.com',
    'Primary distribution client — high volume chicharrón and pork belly orders'
  ),
  (
    'Sabor Latino Market',
    'Maria Gutierrez',
    '(786) 555-0142',
    'orders@saborlatinomarket.com',
    'Regional market chain — specializes in traditional buñuelos and seasonal items'
  ),
  (
    'El Rancho Distributors',
    'Roberto Herrera',
    '(954) 555-0178',
    'rherrera@elranchoDist.com',
    'Wholesale distributor serving South Florida — multi-product client'
  )
ON CONFLICT DO NOTHING;
