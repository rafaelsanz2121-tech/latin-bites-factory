import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import {
  Plus, Shield, AlertTriangle, CheckCircle2, XCircle,
  Zap, Calendar, Package, Clock,
} from "lucide-react"

const CHECK_TYPE: Record<string, { label: string; color: string }> = {
  pre_op:           { label: "Pre-Op",         color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
  hourly:           { label: "Por hora",        color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  product_change:   { label: "Cambio producto", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  post_maintenance: { label: "Post-mant.",      color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
  end_of_day:       { label: "Fin de día",      color: "bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300" },
}

const DISPOSITION: Record<string, string> = {
  rework:  "Re-proceso",
  destroy: "Destruido",
  release: "Liberado",
  pending: "Pendiente",
}

export default async function MetalDetectorPage() {
  const supabase = await createClient()

  let logs: any[] = []
  let tableExists = true

  try {
    const since90 = new Date()
    since90.setDate(since90.getDate() - 90)
    const { data, error } = await supabase
      .from("metal_detector_logs")
      .select("*")
      .gte("check_date", since90.toISOString().split("T")[0])
      .order("check_date", { ascending: false })
      .order("check_time", { ascending: false })
      .limit(200)
    if (error?.code === "42P01") {
      tableExists = false
    } else {
      logs = data || []
    }
  } catch {
    tableExists = false
  }

  const totalChecks      = logs.length
  const failedChecks     = logs.filter((l) => l.overall_pass === false).length
  const totalRejected    = logs.reduce((s, l) => s + (l.units_rejected || 0), 0)
  const lastCheck        = logs[0]

  const recentFails = logs.filter((l) => {
    if (l.overall_pass !== false) return false
    return (Date.now() - new Date(l.check_date).getTime()) / 86_400_000 <= 7
  })

  const fmtDate = (d: string) =>
    new Date(d + "T12:00:00").toLocaleDateString("es-MX", { month: "short", day: "numeric" })

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center">
              <Zap className="w-4 h-4 text-violet-600" />
            </span>
            Detector de Metales
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-300 mt-1">
            CCP — 9 CFR 417.3 · Verificación de sensibilidad y registros de producción
          </p>
        </div>
        <Link
          href="/metal-detector/nuevo"
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Nuevo chequeo
        </Link>
      </div>

      {/* ── Migration notice ── */}
      {!tableExists && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
          <p className="text-sm font-bold text-blue-800 dark:text-blue-200">Migración requerida</p>
          <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
            Ejecuta{" "}
            <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">
              014_metal_supplier_dispatch.sql
            </code>{" "}
            en Supabase para activar este módulo.
          </p>
        </div>
      )}

      {tableExists && (
        <>
          {/* ── KPIs ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: "Chequeos (90d)",
                value: totalChecks,
                icon:  Shield,
                color: "text-violet-600",
                bg:    "bg-violet-50 dark:bg-violet-900/20",
              },
              {
                label: "Fallas",
                value: failedChecks,
                icon:  XCircle,
                color: failedChecks > 0 ? "text-red-600" : "text-slate-500 dark:text-slate-300",
                bg:    failedChecks > 0 ? "bg-red-50 dark:bg-red-900/20" : "bg-slate-100 dark:bg-slate-800",
              },
              {
                label: "Unidades rechazadas",
                value: totalRejected,
                icon:  Package,
                color: totalRejected > 0 ? "text-orange-600" : "text-slate-500 dark:text-slate-300",
                bg:    totalRejected > 0 ? "bg-orange-50 dark:bg-orange-900/20" : "bg-slate-100 dark:bg-slate-800",
              },
              {
                label: "Último chequeo",
                value: lastCheck ? fmtDate(lastCheck.check_date) : "—",
                icon:  Calendar,
                color: "text-slate-600 dark:text-slate-300",
                bg:    "bg-slate-100 dark:bg-slate-800",
              },
            ].map((k) => (
              <div key={k.label} className={`rounded-xl p-4 ${k.bg}`}>
                <k.icon className={`w-4 h-4 ${k.color} mb-2`} />
                <p className={`text-2xl font-black ${k.color} tabular-nums`}>{k.value}</p>
                <p className="text-[10.5px] font-medium text-slate-500 dark:text-slate-300 mt-1">{k.label}</p>
              </div>
            ))}
          </div>

          {/* ── Recent fails alert ── */}
          {recentFails.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-sm font-bold text-red-800 dark:text-red-200">
                  {recentFails.length} falla{recentFails.length > 1 ? "s" : ""} en los últimos 7 días
                </p>
              </div>
              {recentFails.map((f) => (
                <div
                  key={f.id}
                  className="bg-white dark:bg-red-900/10 rounded-lg px-4 py-3 text-sm space-y-1.5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-red-700 dark:text-red-300">{fmtDate(f.check_date)}</span>
                    <span className="text-slate-500">{f.check_time?.slice(0, 5)}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${CHECK_TYPE[f.check_type]?.color}`}>
                      {CHECK_TYPE[f.check_type]?.label ?? f.check_type}
                    </span>
                    {f.product_name && (
                      <span className="text-slate-600 dark:text-slate-300">{f.product_name}</span>
                    )}
                  </div>
                  {f.corrective_action && (
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      <span className="font-semibold">Acción:</span> {f.corrective_action}
                    </p>
                  )}
                  {f.product_disposition && (
                    <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${
                      f.product_disposition === "destroy"
                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                        : f.product_disposition === "rework"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                        : f.product_disposition === "release"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                    }`}>
                      {DISPOSITION[f.product_disposition] ?? f.product_disposition}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── Log table ── */}
          <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                Registros — últimos 90 días
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-300">{totalChecks} chequeos</span>
            </div>

            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Zap className="w-8 h-8 text-slate-200 dark:text-slate-700" />
                <p className="text-sm text-slate-500 dark:text-slate-300">Sin registros todavía.</p>
                <Link
                  href="/metal-detector/nuevo"
                  className="text-sm text-violet-600 font-semibold hover:underline"
                >
                  + Agregar primer chequeo
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 dark:bg-slate-800">
                    <tr>
                      {["Fecha", "Hora", "Tipo", "Producto / Lote", "Fe", "No-Fe", "Inox", "Estado", "Rechazados"].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-2.5 text-left text-[11px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wide whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                    {logs.map((log) => {
                      const ct = CHECK_TYPE[log.check_type] ?? { label: log.check_type, color: "bg-slate-100 text-slate-600" }
                      const PassCell = ({ pass, mm }: { pass: boolean; mm?: number | null }) => (
                        <div className="flex items-center gap-1">
                          {pass === false
                            ? <XCircle className="w-4 h-4 text-red-500" />
                            : <CheckCircle2 className="w-4 h-4 text-green-500" />
                          }
                          {mm != null && (
                            <span className="text-[10px] text-slate-500 dark:text-slate-300">{mm}mm</span>
                          )}
                        </div>
                      )
                      return (
                        <tr
                          key={log.id}
                          className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${
                            log.overall_pass === false ? "bg-red-50/40 dark:bg-red-900/10" : ""
                          }`}
                        >
                          <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
                            {fmtDate(log.check_date)}
                          </td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-300 tabular-nums">
                            {log.check_time?.slice(0, 5) ?? "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${ct.color}`}>
                              {ct.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                            <p className="font-medium">{log.product_name || "—"}</p>
                            {log.lot_number && (
                              <p className="text-xs text-slate-500 dark:text-slate-300">{log.lot_number}</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <PassCell pass={log.ferrous_pass} mm={log.ferrous_mm} />
                          </td>
                          <td className="px-4 py-3">
                            <PassCell pass={log.non_ferrous_pass} mm={log.non_ferrous_mm} />
                          </td>
                          <td className="px-4 py-3">
                            <PassCell pass={log.stainless_pass} mm={log.stainless_mm} />
                          </td>
                          <td className="px-4 py-3">
                            {log.overall_pass === false ? (
                              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                                FALLA
                              </span>
                            ) : (
                              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                PASA
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center tabular-nums">
                            {log.units_rejected > 0 ? (
                              <span className="font-bold text-orange-600">{log.units_rejected}</span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
