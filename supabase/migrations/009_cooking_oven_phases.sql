-- Migration 009: Add oven phase tracking to cooking_chilling_logs
-- Tracks: oven entry time/temp, oven exit time/temp, oven setpoint
-- The cooler entry (chilling_start_time / chilling_start_temp_f) already exists.

ALTER TABLE cooking_chilling_logs
  ADD COLUMN IF NOT EXISTS oven_in_time        TIME,
  ADD COLUMN IF NOT EXISTS oven_in_temp_f      NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS oven_out_time       TIME,
  ADD COLUMN IF NOT EXISTS oven_out_temp_f     NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS oven_setpoint_f     NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS lot_batch_number    TEXT;

-- Add helpful comments
COMMENT ON COLUMN cooking_chilling_logs.oven_in_time     IS 'Time product entered the oven';
COMMENT ON COLUMN cooking_chilling_logs.oven_in_temp_f   IS 'Internal product temp at oven entry (°F)';
COMMENT ON COLUMN cooking_chilling_logs.oven_out_time    IS 'Time product exited the oven';
COMMENT ON COLUMN cooking_chilling_logs.oven_out_temp_f  IS 'Internal product temp at oven exit (°F) — CCP critical limit';
COMMENT ON COLUMN cooking_chilling_logs.oven_setpoint_f  IS 'Oven thermostat setpoint (°F)';
COMMENT ON COLUMN cooking_chilling_logs.lot_batch_number IS 'Lot or batch number for traceability';
