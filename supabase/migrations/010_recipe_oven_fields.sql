-- Migration 010: Add oven configuration fields to recipes
-- Each client recipe can specify their exact oven temp and duration

ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS oven_temp_f          NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS oven_duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS cooking_notes         TEXT,
  ADD COLUMN IF NOT EXISTS description           TEXT;

COMMENT ON COLUMN public.recipes.oven_temp_f          IS 'Customer-specified oven temperature (°F)';
COMMENT ON COLUMN public.recipes.oven_duration_minutes IS 'Customer-specified cook time in minutes';
COMMENT ON COLUMN public.recipes.cooking_notes         IS 'Specific cooking instructions for this client recipe';
COMMENT ON COLUMN public.recipes.description           IS 'General description of the recipe';
