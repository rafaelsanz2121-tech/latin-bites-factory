import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import {
  Plus, AlertTriangle, CheckCircle2, XCircle,
  Droplets, FlaskConical, Clock, Activity,
} from "lucide-react"

const TEST_TYPE: Record<string, string> = {
  daily_chlorine:         "Cloro diario",
  monthly_bacteriological:"Bacteriológico mensual",
  quarterly_chemical:     "Químico trimestral",
  annual_full:            "Análisis anual completo",
  complaint:              "Por queja",
}
const WATER_SOURCE: Record<string, string> = {
  municipal: "Municipal",
  well:      "Pozo",
  surface:   "Superficial",
  other:     "Otro",
}

export default async function AguaPotablePage() {
  const supabase = await createClient()
  let logs: any[] = []
  let tableExists = true

  try {
    const since90 = new Date()
    since90.setDate(since90.getDate() - 90)
    const { data, error } = await supabase
      .from("water_testing_logs")
      .select("*")
      .gte("test_date", since90.toISOString().split("T")[0])
      .order("test_date", { ascending: false })
      .limit(200)
    if (error?.code === "42P01") { tableExists = false } else { logs = data || [] }
  } catch { tableExists = false }

  const total    = logs.length
  const fails    = logs.filter((l) => l.result === "fail").length
  const pending  = logs.filter((l) => l.result === "pending").length
  const passRate = total > 0 ? (((total - fails) / total) * 100).toFixed(0) : null

  // Check for overdue tests
  const lastDaily = logs.find((l) => l.test_type === "daily_chlorine")
  const lastMonthly = logs.find((l) => l.test_type === "monthly_bacteriological")
  const now = Date.now()
  const daysSinceDaily = lastDaily
    ? Math.floor((now - new Date(lastDaily.test_date + "T12:00:00").getTime()) / 86_400_000)
    : null
  const daysSinceMonthly = lastMonthly
    ? Math.floor((now - new Date(lastMonthly.test_date + "T12:00:00").getTime()) / 86_400_000)
    : null

  const recentFails = logs.filter((l) =>
    l.result === "fail" &&
    (now - new Date(l.test_date + "T12:00:00").getTime()) / 86_400_000 <= 14
  )

  const fmtDate = (d: string) =>
    new Date(d + "T12:00:00").toLocaleDateString("es-MX", { month: "short", day: "numeric" })

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <Droplets className="w-4 h-4 text-blue-600" />
            </span>
            Agua Potable
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-300 mt-1">9 CFR 416.4 · Control de Calidad del Agua de Proceso</p>
        </div>
        <Link
          href="/agua-potable/nuevo"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Nueva prueba
        </Link>
      </div>

      {/* Frequency alerts */}
      {tableExists && (daysSinceDaily === null || daysSinceDaily >= 1 || daysSinceMonthly === null || (daysSinceMonthly !== null && daysSinceMonthly >= 30)) && (
        <div className="space-y-2">
          {(daysSinceDaily === null || daysSinceDaily >= 1) && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-5 py-3 flex items-center gap-3">
              <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <span className="font-black">Prueba de cloro pendiente —</span>{" "}
                {daysSinceDaily === null
                  ? "Sin registros de cloro. Se requiere prueba diaria (9 CFR 416.4)."
                  : `Último registro hace ${daysSinceDaily} día${daysSinceDaily !== 1 ? "s" : ""}. Se requiere prueba diaria.`}
              </p>
            </div>
          )}
          {(daysSinceMonthly === null || (daysSinceMonthly !== null && daysSinceMonthly >= 30)) && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-xl px-5 py-3 flex items-center gap-3">
              <FlaskConical className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <p className="text-sm text-orange-800 dark:text-orange-200">
                <span className="font-black">Análisis bacteriológico mensual pendiente —</span>{" "}
                {daysSinceMonthly === null
                  ? "Sin registros bacteriológicos. Requerido mensualmente."
                  : `Último hace ${daysSinceMonthly} días.`}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Migration notice */}
      {!tableExists && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
          <p className="text-sm font-bold text-blue-800 dark:text-blue-200">Migración requerida</p>
          <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
            Ejecuta <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">016_water_audit_health.sql</code> en Supabase para activar este módulo.
          </p>
        </div>
      )}

      {tableExists && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Pruebas (90d)",   value: total,                               icon: FlaskConical, color: "text-blue-600",   bg: "bg-blue-50 dark:bg-blue-900/20"        },
              { label: "Fuera de rango",  value: fails,                               icon: XCircle,      color: fails > 0 ? "text-red-600" : "text-slate-500 dark:text-slate-300",   bg: fails > 0 ? "bg-red-50 dark:bg-red-900/20" : "bg-slate-100 dark:bg-slate-800" },
              { label: "Pendientes",      value: pending,                             icon: Clock,        color: pending > 0 ? "text-amber-600" : "text-slate-500 dark:text-slate-300", bg: pending > 0 ? "bg-amber-50 dark:bg-amber-900/20" : "bg-slate-100 dark:bg-slate-800" },
              { label: "Tasa de conformidad", value: passRate !== null ? `${passRate}%` : "—", icon: Activity, color: "text-slate-600 dark:text-slate-300", bg: "bg-slate-100 dark:bg-slate-800" },
            ].map((k) => (
              <div key={k.label} className={`rounded-xl p-4 ${k.bg}`}>
                <k.icon className={`w-4 h-4 ${k.color} mb-2`} />
                <p className={`text-2xl font-black ${k.color} tabular-nums`}>{k.value}</p>
                <p className="text-[10.5px] font-medium text-slate-500 dark:text-slate-300 mt-1">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Potability standards */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-5 py-4">
            <p className="text-xs font-bold text-blue-800 dark:text-blue-200 mb-2">Parámetros de potabilidad — 9 CFR 416.4 / EPA / OMS</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {[
                { param: "Cloro residual",  range: "0.2 – 4.0 ppm",  note: "Diario" },
                { param: "pH",             range: "6.5 – 8.5",       note: "Según análisis" },
                { param: "Turbidez",       range: "< 0.3 NTU",       note: "Agua tratada" },
                { param: "Coliformes",     range: "Ausente",         note: "Mensual" },
                { param: "E. coli",        range: "Ausente",         note: "Mensual" },
                { param: "Temperatura",    range: "< 50°F (10°C)",   note: "Proceso" },
                { param: "Presión",        range: "> 20 PSI",        note: "Mínimo" },
                { param: "Análisis completo", range: "EPA 141.2",    note: "Anual" },
              ].map((s) => (
                <div key={s.param} className="bg-white dark:bg-blue-900/10 rounded-lg px-3 py-2">
                  <p className="font-semibold text-blue-800 dark:text-blue-200">{s.param}</p>
                  <p className="text-blue-600 dark:text-blue-400 font-bold">{s.range}</p>
                  <p className="text-blue-500/70 dark:text-blue-500 text-[10px]">{s.note}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recent fails */}
          {recentFails.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-sm font-bold text-red-800 dark:text-red-200">
                  {recentFails.length} prueba{recentFails.length > 1 ? "s" : ""} fuera de rango (últimos 14 días)
                </p>
              </div>
              {recentFails.map((f) => (
                <div key={f.id} className="bg-white dark:bg-red-900/10 rounded-lg px-4 py-3 text-sm space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-red-700 dark:text-red-300">{fmtDate(f.test_date)}</span>
                    <span className="text-slate-600 dark:text-slate-300">{TEST_TYPE[f.test_type] ?? f.test_type}</span>
                    <span className="text-xs text-slate-500">{f.sample_location}</span>
                    {f.chlorine_residual_ppm && (
                      <span className="font-bold text-red-600">Cl₂: {f.chlorine_residual_ppm} ppm</span>
                    )}
                    {f.ph && (
                      <span className="font-bold text-red-600">pH: {f.ph}</span>
                    )}
                  </div>
                  {f.corrective_action && (
                    <p className="text-xs text-slate-500"><span className="font-semibold">Acción:</span> {f.corrective_action}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Table */}
          <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Registros — últimos 90 días</span>
              <span className="text-xs text-slate-500 dark:text-slate-300">{total} pruebas</span>
            </div>
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Droplets className="w-8 h-8 text-slate-200 dark:text-slate-700" />
                <p className="text-sm text-slate-500 dark:text-slate-300">Sin pruebas registradas.</p>
                <p className="text-xs text-slate-400 max-w-xs text-center">9 CFR 416.4 requiere documentación de la potabilidad del agua de proceso.</p>
                <Link href="/agua-potable/nuevo" className="text-sm text-blue-600 font-semibold hover:underline">+ Primera prueba</Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 dark:bg-slate-800">
                    <tr>
                      {["Fecha","Tipo","Fuente","Ubicación","Cl₂ (ppm)","pH","Turbidez","Coliformes","E. coli","Estado"].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-[11px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                    {logs.map((log) => {
                      const clFail = log.chlorine_residual_ppm !== null && (Number(log.chlorine_residual_ppm) < 0.2 || Number(log.chlorine_residual_ppm) > 4.0)
                      const phFail = log.ph !== null && (Number(log.ph) < 6.5 || Number(log.ph) > 8.5)
                      const rowFail = log.result === "fail"
                      return (
                        <tr key={log.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${rowFail ? "bg-red-50/30 dark:bg-red-900/10" : ""}`}>
                          <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">{fmtDate(log.test_date)}</td>
                          <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">{TEST_TYPE[log.test_type] ?? log.test_type}</td>
                          <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-300">{WATER_SOURCE[log.water_source] ?? log.water_source}</td>
                          <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-300">{log.sample_location}</td>
                          <td className={`px-4 py-3 font-bold tabular-nums text-xs ${clFail ? "text-red-600" : "text-slate-600 dark:text-slate-300"}`}>
                            {log.chlorine_residual_ppm !== null ? `${log.chlorine_residual_ppm}` : "—"}
                          </td>
                          <td className={`px-4 py-3 font-bold tabular-nums text-xs ${phFail ? "text-red-600" : "text-slate-600 dark:text-slate-300"}`}>
                            {log.ph !== null ? `${log.ph}` : "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-300 tabular-nums">
                            {log.turbidity_ntu !== null ? `${log.turbidity_ntu} NTU` : "—"}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {log.coliform_result === "absent"
                              ? <span className="text-green-600 font-bold">Ausente</span>
                              : log.coliform_result === "present"
                              ? <span className="text-red-600 font-bold">PRESENTE</span>
                              : <span className="text-slate-500 dark:text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {log.e_coli_result === "absent"
                              ? <span className="text-green-600 font-bold">Ausente</span>
                              : log.e_coli_result === "present"
                              ? <span className="text-red-600 font-bold">PRESENTE</span>
                              : <span className="text-slate-500 dark:text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            {log.result === "fail"
                              ? <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">FALLA</span>
                              : log.result === "pending"
                              ? <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">PENDIENTE</span>
                              : <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">PASA</span>
                            }
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
