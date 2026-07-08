-- ============================================================
-- 019_inventory_movement_reference.sql
-- Adds free-text reference to inventory movements (the UI lets
-- users type "ORD-2024-001" / "Factura #123" — reference_id is a
-- UUID and can't hold that).
-- ============================================================

ALTER TABLE inventory_movements
  ADD COLUMN IF NOT EXISTS reference TEXT;
