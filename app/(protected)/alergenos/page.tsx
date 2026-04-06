import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import {
  Plus, AlertTriangle, CheckCircle2, XCircle, ShieldAlert,
  Calendar, Beaker,
} from "lucide-react"

const CHECK_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  changeover:  { label: "Cambio línea",  color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" },
  startup:     { label: "Arranque",      color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"         },
  end_of_run:  { label: "Fin de corrida",color: "bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300"     },
  scheduled:   { label: "Programado",    color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300"         },
  complaint:   { label: "Queja",         color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"             },
}

const ALLERGEN_LABELS: Record<string, string> = {
  milk_present: "Leche", eggs_present: "Huevo", fish_present: "Pescado",
  shellfish_present: "Mariscos", tree_nuts_present: "Nueces",
  peanuts_present: "Cacahuate", wheat_present: "Trigo",
  soy_present: "Soya", sesame_present: "Sésamo",
}

const ALLERGEN_KEYS = Object.keys(ALLERGEN_LABELS)

export default async function AlergenosPage() {
  const supabase = await createClient()
  let logs: any[] = []
  let tableExists = true

  try {
    const since90 = new Date()
    since90.setDate(since90.getDate() - 90)
    const { data, error } = await supabase
      .from("allergen_checks")
      .select("*")
      .gte("check_date", since90.toISOString().split("T")[0])
      .order("check_date", { ascending: false })
      .order("check_time", { ascending: false })
      .limit(200)
    if (error?.code === "42P01") { tableExists = false } else { logs = data || [] }
  } catch { tableExists = false }

  const totalChecks   = logs.length
  const notCleared    = logs.filter((l) => l.cleared_for_run === false).length
  const recentFails   = logs.filter((l) => {
    if (l.cleared_for_run !== false) return false
    return (Date.now() - new Date(l.check_date).getTime()) / 86_400_000 <= 7
  })
  const lastCheck = logs[0]

  const fmtDate = (d: string) =>
    new Date(d + "T12:00:00").toLocaleDateString("es-MX", { month: "short", day: "numeric" })

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-orange-600" />
            </span>
            Control de Alérgenos
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            FALCPA 2004 · Sesame Allergen Act 2023 · 9 CFR 417 · 9 Big Allergens
          </p>
        </div>
        <Link
          href="/alergenos/nuevo"
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Nuevo chequeo
        </Link>
      </div>

      {/* Allergen reference banner */}
      <div className="bg-white dark:bg-[#111827] border border-orange-200 dark:border-orange-800 rounded-xl px-5 py-3.5">
        <p className="text-xs font-bold text-orange-800 dark:text-orange-200 mb-2">
          Los 9 alérgenos mayores requeridos por ley (FALCPA + Sesame 2023)
        </p>
        <div className="flex flex-wrap gap-2">
          {Object.values(ALLERGEN_LABELS).map((label) => (
            <span key={label} className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-slate-900 dark:text-slate-100">
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Migration notice */}
      {!tableExists && (
        <div className="bg-white dark:bg-[#111827] border border-blue-200 dark:border-blue-800 rounded-xl p-5">
          <p className="text-sm font-bold text-blue-800 dark:text-blue-200">Migración requerida</p>
          <p className="text-sm text-slate-900 dark:text-slate-100 mt-1">
            Ejecuta <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">015_allergen_pest_recall.sql</code> en Supabase para activar este módulo.
          </p>
        </div>
      )}

      {tableExists && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Chequeos (90d)",    value: totalChecks, icon: Beaker,     color: "text-orange-600",  bg: "bg-white dark:bg-[#111827]"  },
              { label: "No habilitados",    value: notCleared,  icon: XCircle,    color: notCleared > 0 ? "text-red-600" : "text-slate-600 dark:text-slate-300", bg: notCleared > 0 ? "bg-white dark:bg-[#111827]" : "bg-slate-100 dark:bg-slate-800" },
              { label: "Habilitados",       value: totalChecks - notCleared, icon: CheckCircle2, color: "text-green-600", bg: "bg-white dark:bg-[#111827]" },
              { label: "Último chequeo",    value: lastCheck ? fmtDate(lastCheck.check_date) : "—", icon: Calendar, color: "text-slate-600 dark:text-slate-300", bg: "bg-slate-100 dark:bg-slate-800" },
            ].map((k) => (
              <div key={k.label} className={`rounded-xl p-4 ${k.bg}`}>
                <k.icon className={`w-4 h-4 ${k.color} mb-2`} />
                <p className={`text-2xl font-black ${k.color} tabular-nums`}>{k.value}</p>
                <p className="text-[10.5px] font-medium text-slate-600 dark:text-slate-300 mt-1">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Recent holds */}
          {recentFails.length > 0 && (
            <div className="bg-white dark:bg-[#111827] border border-red-200 dark:border-red-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-sm font-bold text-red-800 dark:text-red-200">
                  {recentFails.length} línea{recentFails.length > 1 ? "s" : ""} no habilitada en los últimos 7 días
                </p>
              </div>
              {recentFails.map((f) => (
                <div key={f.id} className="bg-white dark:bg-red-900/10 rounded-lg px-4 py-3 text-sm space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100">{fmtDate(f.check_date)}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${CHECK_TYPE_LABELS[f.check_type]?.color}`}>
                      {CHECK_TYPE_LABELS[f.check_type]?.label}
                    </span>
                    <span className="text-slate-600 dark:text-slate-300">{f.area}</span>
                  </div>
                  {f.hold_reason && (
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      <span className="font-semibold">Motivo de retención:</span> {f.hold_reason}
                    </p>
                  )}
                  {f.corrective_action && (
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      <span className="font-semibold">Acción:</span> {f.corrective_action}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Log table */}
          <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Registros — últimos 90 días</span>
              <span className="text-xs text-slate-600 dark:text-slate-300">{totalChecks} chequeos</span>
            </div>
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                  <ShieldAlert className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                </div>
                <h3 className="text-base font-bold text-slate-700 dark:text-slate-200 mb-1">Sin registros aún</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-xs mb-6">
                  Registra los chequeos de alérgenos en cada cambio de línea para prevenir contaminación cruzada y cumplir con FALCPA y la Sesame Act 2023.
                </p>
                <Link href="/alergenos/nuevo" className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm">
                  <Plus className="w-4 h-4" />
                  Crear primer registro
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 dark:bg-slate-800">
                    <tr>
                      {["Fecha", "Tipo", "Área", "Antes", "Después", "Alérgenos detectados", "Limpieza", "Etiqueta", "Estado"].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                    {logs.map((log) => {
                      const ct = CHECK_TYPE_LABELS[log.check_type] ?? { label: log.check_type, color: "bg-slate-100 text-slate-600" }
                      const presentAllergens = ALLERGEN_KEYS.filter((k) => log[k] === true)
                      return (
                        <tr key={log.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${log.cleared_for_run === false ? "bg-red-50/30 dark:bg-red-900/10" : ""}`}>
                          <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">{fmtDate(log.check_date)}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${ct.color}`}>{ct.label}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{log.area}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-xs">{log.product_before || "—"}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-xs">{log.product_after || "—"}</td>
                          <td className="px-4 py-3">
                            {presentAllergens.length === 0 ? (
                              <span className="text-slate-300 dark:text-slate-600 text-xs">Ninguno</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {presentAllergens.map((k) => (
                                  <span key={k} className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                                    {ALLERGEN_LABELS[k]}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {log.equipment_cleaned
                              ? <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                              : <XCircle className="w-4 h-4 text-red-400 mx-auto" />}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {log.label_reviewed
                              ? <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                              : <XCircle className="w-4 h-4 text-red-400 mx-auto" />}
                          </td>
                          <td className="px-4 py-3">
                            {log.cleared_for_run === false
                              ? <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">RETENIDO</span>
                              : <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">HABILITADO</span>
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
