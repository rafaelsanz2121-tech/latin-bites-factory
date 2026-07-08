-- ============================================================
-- 021_custom_categories.sql
-- Allow user-defined inventory categories. The category CHECK
-- constraint locked items to 5 fixed values; custom categories
-- are stored by name and saved to inventory_categories (which
-- already existed in 012 but was unused).
-- ============================================================

ALTER TABLE inventory_items
  DROP CONSTRAINT IF EXISTS inventory_items_category_check;

-- Avoid duplicate category names per organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_inv_categories_org_name
  ON inventory_categories(organization_id, lower(name));
