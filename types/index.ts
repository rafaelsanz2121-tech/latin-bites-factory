// ─── Roles ───────────────────────────────────────────────────────────────────
export type UserRole = "admin" | "supervisor" | "qa" | "operator"

// ─── Log Status ──────────────────────────────────────────────────────────────
export type LogStatus = "draft" | "submitted" | "verified" | "approved" | "locked" | "reopened"

// ─── Profile ─────────────────────────────────────────────────────────────────
export interface Profile {
  id: string
  full_name: string
  employee_id: string | null
  initials: string
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
}

// ─── Area ────────────────────────────────────────────────────────────────────
export interface Area {
  id: string
  code: string
  name: string
  description: string | null
  is_active: boolean
}

// ─── Product ─────────────────────────────────────────────────────────────────
export interface Product {
  id: string
  code: string
  name: string
  description: string | null
  is_active: boolean
}

// ─── Lot ─────────────────────────────────────────────────────────────────────
export interface Lot {
  id: string
  lot_number: string
  product_id: string
  received_date: string | null
  quantity_lbs: number | null
  supplier: string | null
  notes: string | null
  created_at: string
  product?: Product
}

// ─── Thawing Log ─────────────────────────────────────────────────────────────
export type ThawingMethod = "cooler" | "running_water"

export interface ThawingLog {
  id: string
  status: LogStatus
  date: string
  product_id: string
  lot_id: string | null
  lot_batch_number: string | null
  thawing_method: ThawingMethod
  start_time: string
  start_temp_f: number
  end_time: string | null
  end_temp_f: number | null
  water_temp_f: number | null
  notes: string | null
  created_by: string
  employee_initials: string | null
  submitted_at: string | null
  verified_by: string | null
  verified_at: string | null
  approved_by: string | null
  approved_at: string | null
  locked_at: string | null
  created_at: string
  updated_at: string
  // joined fields
  product?: Product
  lot?: Lot
  creator?: Profile
  verifier?: Profile
  approver?: Profile
}

// ─── Receiving Log ────────────────────────────────────────────────────────────
export interface ReceivingLog {
  id: string
  status: LogStatus
  date: string
  time_received: string
  product_id: string | null
  lot_id: string | null
  supplier: string
  quantity_lbs: number | null
  internal_temp_f: number | null
  packaging_condition: "acceptable" | "deficient" | null
  labeling_ok: boolean | null
  vehicle_temp_f: number | null
  notes: string | null
  created_by: string
  submitted_at: string | null
  verified_by: string | null
  verified_at: string | null
  approved_by: string | null
  approved_at: string | null
  locked_at: string | null
  created_at: string
  updated_at: string
  product?: Product
  lot?: Lot
  creator?: Profile
  verifier?: Profile
  approver?: Profile
}

// ─── CCP Types ────────────────────────────────────────────────────────────────
export type CcpType = "CCP_1B" | "CCP_1B_1" | "CCP_1B_2" | "CCP_2B" | "CCP_2B_1"

export interface TemperatureReading {
  time: string
  temp_f: number
  initials: string
  notes?: string
}

export interface CookingChillingLog {
  id: string
  status: LogStatus
  log_type: "cooking" | "chilling"
  ccp_number: CcpType
  date: string
  product_id: string
  lot_id: string | null
  readings: TemperatureReading[]
  chilling_start_time: string | null
  chilling_start_temp_f: number | null
  phase_one_end_time: string | null
  phase_one_end_temp_f: number | null
  phase_two_end_time: string | null
  phase_two_end_temp_f: number | null
  verification_date: string | null
  observation_time: string | null
  observation_by: string | null
  review_time: string | null
  review_by: string | null
  thermometer_calibrated: boolean | null
  notes: string | null
  created_by: string
  submitted_at: string | null
  verified_by: string | null
  verified_at: string | null
  approved_by: string | null
  approved_at: string | null
  locked_at: string | null
  created_at: string
  updated_at: string
  product?: Product
  lot?: Lot
  creator?: Profile
}

// ─── Calibration Log ─────────────────────────────────────────────────────────
export interface CalibrationLog {
  id: string
  status: LogStatus
  date: string
  thermometer_id: string
  thermometer_type: string | null
  ice_water_reference_f: number
  ice_water_reading_f: number
  is_in_tolerance: boolean
  corrective_action_taken: string | null
  notes: string | null
  created_by: string
  submitted_at: string | null
  verified_by: string | null
  verified_at: string | null
  approved_by: string | null
  approved_at: string | null
  locked_at: string | null
  created_at: string
  updated_at: string
  creator?: Profile
  verifier?: Profile
  approver?: Profile
}

// ─── Sanitation ───────────────────────────────────────────────────────────────
export type SanitationSection =
  | "A_KITCHEN"
  | "B_PACKING"
  | "C_DRY_STORAGE"
  | "D_SHIPPING_RECEIVING"
  | "E_EMPLOYEE_LOUNGE"
  | "F_EMPLOYEE_RESTROOMS"
  | "G_OUTSIDE_PREMISES"
  | "H_WALK_IN_FREEZER_1"
  | "I_WALK_IN_FREEZER_2"
  | "J_WALK_IN_COOLER_1"
  | "K_WALK_IN_COOLER_2_PRODUCTION"

export type SanitationScore = "acceptable" | "deficiency" | "na"
export type SanitationPeriod = "am" | "pm" | "single"

export interface PreopSanitationItem {
  id: string
  report_id: string
  section: SanitationSection
  item_key: string
  item_label: string
  score: SanitationScore | null
  period: SanitationPeriod
  notes: string | null
  sort_order: number
}

