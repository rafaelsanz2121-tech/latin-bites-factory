import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { formatDate, formatDateTime } from "@/lib/utils"
import type { Metadata } from "next"

interface Props { params: Promise<{ module: string; id: string }> }

const MODULE_TABLE_MAP: Record<string, string> = {
  thawing: "thawing_logs",
  receiving: "receiving_logs",
  cooking: "cooking_chilling_logs",
  calibration: "calibration_logs",
  preshipment: "preshipment_reviews",
  deviation: "deviations",
  "corrective-action": "corrective_actions",
}

const MODULE_LABELS: Record<string, string> = {
  thawing: "Thawing Log",
  receiving: "Receiving Log",
  cooking: "Cooking & Chilling Log",
  calibration: "Thermometer Calibration Log",
  preshipment: "Pre-Shipment Review",
  deviation: "Deviation Report",
  "corrective-action": "Corrective Action Record",
}

// Fields to hide — raw IDs / internal timestamps
const SKIP_FIELDS = new Set([
  "id", "created_by", "verified_by", "approved_by", "updated_at",
  "submitted_by", "locked_by", "completed_by", "verified_effective_by",
  "closed_by", "assigned_by",
])

// Human-readable label for a DB column name
function fieldLabel(key: string): string {
  return key
    .replace(/_f$/, " (°F)")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

// Format a raw value for display
function fieldValue(v: unknown): string {
  if (v === null || v === undefined) return "—"
  if (typeof v === "boolean") return v ? "Yes" : "No"
  if (typeof v === "object") return JSON.stringify(v, null, 2)
  const s = String(v)
  // Detect ISO timestamps
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return formatDateTime(s)
  // Detect date-only
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return formatDate(s)
  return s || "—"
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { module } = await params
  return { title: `${MODULE_LABELS[module] ?? "Record"} — FactorOS` }
}

export default async function PrintPage({ params }: Props) {
  const { module, id } = await params
  const supabase = await createClient()

  const table = MODULE_TABLE_MAP[module]
  if (!table) notFound()

  const { data: record } = await supabase.from(table).select("*").eq("id", id).single()
  if (!record) notFound()

  // Fetch names for UUID references
  async function getName(userId: string | null): Promise<string> {
    if (!userId) return "—"
    const { data } = await supabase.from("profiles").select("full_name").eq("id", userId).single()
    return data?.full_name ?? "—"
  }

  const [creatorName, verifierName, approverName] = await Promise.all([
    getName(record.created_by ?? null),
    getName(record.verified_by ?? null),
    getName(record.approved_by ?? null),
  ])

  const title   = MODULE_LABELS[module] ?? "Record"
  const dateVal = record.log_date ?? record.date_identified ?? record.review_date ?? record.date_opened ?? record.created_at
  const status  = String(record.status ?? "—").toUpperCase().replace(/_/g, " ")

  // Build display rows — skip internal IDs, clean up values
  const rows = Object.entries(record)
    .filter(([k]) => !SKIP_FIELDS.has(k))
    .map(([k, v]) => ({ label: fieldLabel(k), value: fieldValue(v) }))

  // Severity / disposition alerts
  const severity: string | undefined = record.severity
  const disposition: string | undefined = record.disposition
  const isInTolerance: boolean | undefined = record.is_in_tolerance

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      {/* ── Header ── */}
      <div className="pb-header">
        <div className="pb-header-left">
          <h1>FactorOS</h1>
          <p>USDA Inspected · HACCP Compliant</p>
        </div>
        <div className="pb-header-right">
          <strong>{title}</strong>
          <span>Record: {id.slice(0, 8).toUpperCase()}</span>
          <span>Printed: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
        </div>
      </div>

      {/* ── Meta pills ── */}
      <div className="pb-meta">
        <div className="pb-meta-item">
          <label>Document</label>
          <span>{title}</span>
        </div>
        <div className="pb-meta-item">
          <label>Date</label>
          <span>{dateVal ? formatDate(dateVal) : "—"}</span>
        </div>
        <div className="pb-meta-item">
          <label>Status</label>
          <span>{status}</span>
        </div>
      </div>

      {/* ── Contextual alerts ── */}
      {severity === "critical" && (
        <div className="pb-alert pb-alert-red">⚠ CRITICAL DEVIATION — USDA Notification Required</div>
      )}
      {isInTolerance === false && (
        <div className="pb-alert pb-alert-amber">⚠ Thermometer OUT OF TOLERANCE — Corrective action required</div>
      )}
      {isInTolerance === true && (
        <div className="pb-alert pb-alert-green">✓ Thermometer within tolerance (±2°F)</div>
      )}
      {disposition === "approved_for_shipment" && (
        <div className="pb-alert pb-alert-green">✓ APPROVED FOR SHIPMENT</div>
      )}
      {disposition === "hold" && (
        <div className="pb-alert pb-alert-amber">⚠ HOLD — Pending Review</div>
      )}
      {disposition === "rejected" && (
        <div className="pb-alert pb-alert-red">✗ REJECTED / DO NOT SHIP</div>
      )}

      {/* ── Data table ── */}
      <table className="pb-table">
        <thead>
          <tr>
            <th style={{ width: "35%" }}>Field</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ label, value }) => (
            <tr key={label}>
              <td>{label}</td>
              <td>
                {value.length > 120
                  ? <pre>{value}</pre>
                  : value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Signatures ── */}
      <div className="pb-sigs">
        <div className="pb-sig-block">
          <label>Submitted By</label>
          <div className="pb-sig-name">{creatorName}</div>
          <div className="pb-sig-line" />
        </div>
        <div className="pb-sig-block">
          <label>Verified By</label>
          <div className="pb-sig-name">{record.verified_by ? verifierName : "Pending verification"}</div>
          <div className="pb-sig-line" />
        </div>
        <div className="pb-sig-block">
          <label>Approved By</label>
          <div className="pb-sig-name">{record.approved_by ? approverName : "Pending approval"}</div>
          <div className="pb-sig-line" />
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="pb-footer">
        <span>FactorOS · HACCP Compliance Platform</span>
        <span>HACCP Record-Keeping System</span>
        <span>{new Date().toISOString().split("T")[0]}</span>
      </div>
    </div>
  )
}
