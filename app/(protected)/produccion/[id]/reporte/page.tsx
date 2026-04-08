import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import type { Metadata } from "next"
import { PrintNowButton } from "@/app/print/PrintNowButton"

// ─────────────────────────────────────────────
// Metadata
// ─────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  return {
    title: `Reporte de Producción — ${id.slice(0, 8).toUpperCase()} — Latin Bites Factory`,
  }
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function fmtDate(d: string | null | undefined): string {
  if (!d) return "—"
  return new Date(d + (d.includes("T") ? "" : "T12:00:00")).toLocaleDateString("es-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function fmtTime(ts: string | null | undefined): string {
  if (!ts) return "—"
  return new Date(ts).toLocaleTimeString("es-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
}

function fmtDateTime(ts: string | null | undefined): string {
  if (!ts) return "—"
  return new Date(ts).toLocaleString("es-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
}

function fmtDuration(start: string | null, end: string | null): string {
  if (!start) return "—"
  const s = new Date(start).getTime()
  const e = end ? new Date(end).getTime() : Date.now()
  const mins = Math.floor((e - s) / 60000)
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h ${m}min`
}

function fmtWeight(w: number | string | null | undefined): string {
  if (w === null || w === undefined || w === "") return "—"
  const n = parseFloat(String(w))
  if (isNaN(n)) return "—"
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " lbs"
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────
export default async function ReportePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // ── Fetch session ──────────────────────────
  const { data: session } = await supabase
    .from("box_sessions")
    .select(
      `id, client_name, product_name, shift_date, status,
       target_boxes, target_weight_lbs, notes, created_at, completed_at,
       start_time, lot_reference, production_line, session_number,
       supervisor_id`
    )
    .eq("id", id)
    .single()

  if (!session) notFound()

  // ── Fetch box entries ──────────────────────
  const { data: entriesRaw } = await supabase
    .from("box_entries")
    .select("id, box_number, weight_lbs, logged_by, created_at, notes, lot_reference, temperature_f")
    .eq("session_id", id)
    .order("box_number", { ascending: true })

  // ── Fetch temp logs ────────────────────────
  const { data: tempLogsRaw } = await supabase
    .from("produccion_temp_logs")
    .select("id, box_number_at, temperature_f, location, logged_by, created_at, notes")
    .eq("session_id", id)
    .order("created_at", { ascending: true })

  // ── Fetch AI rules (for weight flagging) ──
  const { data: rulesRaw } = await supabase
    .from("produccion_ai_rules")
    .select("rule_type, value")
    .eq("is_active", true)

  // ── Fetch supervisor profile ───────────────
  const supervisorId = session.supervisor_id
  let supervisorName = "—"
  if (supervisorId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", supervisorId)
      .single()
    supervisorName = profile?.full_name ?? "—"
  }

  const entries   = entriesRaw  || []
  const tempLogs  = tempLogsRaw || []
  const rules     = rulesRaw    || []

  // ── Weight thresholds ──────────────────────
  const weightMinRule = rules.find((r) => r.rule_type === "weight_min")
  const weightMaxRule = rules.find((r) => r.rule_type === "weight_max")
  const weightMin = weightMinRule ? Number(weightMinRule.value) : null
  const weightMax = weightMaxRule ? Number(weightMaxRule.value) : null

  function isWeightFlagged(w: number | null): boolean {
    if (w === null) return false
    if (weightMin !== null && w < weightMin) return true
    if (weightMax !== null && w > weightMax) return true
    return false
  }

  // ── Summary stats ──────────────────────────
  const weights = entries.map((e) => parseFloat(String(e.weight_lbs || "0"))).filter((n) => !isNaN(n))
  const totalBoxes  = entries.length
  const totalWeight = weights.reduce((a, b) => a + b, 0)
  const avgWeight   = totalBoxes > 0 ? totalWeight / totalBoxes : 0
  const minWeight   = weights.length > 0 ? Math.min(...weights) : null
  const maxWeight   = weights.length > 0 ? Math.max(...weights) : null
  const within10pct = weights.filter((w) => Math.abs(w - avgWeight) / (avgWeight || 1) <= 0.1).length
  const consistency = totalBoxes > 0 ? Math.round((within10pct / totalBoxes) * 100) : 0

  // Duration
  const durationStr = fmtDuration(session.start_time, session.completed_at)

  // Doc ID
  const docId = id.slice(0, 8).toUpperCase()
  const printedAt = new Date().toLocaleDateString("es-US", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  } as Intl.DateTimeFormatOptions)

  // ─────────────────────────────────────────
  // Print styles (same approach as PrintLayout)
  // ─────────────────────────────────────────
  const PRINT_STYLES = `
    * { box-sizing: border-box; }
    body {
      margin: 0 !important;
      padding: 40px !important;
      background: white !important;
      font-family: 'Helvetica Neue', Arial, sans-serif;
      font-size: 11px;
      color: #0f172a;
      line-height: 1.5;
    }
    [data-sonner-toaster] { display: none !important; }

    /* ── Header ── */
    .pb-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 3px solid #0f172a;
    }
    .pb-logo-row { display: flex; align-items: center; gap: 10px; }
    .pb-logo-icon {
      width: 36px; height: 36px; border-radius: 8px;
      background: linear-gradient(135deg, #dc2626, #991b1b);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .pb-logo-text { font-size: 20px; font-weight: 900; letter-spacing: -0.5px; }
    .pb-logo-text span { color: #dc2626; }
    .pb-logo-sub { font-size: 9px; color: #64748b; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; margin-top: 2px; }
    .pb-header-right { text-align: right; }
    .pb-doc-title { font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom: 4px; }
    .pb-doc-meta { font-size: 9.5px; color: #64748b; line-height: 1.7; }
    .pb-doc-id {
      display: inline-block; background: #f1f5f9; border: 1px solid #e2e8f0;
      border-radius: 4px; padding: 2px 8px; font-size: 9px; font-weight: 700;
      font-family: monospace; color: #334155; margin-top: 4px;
      letter-spacing: .06em;
    }

    /* ── Meta pills ── */
    .pb-meta {
      display: grid; grid-template-columns: repeat(4, 1fr);
      gap: 0; margin-bottom: 20px;
      border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;
    }
    .pb-meta-2 {
      display: grid; grid-template-columns: repeat(4, 1fr);
      gap: 0; margin-bottom: 20px;
      border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;
    }
    .pb-meta-item {
      padding: 10px 14px;
      border-right: 1px solid #e2e8f0;
      background: #f8fafc;
    }
    .pb-meta-item:last-child { border-right: none; }
    .pb-meta-item label {
      font-size: 8.5px; font-weight: 700; text-transform: uppercase;
      letter-spacing: .08em; color: #94a3b8; display: block; margin-bottom: 3px;
    }
    .pb-meta-item span { font-size: 12px; font-weight: 700; color: #0f172a; }

    /* ── Section heading ── */
    .pb-section {
      font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em;
      color: #64748b; margin-bottom: 8px; margin-top: 20px;
      padding-bottom: 4px; border-bottom: 1px solid #e2e8f0;
    }

    /* ── Data table ── */
    .pb-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
    .pb-table thead tr { background: #0f172a; }
    .pb-table th {
      font-size: 8.5px; text-transform: uppercase; letter-spacing: .08em;
      font-weight: 700; color: #94a3b8; padding: 8px 10px; text-align: left;
    }
    .pb-table tbody tr:nth-child(even) td { background: #f8fafc; }
    .pb-table td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: top; font-size: 10.5px; color: #0f172a; }
    .pb-table tr.flagged td { background: #fef2f2 !important; color: #991b1b; }
    .pb-table tr.flagged td .weight-val { font-weight: 800; }

    /* ── Summary stats ── */
    .pb-stats {
      display: grid; grid-template-columns: repeat(5, 1fr); gap: 0;
      border: 2px solid #0f172a; border-radius: 8px; overflow: hidden;
      margin-bottom: 20px;
    }
    .pb-stat {
      padding: 12px 14px; border-right: 1px solid #e2e8f0; background: #f8fafc;
      text-align: center;
    }
    .pb-stat:last-child { border-right: none; }
    .pb-stat label {
      font-size: 8px; font-weight: 700; text-transform: uppercase;
      letter-spacing: .08em; color: #64748b; display: block; margin-bottom: 4px;
    }
    .pb-stat span { font-size: 16px; font-weight: 900; color: #0f172a; }
    .pb-stat .sub { font-size: 8.5px; color: #94a3b8; margin-top: 1px; display: block; }

    /* ── Signature block ── */
    .pb-sigs {
      display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px;
      margin-top: 28px; padding-top: 20px; border-top: 2px solid #e2e8f0;
    }
    .pb-sig-block {
      border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px;
      background: #f8fafc;
    }
    .pb-sig-block label {
      font-size: 8.5px; font-weight: 700; text-transform: uppercase;
      color: #94a3b8; display: block; margin-bottom: 6px; letter-spacing: .08em;
    }
    .pb-sig-name  { font-size: 12px; font-weight: 700; color: #0f172a; min-height: 18px; }
    .pb-sig-line  { border-bottom: 1.5px solid #cbd5e1; margin-top: 28px; }
    .pb-sig-date  { font-size: 9px; color: #94a3b8; margin-top: 4px; }

    /* ── Footer ── */
    .pb-footer {
      margin-top: 24px; padding-top: 12px;
      border-top: 1px solid #f1f5f9;
      display: flex; justify-content: space-between; align-items: center;
      font-size: 8.5px; color: #94a3b8;
    }

    /* ── Screen print bar ── */
    .no-print {
      background: #0f172a; color: white; border-radius: 12px;
      padding: 14px 20px; margin-bottom: 24px;
      display: flex; justify-content: space-between; align-items: center;
    }

    /* ── Status badge ── */
    .status-active   { color: #059669; font-weight: 700; }
    .status-complete { color: #6b7280; font-weight: 700; }

    @media print {
      body { padding: 0 !important; }
      @page { margin: 1.5cm; size: letter; }
      .no-print { display: none !important; }
    }
  `

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PRINT_STYLES }} />

      <div style={{ maxWidth: 800, margin: "0 auto" }}>

        {/* ── Screen-only bar ── */}
        <PrintNowButton />

        {/* ── Header ── */}
        <div className="pb-header">
          <div>
            <div className="pb-logo-row">
              <div className="pb-logo-icon">
                {/* Factory icon in SVG */}
                <svg viewBox="0 0 24 24" fill="white" width="20" height="20">
                  <path d="M4 21V10l4-3v3l4-3v3l4-4v14H4zm2-2h12V9.6l-4 4V10.4l-4 3V10.4L6 13v6z" />
                  <rect x="7" y="14" width="2" height="3" />
                  <rect x="11" y="14" width="2" height="3" />
                  <rect x="15" y="14" width="2" height="3" />
                </svg>
              </div>
              <div>
                <div className="pb-logo-text">Latin Bites <span>Factory</span></div>
                <div className="pb-logo-sub">Reporte de Producción</div>
              </div>
            </div>
          </div>
          <div className="pb-header-right">
            <div className="pb-doc-title">Reporte de Sesión de Cajas</div>
            <div className="pb-doc-meta">
              <div>Fecha de impresión: {printedAt}</div>
              {session.session_number && <div>Sesión #{session.session_number}</div>}
              <div>
                Estado:{" "}
                <span className={session.status === "active" ? "status-active" : "status-complete"}>
                  {session.status === "active" ? "EN PRODUCCIÓN" : "COMPLETADA"}
                </span>
              </div>
            </div>
            <div className="pb-doc-id">{docId}</div>
          </div>
        </div>

        {/* ── Meta grid row 1: Client/Product/Line/Date ── */}
        <div className="pb-meta">
          <div className="pb-meta-item">
            <label>Cliente</label>
            <span>{session.client_name}</span>
          </div>
          <div className="pb-meta-item">
            <label>Producto</label>
            <span>{session.product_name}</span>
          </div>
          <div className="pb-meta-item">
            <label>Línea</label>
            <span>{session.production_line ?? "—"}</span>
          </div>
          <div className="pb-meta-item">
            <label>Fecha de Turno</label>
            <span>{fmtDate(session.shift_date)}</span>
          </div>
        </div>

        {/* ── Meta grid row 2: Times/Weight/Stats ── */}
        <div className="pb-meta-2">
          <div className="pb-meta-item">
            <label>Hora Inicio</label>
            <span>{fmtTime(session.start_time)}</span>
          </div>
          <div className="pb-meta-item">
            <label>Hora Fin</label>
            <span>{session.completed_at ? fmtTime(session.completed_at) : "En curso"}</span>
          </div>
          <div className="pb-meta-item">
            <label>Duración</label>
            <span>{durationStr}</span>
          </div>
          <div className="pb-meta-item">
            <label>Lote de Referencia</label>
            <span>{session.lot_reference ?? "—"}</span>
          </div>
        </div>

        {/* ── Summary Stats ── */}
        <div className="pb-section">Resumen de Producción</div>
        <div className="pb-stats">
          <div className="pb-stat">
            <label>Total Cajas</label>
            <span>{totalBoxes}</span>
            {session.target_boxes && (
              <span className="sub">meta: {session.target_boxes}</span>
            )}
          </div>
          <div className="pb-stat">
            <label>Peso Total</label>
            <span>{fmtWeight(totalWeight)}</span>
            {session.target_weight_lbs && (
              <span className="sub">meta: {fmtWeight(session.target_weight_lbs)}</span>
            )}
          </div>
          <div className="pb-stat">
            <label>Promedio / Caja</label>
            <span>{totalBoxes > 0 ? fmtWeight(avgWeight) : "—"}</span>
          </div>
          <div className="pb-stat">
            <label>Mín / Máx</label>
            <span style={{ fontSize: 12 }}>
              {minWeight !== null ? fmtWeight(minWeight) : "—"}
              {" / "}
              {maxWeight !== null ? fmtWeight(maxWeight) : "—"}
            </span>
          </div>
          <div className="pb-stat">
            <label>Consistencia</label>
            <span style={{ color: consistency >= 90 ? "#059669" : consistency >= 70 ? "#d97706" : "#dc2626" }}>
              {totalBoxes > 0 ? `${consistency}%` : "—"}
            </span>
            <span className="sub">dentro de ±10%</span>
          </div>
        </div>

        {/* ── Box entries table ── */}
        <div className="pb-section">
          Registro de Cajas ({totalBoxes} {totalBoxes === 1 ? "caja" : "cajas"})
          {(weightMin !== null || weightMax !== null) && (
            <span style={{ fontSize: 8, fontWeight: 400, marginLeft: 8, color: "#94a3b8" }}>
              {weightMin !== null && `mín: ${weightMin} lbs`}
              {weightMin !== null && weightMax !== null && " · "}
              {weightMax !== null && `máx: ${weightMax} lbs`}
              {" · "}
              <span style={{ color: "#dc2626" }}>rojo = fuera de rango</span>
            </span>
          )}
        </div>

        {entries.length === 0 ? (
          <p style={{ fontSize: 11, color: "#94a3b8", marginBottom: 20 }}>
            No se registraron cajas en esta sesión.
          </p>
        ) : (
          <table className="pb-table">
            <thead>
              <tr>
                <th># Caja</th>
                <th>Peso (lbs)</th>
                <th>Hora</th>
                <th>Lote Ref.</th>
                <th>Temp (°F)</th>
                <th>Notas</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const w = entry.weight_lbs !== null ? parseFloat(String(entry.weight_lbs)) : null
                const flagged = w !== null && isWeightFlagged(w)
                return (
                  <tr key={entry.id} className={flagged ? "flagged" : ""}>
                    <td style={{ fontWeight: 700 }}>{entry.box_number}</td>
                    <td>
                      <span className="weight-val">{fmtWeight(entry.weight_lbs)}</span>
                      {flagged && (
                        <span style={{ fontSize: 8, marginLeft: 4, color: "#dc2626" }}>
                          {w !== null && weightMin !== null && w < weightMin ? "↓ bajo" : "↑ alto"}
                        </span>
                      )}
                    </td>
                    <td>{fmtTime(entry.created_at)}</td>
                    <td>{entry.lot_reference ?? "—"}</td>
                    <td>
                      {entry.temperature_f != null ? `${entry.temperature_f}°F` : "—"}
                    </td>
                    <td style={{ color: "#64748b" }}>{entry.notes ?? "—"}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {/* ── Temperature logs section ── */}
        {tempLogs.length > 0 && (
          <>
            <div className="pb-section">
              Registro de Temperatura ({tempLogs.length} {tempLogs.length === 1 ? "lectura" : "lecturas"})
            </div>
            <table className="pb-table">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Temperatura (°F)</th>
                  <th>Ubicación</th>
                  <th>Caja #</th>
                  <th>Notas</th>
                </tr>
              </thead>
              <tbody>
                {tempLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{fmtTime(log.created_at)}</td>
                    <td style={{ fontWeight: 700 }}>
                      {log.temperature_f != null ? `${log.temperature_f}°F` : "—"}
                    </td>
                    <td>{log.location ?? "—"}</td>
                    <td>{log.box_number_at ?? "—"}</td>
                    <td style={{ color: "#64748b" }}>{log.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* ── Session notes ── */}
        {session.notes && (
          <>
            <div className="pb-section">Notas de la Sesión</div>
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                padding: "10px 14px",
                fontSize: 11,
                color: "#0f172a",
                marginBottom: 20,
                lineHeight: 1.6,
              }}
            >
              {session.notes}
            </div>
          </>
        )}

        {/* ── Signature lines ── */}
        <div className="pb-sigs">
          <div className="pb-sig-block">
            <label>Operador Responsable</label>
            <div className="pb-sig-name">&nbsp;</div>
            <div className="pb-sig-line" />
            <div className="pb-sig-date">Nombre y firma</div>
          </div>
          <div className="pb-sig-block">
            <label>Supervisor / QA</label>
            <div className="pb-sig-name">{supervisorName !== "—" ? supervisorName : "\u00a0"}</div>
            <div className="pb-sig-line" />
            <div className="pb-sig-date">Nombre y firma</div>
          </div>
          <div className="pb-sig-block">
            <label>Fecha y Hora de Cierre</label>
            <div className="pb-sig-name">
              {session.completed_at ? fmtDateTime(session.completed_at) : "\u00a0"}
            </div>
            <div className="pb-sig-line" />
            <div className="pb-sig-date">Registro del sistema</div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="pb-footer">
          <span>Latin Bites Factory · Sistema de Control de Producción</span>
          <span style={{ textAlign: "center" }}>
            USDA Inspected · Registro generado automáticamente
            <br />
            <span style={{ fontSize: 7.5 }}>
              Conservar este registro mínimo 3 años conforme a regulaciones HACCP
            </span>
          </span>
          <span style={{ textAlign: "right" }}>
            ID: {docId}
            <br />
            {new Date().toISOString().split("T")[0]}
          </span>
        </div>

      </div>
    </>
  )
}