export interface PreopSanitationReport {
  id: string
  status: LogStatus
  report_date: string
  area_id: string | null
  inspection_time: string
  notes: string | null
  created_by: string
  submitted_at: string | null
  verified_by: string | null
  verified_at: string | null
  approved_by: string | null
  approved_at: string | null
  locked_at: string | null
  created_at: string
  updated_at: string
  items?: PreopSanitationItem[]
  creator?: Profile
}

export interface InspectionBlock {
  block_number: number
  time: string
  inspector_initials: string
  is_changeover: boolean
  items: {
    equipment: string | null
    product_handling: string | null
    employee_hygiene: string | null
    condensation: string | null
    cleanliness: string | null
    freezers_coolers: string | null
    dry_storage: string | null
    shipping_receiving: string | null
  }
  notes: string
}

export interface OperationalSanitationLog {
  id: string
  status: LogStatus
  log_date: string
  inspection_blocks: InspectionBlock[]
  sanitizer_check_done: boolean
  sanitizer_before_ppm: number | null
  sanitizer_after_ppm: number | null
  sanitizer_max_ppm: number
  sanitizer_in_range: boolean | null
  blades_before_ok: boolean | null
  blades_after_ok: boolean | null
  notes: string | null
  created_by: string
  submitted_at: string | null
  verified_by: string | null
  verified_at: string | null
  approved_by: string | null
  approved_at: string | null
  locked_at: string | null
  created_at: string
  updated_at: string
  creator?: Profile
}

// ─── Pre-Shipment ─────────────────────────────────────────────────────────────
export interface PreshipmentReview {
  id: string
  status: LogStatus
  review_date: string
  lot_id: string
  product_id: string
  all_ccps_met: boolean | null
  cooking_log_id: string | null
  thawing_log_id: string | null
  calibration_log_id: string | null
  any_deviations: boolean
  deviation_ids: string[]
  disposition: "approved_for_shipment" | "hold" | "destroyed" | null
  disposition_notes: string | null
  notes: string | null
  created_by: string
  submitted_at: string | null
  verified_by: string | null
  verified_at: string | null
  approved_by: string | null
  approved_at: string | null
  locked_at: string | null
  created_at: string
  updated_at: string
  product?: Product
  lot?: Lot
  creator?: Profile
}

// ─── Deviations ───────────────────────────────────────────────────────────────
export type DeviationSeverity = "critical" | "major" | "minor"
export type DeviationStatus = "open" | "under_review" | "corrective_action_pending" | "closed"

export interface Deviation {
  id: string
  severity: DeviationSeverity
  status: DeviationStatus
  date_identified: string
  identified_by: string
  area_id: string | null
  source_log_type: string | null
  source_log_id: string | null
  description: string
  immediate_action: string | null
  usda_notified: boolean
  usda_notification_date: string | null
  closed_by: string | null
  closed_at: string | null
  closure_notes: string | null
  created_at: string
  updated_at: string
  area?: Area
  identifier?: Profile
  closer?: Profile
}

// ─── Corrective Actions ───────────────────────────────────────────────────────
export type CapaType = "corrective" | "preventive"
export type CapaStatus = "open" | "in_progress" | "pending_verification" | "closed"

export interface CorrectiveAction {
  id: string
  capa_type: CapaType
  status: CapaStatus
  deviation_id: string | null
  date_opened: string
  assigned_to: string
  assigned_by: string
  root_cause: string
  action_description: string
  due_date: string
  completed_by: string | null
  completed_at: string | null
  completion_notes: string | null
  verified_effective_by: string | null
  verified_effective_at: string | null
  verification_notes: string | null
  preventive_measure: string | null
  preventive_due_date: string | null
  created_at: string
  updated_at: string
  assignee?: Profile
  assigner?: Profile
  deviation?: Deviation
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
export interface DashboardStats {
  logs_today: number
  pending_approval: number
  open_deviations: number
  overdue_capas: number
  compliance_rate: number
  critical_alerts: number
}

// ─── Production Module ────────────────────────────────────────────────────────

export interface Client {
  id: string
  company_name: string
  contact_name: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Recipe {
  id: string
  client_id: string
  product_id: string
  recipe_name: string
  description: string | null
  special_instructions: string | null
  seasoning_notes: string | null
  packaging_spec: string | null
  allergen_notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  // joins
  clients?: Pick<Client, 'company_name'>
  products?: Pick<Product, 'name' | 'code'>
}

export type ProductionStatus =
  | 'planned' | 'in_production' | 'cooking' | 'chilling'
  | 'packaging' | 'refrigerating' | 'ready' | 'shipped' | 'cancelled'

export interface ProductionOrder {
  id: string
  order_number: string
  client_id: string
  product_id: string
  recipe_id: string | null
  lot_id: string | null
  quantity_lbs: number
  order_date: string
  scheduled_date: string | null
  status: ProductionStatus
  production_started_at: string | null
  cooking_started_at: string | null
  chilling_started_at: string | null
  packaging_started_at: string | null
  refrigerating_started_at: string | null
  ready_at: string | null
  shipped_at: string | null
  created_by: string
  notes: string | null
  internal_temp_final: number | null
  created_at: string
  updated_at: string
  // joins
  clients?: Pick<Client, 'company_name'>
  products?: Pick<Product, 'name' | 'code'>
  recipes?: Pick<Recipe, 'recipe_name'>
  lots?: Pick<Lot, 'lot_number'>
}
