import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import {
  Plus, AlertTriangle, CheckCircle2, XCircle,
  Bug, Calendar, Search,
} from "lucide-react"

const FINDINGS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  none:               { label: "Sin hallazgos",     color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",   dot: "bg-green-500"  },
  evidence_only:      { label: "Solo evidencia",    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",   dot: "bg-amber-500"  },
  activity_observed:  { label: "Actividad vista",   color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300", dot: "bg-orange-500" },
  infestation:        { label: "Infestación",       color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",           dot: "bg-red-500"    },
}

const INSP_TYPE: Record<string, { label: string; color: string }> = {
  routine:        { label: "Rutina",         color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"     },
  complaint:      { label: "Por queja",      color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"         },
  post_treatment: { label: "Post-tratamiento",color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"},
  seasonal:       { label: "Estacional",     color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300"     },
  follow_up:      { label: "Seguimiento",    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
}

export default async function PlagasPage() {
  const supabase = await createClient()
  let logs: any[] = []
  let tableExists = true

  try {
    const since90 = new Date()
    since90.setDate(since90.getDate() - 90)
    const { data, error } = await supabase
      .from("pest_control_logs")
      .select("*")
      .gte("inspection_date", since90.toISOString().split("T")[0])
      .order("inspection_date", { ascending: false })
      .limit(200)
    if (error?.code === "42P01") { tableExists = false } else { logs = data || [] }
  } catch { tableExists = false }

  const totalInspections = logs.length
  const withFindings     = logs.filter((l) => l.findings !== "none").length
  const infestations     = logs.filter((l) => l.findings === "infestation").length
  const lastInspection   = logs[0]

  const today = new Date()
  const daysSinceLast = lastInspection
    ? Math.floor((today.getTime() - new Date(lastInspection.inspection_date + "T12:00:00").getTime()) / 86_400_000)
    : null

  const recentActivity = logs.filter((l) => {
    if (l.findings === "none") return false
    return (Date.now() - new Date(l.inspection_date + "T12:00:00").getTime()) / 86_400_000 <= 14
  })

  const fmtDate = (d: string) =>
    new Date(d + "T12:00:00").toLocaleDateString("es-MX", { month: "short", day: "numeric" })

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-lime-50 dark:bg-lime-900/30 flex items-center justify-center">
              <Bug className="w-4 h-4 text-lime-600" />
            </span>
            Control de Plagas
          </h1>
          <p className="text-sm text-slate-400 mt-1">9 CFR 416.2(a) · Programa de control de roedores e insectos</p>
        </div>
        <Link
          href="/plagas/nuevo"
          className="flex items-center gap-2 px-4 py-2 bg-lime-600 hover:bg-lime-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Nueva inspección
        </Link>
      </div>

      {/* Days since alert */}
      {daysSinceLast !== null && daysSinceLast > 30 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-5 py-4 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Última inspección hace {daysSinceLast} días.</strong> Se recomienda inspección mensual (9 CFR 416.2(a)).
          </p>
        </div>
      )}

      {/* Migration notice */}
      {!tableExists && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
          <p className="text-sm font-bold text-blue-800 dark:text-blue-200">Migración requerida</p>
          <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
            Ejecuta <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">015_allergen_pest_recall.sql</code> en Supabase para activar este módulo.
          </p>
        </div>
      )}

      {tableExists && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Inspecciones (90d)", value: totalInspections,                                     icon: Search,   color: "text-lime-600",   bg: "bg-lime-50 dark:bg-lime-900/20"       },
              { label: "Con hallazgos",      value: withFindings,                                          icon: AlertTriangle, color: withFindings > 0 ? "text-amber-600" : "text-slate-500 dark:text-slate-300", bg: withFindings > 0 ? "bg-amber-50 dark:bg-amber-900/20" : "bg-slate-100 dark:bg-slate-800" },
              { label: "Infestaciones",      value: infestations,                                          icon: Bug,      color: infestations > 0 ? "text-red-600" : "text-slate-500 dark:text-slate-300", bg: infestations > 0 ? "bg-red-50 dark:bg-red-900/20" : "bg-slate-100 dark:bg-slate-800" },
              { label: "Días sin inspección",value: daysSinceLast !== null ? `${daysSinceLast}d` : "—",   icon: Calendar, color: (daysSinceLast ?? 0) > 30 ? "text-amber-600" : "text-slate-600 dark:text-slate-300", bg: (daysSinceLast ?? 0) > 30 ? "bg-amber-50 dark:bg-amber-900/20" : "bg-slate-100 dark:bg-slate-800" },
            ].map((k) => (
              <div key={k.label} className={`rounded-xl p-4 ${k.bg}`}>
                <k.icon className={`w-4 h-4 ${k.color} mb-2`} />
                <p className={`text-2xl font-black ${k.color} tabular-nums`}>{k.value}</p>
                <p className="text-[10.5px] font-medium text-slate-500 dark:text-slate-400 mt-1">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Recent activity alerts */}
          {recentActivity.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
                  {recentActivity.length} inspección{recentActivity.length > 1 ? "es" : ""} con hallazgos en los últimos 14 días
                </p>
              </div>
              {recentActivity.map((l) => {
                const fc = FINDINGS_CONFIG[l.findings]
                return (
                  <div key={l.id} className="bg-white dark:bg-amber-900/10 rounded-lg px-4 py-3 text-sm space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-amber-700 dark:text-amber-300">{fmtDate(l.inspection_date)}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${fc?.color}`}>{fc?.label}</span>
                      {l.pest_types && l.pest_types.length > 0 && (
                        <span className="text-xs text-slate-600 dark:text-slate-400">{l.pest_types.join(", ")}</span>
                      )}
                    </div>
                    {l.activity_locations && (
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        <span className="font-semibold">Ubicación:</span> {l.activity_locations}
                      </p>
                    )}
                    {l.corrective_action && (
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        <span className="font-semibold">Acción:</span> {l.corrective_action}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Table */}
          <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Registros — últimos 90 días</span>
              <span className="text-xs text-slate-400">{totalInspections} inspecciones</span>
            </div>
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Bug className="w-8 h-8 text-slate-200 dark:text-slate-700" />
                <p className="text-sm text-slate-400">Sin inspecciones registradas.</p>
                <Link href="/plagas/nuevo" className="text-sm text-lime-600 font-semibold hover:underline">+ Registrar primera inspección</Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 dark:bg-slate-800">
                    <tr>
                      {["Fecha", "Tipo", "Inspector", "Trampas", "Actividad", "Hallazgos", "Tratamiento", "Próxima insp."].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                    {logs.map((log) => {
                      const it = INSP_TYPE[log.inspection_type] ?? { label: log.inspection_type, color: "bg-slate-100 text-slate-600" }
                      const fc = FINDINGS_CONFIG[log.findings] ?? FINDINGS_CONFIG.none
                      return (
                        <tr key={log.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${log.findings !== "none" ? "bg-amber-50/30 dark:bg-amber-900/10" : ""}`}>
                          <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">{fmtDate(log.inspection_date)}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${it.color}`}>{it.label}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-xs">
                            <p>{log.exterminator_name || "—"}</p>
                            <p className="text-slate-400">{log.inspector_type === "external" ? "Externo" : "Interno"}</p>
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300 tabular-nums text-center">
                            <p className="font-medium">{log.traps_checked}</p>
                            {log.traps_with_activity > 0 && (
                              <p className="text-xs text-amber-600 font-bold">{log.traps_with_activity} con activ.</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 max-w-[120px]">
                            {log.pest_types?.length > 0 ? log.pest_types.join(", ") : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${fc.color}`}>{fc.label}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {log.treatment_performed
                              ? <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                              : <span className="text-slate-300 dark:text-slate-600">—</span>}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {log.next_inspection_date ? fmtDate(log.next_inspection_date) : "—"}
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
