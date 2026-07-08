-- ============================================================
-- 020_inventory_delete_policy.sql
-- Migration 012 only created SELECT/INSERT/UPDATE policies, so
-- deleting inventory rows was silently blocked by RLS. Needed
-- for the "Eliminar artículo" button.
-- Deleting an item cascades to its movements (FK ON DELETE CASCADE).
-- ============================================================

DROP POLICY IF EXISTS "delete_own_org" ON inventory_items;
CREATE POLICY "delete_own_org" ON inventory_items
  FOR DELETE USING (organization_id = current_org_id());

DROP POLICY IF EXISTS "delete_own_org" ON inventory_movements;
CREATE POLICY "delete_own_org" ON inventory_movements
  FOR DELETE USING (organization_id = current_org_id());
