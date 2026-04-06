import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import {
  Plus, AlertTriangle, CheckCircle2, RotateCcw,
  Clock, Package, Target, TrendingUp,
} from "lucide-react"

const TRIGGER_LABELS: Record<string, { label: string; color: string }> = {
  allergen:           { label: "Alérgeno",          color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
  contamination:      { label: "Contaminación",     color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"             },
  labeling:           { label: "Etiquetado",        color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"         },
  foreign_material:   { label: "Material extraño",  color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" },
  temperature_abuse:  { label: "Abuso de temp.",    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"     },
  supplier_alert:     { label: "Alerta proveedor",  color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300"         },
  customer_complaint: { label: "Queja cliente",     color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300"         },
  other:              { label: "Otro",              color: "bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300"     },
}

const OUTCOME_CONFIG: Record<string, { label: string; color: string }> = {
  completed:    { label: "Completado",     color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"  },
  in_progress:  { label: "En proceso",    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"  },
  cancelled:    { label: "Cancelado",     color: "bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300"  },
}

export default async function RecallPage() {
  const supabase = await createClient()
  let recalls: any[] = []
  let tableExists = true

  try {
    const { data, error } = await supabase
      .from("mock_recalls")
      .select("*")
      .order("recall_date", { ascending: false })
      .limit(50)
    if (error?.code === "42P01") { tableExists = false } else { recalls = data || [] }
  } catch { tableExists = false }

  const totalRecalls   = recalls.length
  const mockDrills     = recalls.filter((r) => r.recall_type === "mock").length
  const actualRecalls  = recalls.filter((r) => r.recall_type === "actual").length
  const avgRecovery    = recalls.length > 0
    ? Math.round(recalls.reduce((s, r) => s + (Number(r.recovery_pct) || 0), 0) / recalls.length)
    : null
  const avgTimeMin     = recalls.filter((r) => r.time_to_identify_min).length > 0
    ? Math.round(recalls.filter((r) => r.time_to_identify_min).reduce((s, r) => s + r.time_to_identify_min, 0) / recalls.filter((r) => r.time_to_identify_min).length)
    : null

  const lastDrill = recalls.find((r) => r.recall_type === "mock")
  const today = new Date()
  const daysSinceDrill = lastDrill
    ? Math.floor((today.getTime() - new Date(lastDrill.recall_date + "T12:00:00").getTime()) / 86_400_000)
    : null

  const fmtDate = (d: string) =>
    new Date(d + "T12:00:00").toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" })

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center">
              <RotateCcw className="w-4 h-4 text-rose-600" />
            </span>
            Recall / Trazabilidad
          </h1>
          <p className="text-sm text-slate-400 mt-1">FSMA · 9 CFR 320 · Simulacros y retiros efectivos de mercado</p>
        </div>
        <Link
          href="/recall/nuevo"
          className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Nuevo simulacro
        </Link>
      </div>

      {/* Drill frequency warning */}
      {tableExists && daysSinceDrill !== null && daysSinceDrill > 365 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-5 py-4 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Último simulacro hace {daysSinceDrill} días.</strong> FSMA recomienda simulacro anual de recall mínimo.
          </p>
        </div>
      )}
      {tableExists && daysSinceDrill === null && recalls.length === 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-5 py-4 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Sin simulacros registrados.</strong> FSMA requiere al menos un simulacro de recall anual para demostrar trazabilidad efectiva.
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
              { label: "Simulacros realizados", value: mockDrills,                                              icon: Target,    color: "text-rose-600",   bg: "bg-rose-50 dark:bg-rose-900/20"         },
              { label: "Retiros reales",         value: actualRecalls,                                           icon: AlertTriangle, color: actualRecalls > 0 ? "text-red-600" : "text-slate-500 dark:text-slate-300", bg: actualRecalls > 0 ? "bg-red-50 dark:bg-red-900/20" : "bg-slate-100 dark:bg-slate-800" },
              { label: "% recuperación prom.",   value: avgRecovery !== null ? `${avgRecovery}%` : "—",          icon: TrendingUp, color: (avgRecovery ?? 0) >= 90 ? "text-green-600" : "text-amber-600", bg: (avgRecovery ?? 0) >= 90 ? "bg-green-50 dark:bg-green-900/20" : "bg-amber-50 dark:bg-amber-900/20" },
              { label: "Tiempo prom. identificar",value: avgTimeMin !== null ? `${avgTimeMin}min` : "—",         icon: Clock,     color: "text-slate-600 dark:text-slate-300", bg: "bg-slate-100 dark:bg-slate-800" },
            ].map((k) => (
              <div key={k.label} className={`rounded-xl p-4 ${k.bg}`}>
                <k.icon className={`w-4 h-4 ${k.color} mb-2`} />
                <p className={`text-2xl font-black ${k.color} tabular-nums`}>{k.value}</p>
                <p className="text-[10.5px] font-medium text-slate-500 dark:text-slate-400 mt-1">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Records */}
          <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Historial de simulacros y retiros</span>
              <span className="text-xs text-slate-400">{totalRecalls} registros</span>
            </div>
            {recalls.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <RotateCcw className="w-8 h-8 text-slate-200 dark:text-slate-700" />
                <p className="text-sm text-slate-400">Sin simulacros registrados.</p>
                <Link href="/recall/nuevo" className="text-sm text-rose-600 font-semibold hover:underline">+ Registrar primer simulacro</Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {recalls.map((r) => {
                  const tl = TRIGGER_LABELS[r.trigger_reason] ?? { label: r.trigger_reason, color: "bg-slate-100 text-slate-600" }
                  const oc = OUTCOME_CONFIG[r.outcome] ?? OUTCOME_CONFIG.completed
                  const recovPct = Number(r.recovery_pct)
                  return (
                    <div key={r.id} className="px-5 py-4 space-y-2">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${r.recall_type === "actual" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"}`}>
                              {r.recall_type === "actual" ? "RETIRO REAL" : "Simulacro"}
                            </span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tl.color}`}>{tl.label}</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${oc.color}`}>{oc.label}</span>
                          </div>
                          <p className="font-bold text-slate-800 dark:text-slate-100 text-[15px]">{r.product_name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">Lotes: {r.lot_numbers} · {fmtDate(r.recall_date)}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {recovPct > 0 && (
                            <p className={`text-2xl font-black tabular-nums ${recovPct >= 90 ? "text-green-600" : "text-amber-600"}`}>
                              {recovPct.toFixed(1)}%
                            </p>
                          )}
                          <p className="text-[10px] text-slate-400">recuperado</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
                        {r.time_to_identify_min && (
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Identificado en {r.time_to_identify_min}min</span>
                        )}
                        {r.customers_notified > 0 && (
                          <span className="flex items-center gap-1"><Package className="w-3 h-3" /> {r.customers_notified} clientes notificados</span>
                        )}
                        {r.usda_notified && (
                          <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold"><AlertTriangle className="w-3 h-3" /> USDA notificado</span>
                        )}
                      </div>
                      {r.corrective_action && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 py-2">
                          <span className="font-semibold">Mejora identificada:</span> {r.corrective_action}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
