import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import {
  Plus, AlertTriangle, CheckCircle2, XCircle,
  Droplets, Calendar, FlaskConical, Clock,
} from "lucide-react"

const CHILLING: Record<string, string> = {
  water_immersion: "Inmersión en agua",
  spray_chilling:  "Rociado",
  air_chilling:    "Aire frío",
  combination:     "Combinado",
}
const PRODUCT_TYPE: Record<string, string> = {
  rte:            "RTE",
  raw_intact:     "Crudo íntegro",
  raw_non_intact: "Crudo no íntegro",
  cooked:         "Cocido",
  other:          "Otro",
}

export default async function AguaRetenidaPage() {
  const supabase = await createClient()
  let logs: any[] = []
  let tableExists = true

  try {
    const since90 = new Date()
    since90.setDate(since90.getDate() - 90)
    const { data, error } = await supabase
      .from("retained_water_logs")
      .select("*")
      .gte("test_date", since90.toISOString().split("T")[0])
      .order("test_date", { ascending: false })
      .limit(200)
    if (error?.code === "42P01") { tableExists = false } else { logs = data || [] }
  } catch { tableExists = false }

  const total      = logs.length
  const fails      = logs.filter((l) => l.result === "fail").length
  const onHold     = logs.filter((l) => l.product_on_hold).length
  const avgRetained = logs.length > 0
    ? (logs.reduce((s, l) => s + Number(l.water_retained_pct ?? 0), 0) / logs.length).toFixed(2)
    : null

  const recentFails = logs.filter((l) =>
    l.result === "fail" &&
    (Date.now() - new Date(l.test_date + "T12:00:00").getTime()) / 86_400_000 <= 14
  )

  // Deadline alert
  const deadline = new Date("2026-07-01")
  const daysToDeadline = Math.ceil((deadline.getTime() - Date.now()) / 86_400_000)

  const fmtDate = (d: string) =>
    new Date(d + "T12:00:00").toLocaleDateString("es-MX", { month: "short", day: "numeric" })

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center">
              <Droplets className="w-4 h-4 text-cyan-600" />
            </span>
            Agua Retenida
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-300 mt-1">9 CFR 441 · Protocolo de Control de Agua Retenida en Carnes</p>
        </div>
        <Link
          href="/agua-retenida/nuevo"
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Nueva prueba
        </Link>
      </div>

      {/* Regulatory deadline banner */}
      <div className={`rounded-xl px-5 py-4 border flex items-start gap-3 ${
        daysToDeadline <= 60
          ? "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700"
          : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700"
      }`}>
        <Clock className={`w-5 h-5 flex-shrink-0 mt-0.5 ${daysToDeadline <= 60 ? "text-red-500" : "text-amber-500"}`} />
        <div>
          <p className={`text-sm font-black ${daysToDeadline <= 60 ? "text-red-800 dark:text-red-200" : "text-amber-800 dark:text-amber-200"}`}>
            ⚠ Deadline regulatorio: 1 de julio de 2026 — {daysToDeadline} días restantes
          </p>
          <p className={`text-xs mt-0.5 ${daysToDeadline <= 60 ? "text-red-700 dark:text-red-300" : "text-amber-700 dark:text-amber-300"}`}>
            9 CFR 441 requiere que todo procesador de carne documente y controle el agua retenida durante el proceso de enfriamiento. Tu planta debe tener registros activos antes de esta fecha.
          </p>
        </div>
      </div>

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
              { label: "Pruebas (90d)",      value: total,                                               icon: FlaskConical, color: "text-cyan-600",   bg: "bg-cyan-50 dark:bg-cyan-900/20"       },
              { label: "Fuera de límite",    value: fails,                                               icon: XCircle,     color: fails > 0 ? "text-red-600" : "text-slate-500 dark:text-slate-300", bg: fails > 0 ? "bg-red-50 dark:bg-red-900/20" : "bg-slate-100 dark:bg-slate-800" },
              { label: "Producto retenido",  value: onHold,                                             icon: AlertTriangle,color: onHold > 0 ? "text-amber-600" : "text-slate-500 dark:text-slate-300", bg: onHold > 0 ? "bg-amber-50 dark:bg-amber-900/20" : "bg-slate-100 dark:bg-slate-800" },
              { label: "% agua prom.",       value: avgRetained !== null ? `${avgRetained}%` : "—",     icon: Droplets,    color: "text-slate-600 dark:text-slate-300", bg: "bg-slate-100 dark:bg-slate-800" },
            ].map((k) => (
              <div key={k.label} className={`rounded-xl p-4 ${k.bg}`}>
                <k.icon className={`w-4 h-4 ${k.color} mb-2`} />
                <p className={`text-2xl font-black ${k.color} tabular-nums`}>{k.value}</p>
                <p className="text-[10.5px] font-medium text-slate-500 dark:text-slate-300 mt-1">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Species limits reference */}
          <div className="bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded-xl px-5 py-4">
            <p className="text-xs font-bold text-cyan-800 dark:text-cyan-200 mb-2">Límites FSIS por especie (9 CFR 441)</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {[
                { species: "Pollo entero",     limit: "≤8.0%" },
                { species: "Partes de pollo",  limit: "≤8.0%" },
                { species: "Pavo",             limit: "≤8.0%" },
                { species: "Cerdo / Pork",     limit: "≤0.0%" },
                { species: "Res / Beef",       limit: "≤0.0%" },
                { species: "Pescado (NMFS)",   limit: "≤Tabla NMFS" },
                { species: "RTE procesados",   limit: "Verificar CoR" },
                { species: "Productos mixtos", limit: "Declarar en label" },
              ].map((s) => (
                <div key={s.species} className="bg-white dark:bg-cyan-900/10 rounded-lg px-3 py-2">
                  <p className="font-semibold text-cyan-800 dark:text-cyan-200">{s.species}</p>
                  <p className="text-cyan-600 dark:text-cyan-400 font-bold">{s.limit}</p>
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
                  {recentFails.length} prueba{recentFails.length > 1 ? "s" : ""} fuera de límite (últimos 14 días)
                </p>
              </div>
              {recentFails.map((f) => (
                <div key={f.id} className="bg-white dark:bg-red-900/10 rounded-lg px-4 py-3 text-sm space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-red-700 dark:text-red-300">{fmtDate(f.test_date)}</span>
                    <span className="text-slate-600 dark:text-slate-300">{f.product_name}</span>
                    <span className="font-black text-red-600">{Number(f.water_retained_pct).toFixed(2)}% retenida</span>
                    <span className="text-xs text-slate-500">(límite: {f.regulatory_limit_pct}%)</span>
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
                <p className="text-xs text-slate-400 max-w-xs text-center">Comienza a documentar antes del <strong>1 julio 2026</strong> para cumplir con 9 CFR 441.</p>
                <Link href="/agua-retenida/nuevo" className="text-sm text-cyan-600 font-semibold hover:underline">+ Primera prueba</Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 dark:bg-slate-800">
                    <tr>
                      {["Fecha","Producto","Lote","Tipo","Método enfriamiento","Peso crudo","Peso procesado","Agua ret.","Límite","Estado"].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-[11px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                    {logs.map((log) => {
                      const pct     = Number(log.water_retained_pct)
                      const limit   = Number(log.regulatory_limit_pct)
                      const overLimit = pct > limit
                      return (
                        <tr key={log.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${overLimit ? "bg-red-50/30 dark:bg-red-900/10" : ""}`}>
                          <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">{fmtDate(log.test_date)}</td>
                          <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{log.product_name}</td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-300 text-xs font-mono">{log.lot_number || "—"}</td>
                          <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-300">{PRODUCT_TYPE[log.product_type] ?? log.product_type}</td>
                          <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-300">{CHILLING[log.chilling_method] ?? log.chilling_method}</td>
                          <td className="px-4 py-3 tabular-nums text-slate-600 dark:text-slate-300">{Number(log.raw_weight_g).toLocaleString()}g</td>
                          <td className="px-4 py-3 tabular-nums text-slate-600 dark:text-slate-300">{Number(log.processed_weight_g).toLocaleString()}g</td>
                          <td className={`px-4 py-3 font-black tabular-nums ${overLimit ? "text-red-600" : "text-green-600"}`}>
                            {pct.toFixed(3)}%
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-300 tabular-nums">{limit}%</td>
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
