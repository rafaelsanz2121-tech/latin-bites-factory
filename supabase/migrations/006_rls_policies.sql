-- ============================================================
-- Migration 006: Row-Level Security Policies
-- ============================================================
-- Pattern:
--   operators: see/edit own records only
--   supervisors: see all, verify (not own), assign CAPAs
--   qa: see all, approve (not own), close deviations/CAPAs
--   admin: full access

-- Helper: check caller's role
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

-- ─── RECEIVING LOGS ──────────────────────────────────────────────────────────
CREATE POLICY "receiving_select" ON public.receiving_logs
  FOR SELECT USING (
    created_by = auth.uid()
    OR get_my_role() IN ('admin','qa','supervisor')
  );

CREATE POLICY "receiving_insert" ON public.receiving_logs
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "receiving_update" ON public.receiving_logs
  FOR UPDATE USING (
    (status NOT IN ('locked') AND created_by = auth.uid())
    OR get_my_role() IN ('admin','qa','supervisor')
  );

-- ─── THAWING LOGS ────────────────────────────────────────────────────────────
CREATE POLICY "thawing_select" ON public.thawing_logs
  FOR SELECT USING (
    created_by = auth.uid()
    OR get_my_role() IN ('admin','qa','supervisor')
  );

CREATE POLICY "thawing_insert" ON public.thawing_logs
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "thawing_update" ON public.thawing_logs
  FOR UPDATE USING (
    (status NOT IN ('locked') AND (created_by = auth.uid() OR get_my_role() IN ('admin','qa','supervisor')))
    OR get_my_role() IN ('admin','qa')  -- can reopen locked
  );

-- ─── COOKING / CHILLING LOGS ─────────────────────────────────────────────────
CREATE POLICY "cooking_select" ON public.cooking_chilling_logs
  FOR SELECT USING (
    created_by = auth.uid()
    OR get_my_role() IN ('admin','qa','supervisor')
  );

CREATE POLICY "cooking_insert" ON public.cooking_chilling_logs
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "cooking_update" ON public.cooking_chilling_logs
  FOR UPDATE USING (
    (status NOT IN ('locked') AND (created_by = auth.uid() OR get_my_role() IN ('admin','qa','supervisor')))
    OR get_my_role() IN ('admin','qa')
  );

-- ─── CALIBRATION LOGS ────────────────────────────────────────────────────────
CREATE POLICY "calibration_select" ON public.calibration_logs
  FOR SELECT USING (
    created_by = auth.uid()
    OR get_my_role() IN ('admin','qa','supervisor')
  );

CREATE POLICY "calibration_insert" ON public.calibration_logs
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "calibration_update" ON public.calibration_logs
  FOR UPDATE USING (
    (status NOT IN ('locked') AND (created_by = auth.uid() OR get_my_role() IN ('admin','qa','supervisor')))
    OR get_my_role() IN ('admin','qa')
  );

-- ─── PRE-OP SANITATION ───────────────────────────────────────────────────────
CREATE POLICY "preop_select" ON public.preop_sanitation_reports
  FOR SELECT USING (
    created_by = auth.uid()
    OR get_my_role() IN ('admin','qa','supervisor')
  );

CREATE POLICY "preop_insert" ON public.preop_sanitation_reports
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "preop_update" ON public.preop_sanitation_reports
  FOR UPDATE USING (
    (status NOT IN ('locked') AND (created_by = auth.uid() OR get_my_role() IN ('admin','qa','supervisor')))
    OR get_my_role() IN ('admin','qa')
  );

-- ─── OPERATIONAL SANITATION ──────────────────────────────────────────────────
CREATE POLICY "ops_sanitation_select" ON public.operational_sanitation_logs
  FOR SELECT USING (
    created_by = auth.uid()
    OR get_my_role() IN ('admin','qa','supervisor')
  );

CREATE POLICY "ops_sanitation_insert" ON public.operational_sanitation_logs
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "ops_sanitation_update" ON public.operational_sanitation_logs
  FOR UPDATE USING (
    (status NOT IN ('locked') AND (created_by = auth.uid() OR get_my_role() IN ('admin','qa','supervisor')))
    OR get_my_role() IN ('admin','qa')
  );

-- ─── PRE-SHIPMENT REVIEWS ─────────────────────────────────────────────────────
CREATE POLICY "preshipment_select" ON public.preshipment_reviews
  FOR SELECT USING (get_my_role() IN ('admin','qa','supervisor'));

CREATE POLICY "preshipment_insert" ON public.preshipment_reviews
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
    AND get_my_role() IN ('admin','qa','supervisor')
  );

CREATE POLICY "preshipment_update" ON public.preshipment_reviews
  FOR UPDATE USING (get_my_role() IN ('admin','qa','supervisor'));

-- ─── DEVIATIONS ──────────────────────────────────────────────────────────────
CREATE POLICY "deviations_select" ON public.deviations
  FOR SELECT USING (
    identified_by = auth.uid()
    OR get_my_role() IN ('admin','qa','supervisor')
  );

CREATE POLICY "deviations_insert" ON public.deviations
  FOR INSERT WITH CHECK (identified_by = auth.uid());

CREATE POLICY "deviations_update" ON public.deviations
  FOR UPDATE USING (
    identified_by = auth.uid()
    OR get_my_role() IN ('admin','qa','supervisor')
  );

-- ─── CORRECTIVE ACTIONS ───────────────────────────────────────────────────────
CREATE POLICY "corrective_actions_select" ON public.corrective_actions
  FOR SELECT USING (
    assigned_to = auth.uid()
    OR assigned_by = auth.uid()
    OR get_my_role() IN ('admin','qa','supervisor')
  );

CREATE POLICY "corrective_actions_insert" ON public.corrective_actions
  FOR INSERT WITH CHECK (
    get_my_role() IN ('admin','qa','supervisor')
  );

CREATE POLICY "corrective_actions_update" ON public.corrective_actions
  FOR UPDATE USING (
    assigned_to = auth.uid()
    OR get_my_role() IN ('admin','qa','supervisor')
  );

-- ─── INDEXES ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_thawing_date ON public.thawing_logs(date DESC);
CREATE INDEX IF NOT EXISTS idx_thawing_status ON public.thawing_logs(status);
CREATE INDEX IF NOT EXISTS idx_thawing_created_by ON public.thawing_logs(created_by);
CREATE INDEX IF NOT EXISTS idx_receiving_date ON public.receiving_logs(date DESC);
CREATE INDEX IF NOT EXISTS idx_cooking_date ON public.cooking_chilling_logs(date DESC);
CREATE INDEX IF NOT EXISTS idx_calibration_date ON public.calibration_logs(date DESC);
CREATE INDEX IF NOT EXISTS idx_deviations_status ON public.deviations(status);
CREATE INDEX IF NOT EXISTS idx_deviations_severity ON public.deviations(severity);
CREATE INDEX IF NOT EXISTS idx_corrective_due_date ON public.corrective_actions(due_date);
CREATE INDEX IF NOT EXISTS idx_corrective_status ON public.corrective_actions(status);
CREATE INDEX IF NOT EXISTS idx_audit_trail_record ON public.audit_trail(table_name, record_id);
