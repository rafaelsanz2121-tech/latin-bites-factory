-- ============================================================
-- Migration 007: Seed Data — Areas and Products
-- ============================================================

-- Areas (11 plant areas)
INSERT INTO public.areas (code, name, description) VALUES
  ('KITCHEN',                   'Kitchen Area',                  'Main production kitchen with fryers, ovens, and prep stations'),
  ('PACKING',                   'Packing Area',                  'Product packaging and sealing area'),
  ('DRY_STORAGE',               'Dry Storage',                   'Ambient temperature dry goods storage'),
  ('SHIPPING_RECEIVING',        'Shipping / Receiving',          'Dock area for inbound and outbound products'),
  ('WALK_IN_FREEZER_1',         'Walk-In Freezer #1',            'Primary frozen product storage'),
  ('WALK_IN_FREEZER_2',         'Walk-In Freezer #2',            'Secondary frozen product storage'),
  ('WALK_IN_COOLER_1',          'Walk-In Cooler #1',             'Refrigerated product storage'),
  ('WALK_IN_COOLER_2_PRODUCTION','Walk-In Cooler #2 – Production','Production-adjacent cooler'),
  ('EMPLOYEE_LOUNGE',           'Employees Lounge',              'Employee break room'),
  ('RESTROOMS',                 'Employee Restrooms',            'Staff restroom facilities'),
  ('OUTSIDE_PREMISES',          'Outside Premises',              'Exterior grounds and dumpster area')
ON CONFLICT (code) DO NOTHING;

-- Products
INSERT INTO public.products (code, name, description) VALUES
  ('PORK_BELLY',          'Pork Belly',                     'Whole pork belly — primary product'),
  ('CHICHARRON',          'Chicharrón',                     'Fried pork rinds'),
  ('BUNUELOS',            'Buñuelos',                       'Fried dough pastry'),
  ('PORK_BELLY_BROWNED',  'Pork Belly – Browned',           'CCP 1B(2): Browned pork belly ≤145°F'),
  ('PORK_BELLY_PARTIAL',  'Pork Belly – Partially Cooked',  'CCP 1B(1): Partially cooked pork belly 145–150°F')
ON CONFLICT (code) DO NOTHING;

-- ─── SAMPLE / DEMO DATA ──────────────────────────────────────────────────────
-- (Remove before production deployment)

-- Sample lot
-- NOTE: You must create real users via Supabase Auth first,
-- then the profile trigger will insert their profiles automatically.
-- Run this seed AFTER creating your first admin user.

-- To create an admin user:
-- 1. Sign up via the login page
-- 2. Run in Supabase SQL editor:
--    UPDATE public.profiles SET role = 'admin' WHERE id = '<your-user-id>';
