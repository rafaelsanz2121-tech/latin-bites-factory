import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import {
  Microscope, Plus, AlertTriangle, CheckCircle2,
  Clock, AlertCircle, ArrowUpRight, ShieldCheck, Info,
} from "lucide-react"

/* ── Helpers ── */
function fmtDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("es-US", {
    day: "2-digit", month: "short", year: "numeric",
  })
}

function daysSince(d: string) {
  return Math.floor((Date.now() - new Date(d + "T12:00:00").getTime()) / 86_400_000)
}

/* Zone descriptions per 9 CFR 430 */
const ZONES = {
  1: { label: "Zona 1", desc: "Contacto directo con el producto", color: "bg-red-100 text-red-700 border-red-200",    dot: "bg-red-500",    freq: "mensual" },
  2: { label: "Zona 2", desc: "Superficies adyacentes al producto", color: "bg-orange-100 text-orange-700 border-orange-200", dot: "bg-orange-500", freq: "semanal" },
  3: { label: "Zona 3", desc: "Ambiente cercano a la línea",       color: "bg-amber-100 text-amber-700 border-amber-200",  dot: "bg-amber-400",  freq: "semanal" },
  4: { label: "Zona 4", desc: "Áreas remotas / desagües",          color: "bg-blue-100 text-blue-700 border-blue-200",    dot: "bg-blue-400",   freq: "mensual" },
}

const SURFACE_ES: Record<string, string> = {
  food_contact:     "Contacto con alimento",
  non_food_contact: "Sin contacto directo",
  drain:            "Desagüe / Drenaje",
  air:              "Aire / Ambiente",
  utensil:          "Utensilio",
  hand_contact:     "Contacto manual",
}

const RESULT_STYLE = {
  negative: { label: "Negativo ✓", bg: "bg-green-50",  text: "text-green-700",  icon: CheckCircle2 },
  positive: { label: "¡POSITIVO!", bg: "bg-red-50",    text: "text-red-700",    icon: AlertCircle  },
  pending:  { label: "Pendiente",  bg: "bg-amber-50",  text: "text-amber-700",  icon: Clock        },
}

export default async function ListeriaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  /* Fetch last 90 days of samples */
  const cutoff = new Date(Date.now() - 90 * 86_400_000).toISOString().split("T")[0]
  let samples: any[] = []
  let tableExists = true

  try {
    const { data, error } = await supabase
      .from("listeria_samples")
      .select("*, profiles!collected_by(full_name), reviewed:profiles!reviewed_by(full_name)")
      .gte("sample_date", cutoff)
      .order("sample_date", { ascending: false })
    if (error) { tableExists = false } else { samples = data || [] }
  } catch { tableExists = false }

  /* ── Compute compliance per zone ── */
  const today = new Date()
  const zoneCompliance = ([1, 2, 3, 4] as const).map((zone) => {
    const z = ZONES[zone]
    const dayLimit = z.freq === "mensual" ? 35 : 10  // grace: +5 days
    const zoneSamples = samples.filter((s) => s.zone === zone)
    const last = zoneSamples[0]
    const daysSinceLast = last ? daysSince(last.sample_date) : null
    const overdue = daysSinceLast === null || daysSinceLast > dayLimit
    const positives = zoneSamples.filter((s) => s.result === "positive").length
    return { zone, ...z, last, daysSinceLast, overdue, positives, total: zoneSamples.length }
  })

  /* KPIs */
  const totalSamples = samples.length
  const positives    = samples.filter((s) => s.result === "positive").length
  const pending      = samples.filter((s) => s.result === "pending").length
  const overdueZones = zoneCompliance.filter((z) => z.overdue).length
  const openActions  = samples.filter((s) => s.result === "positive" && !s.reviewed_by).length

  return (
    <div className="space-y-6 max-w-[1100px]">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
              <Microscope className="w-4 h-4 text-purple-600" />
            </span>
            Monitoreo de Listeria
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            Programa ambiental · 9 CFR Part 430 · Zonas 1–4
          </p>
        </div>
        <Link
          href="/listeria/nuevo"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-lg transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Registrar Muestra
        </Link>
      </div>

      {/* Migration notice */}
      {!tableExists && (
        <div className="bg-white dark:bg-[#111827] border border-blue-200 dark:border-blue-800 rounded-xl p-5 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-blue-800 dark:text-blue-200">Módulo no activado</p>
            <p className="text-sm text-slate-900 dark:text-slate-100 mt-0.5">
              Ejecuta <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded font-mono">013_listeria_training.sql</code> en el SQL Editor de Supabase.
            </p>
          </div>
        </div>
      )}

      {/* Regulatory banner */}
      <div className="bg-white dark:bg-[#111827] border border-purple-200 dark:border-purple-800/40 rounded-xl px-5 py-3 flex items-center gap-3">
        <ShieldCheck className="w-4 h-4 text-purple-600 flex-shrink-0" />
        <p className="text-[12.5px] text-purple-800 dark:text-purple-200 font-medium">
          <strong>9 CFR 430.4</strong> — Productos RTE deben muestrear superficies de Zona 1 al menos <strong>mensualmente</strong> y
          Zonas 2–3 al menos <strong>semanalmente</strong>. Un resultado positivo requiere acción correctiva inmediata y retención del producto.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Muestras (90 días)", value: totalSamples, icon: Microscope, bg: "bg-slate-50 dark:bg-slate-700/40", text: "text-slate-700 dark:text-slate-200", border: "border-slate-200 dark:border-slate-600" },
          { label: "Resultados positivos", value: positives, icon: AlertCircle, bg: positives > 0 ? "bg-white dark:bg-[#111827]" : "bg-white dark:bg-[#111827]", text: positives > 0 ? "text-slate-900 dark:text-slate-100" : "text-slate-900 dark:text-slate-100", border: positives > 0 ? "border-red-200" : "border-green-200" },
          { label: "Zonas vencidas", value: overdueZones, icon: AlertTriangle, bg: overdueZones > 0 ? "bg-white dark:bg-[#111827]" : "bg-white dark:bg-[#111827]", text: overdueZones > 0 ? "text-slate-900 dark:text-slate-100" : "text-slate-900 dark:text-slate-100", border: overdueZones > 0 ? "border-amber-200" : "border-green-200" },
          { label: "Acciones abiertas", value: openActions, icon: Clock, bg: openActions > 0 ? "bg-white dark:bg-[#111827]" : "bg-slate-50 dark:bg-slate-700/40", text: openActions > 0 ? "text-slate-900 dark:text-slate-100" : "text-slate-600 dark:text-slate-400", border: openActions > 0 ? "border-orange-200" : "border-slate-200" },
        ].map((k) => (
          <div key={k.label} className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] p-4 overflow-hidden">
            <k.icon className={`w-4 h-4 ${k.text} mb-2`} />
            <p className={`text-3xl font-black tabular-nums ${k.iconText ?? k.text}`}>{k.value}</p>
            <p className="text-[10.5px] font-medium text-slate-600 dark:text-slate-300 mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Zone compliance status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {zoneCompliance.map((z) => {
          const statusColor = z.overdue
            ? "border-red-300 dark:border-red-700 bg-white dark:bg-[#111827]"
            : z.positives > 0
            ? "border-orange-300 dark:border-orange-700 bg-white dark:bg-[#111827]"
            : "border-green-200 dark:border-green-800 bg-white dark:bg-[#111827]"

          return (
            <div key={z.zone} className={`rounded-xl border-2 p-4 ${statusColor}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${z.dot}`} />
                  <span className="text-sm font-black text-slate-800 dark:text-slate-100">{z.label}</span>
                </div>
                {z.overdue
                  ? <AlertTriangle className="w-4 h-4 text-red-500" />
                  : <CheckCircle2 className="w-4 h-4 text-green-500" />
                }
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 mb-2">{z.desc}</p>
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-600 dark:text-slate-300">Frecuencia:</span>
                  <span className="font-semibold text-slate-600 dark:text-slate-300 capitalize">{z.freq}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-600 dark:text-slate-300">Último muestreo:</span>
                  <span className={`font-semibold ${z.overdue ? "text-slate-600 dark:text-slate-300" : "text-slate-600 dark:text-slate-300"}`}>
                    {z.last ? `hace ${z.daysSinceLast}d` : "Nunca"}
                  </span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-600 dark:text-slate-300">Total muestras:</span>
                  <span className="font-semibold text-slate-600 dark:text-slate-300">{z.total}</span>
                </div>
                {z.positives > 0 && (
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-600 dark:text-slate-300">Positivos:</span>
                    <span className="font-bold text-slate-600 dark:text-slate-300">{z.positives}</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Positives requiring action */}
      {positives > 0 && (
        <div className="bg-white dark:bg-[#111827] border-2 border-red-300 dark:border-red-700 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <h3 className="text-sm font-black text-red-800 dark:text-red-200">
              Resultados Positivos — Acción Correctiva Requerida (9 CFR 430.4)
            </h3>
          </div>
          <div className="space-y-2">
            {samples.filter((s) => s.result === "positive").map((s) => (
              <div key={s.id} className="bg-white dark:bg-red-900/30 rounded-lg px-4 py-3 flex items-center justify-between gap-3 border border-red-200 dark:border-red-700">
                <div>
                  <p className="text-sm font-bold text-red-800 dark:text-red-200">
                    Zona {s.zone} — {s.location}
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-300 mt-0.5">
                    {fmtDate(s.sample_date)} · {SURFACE_ES[s.surface_type] ?? s.surface_type}
                    {s.profiles?.full_name && ` · ${s.profiles.full_name}`}
                  </p>
                  {s.action_taken && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                      Acción: {s.action_taken}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {s.product_on_hold && (
                    <span className="text-[10px] font-bold bg-red-100 dark:bg-red-900 text-slate-900 dark:text-slate-100 px-2 py-0.5 rounded-full">
                      PRODUCTO EN HOLD
                    </span>
                  )}
                  {!s.reviewed_by && (
                    <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                      Sin revisar
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sample history table */}
      <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">Historial de Muestras</h2>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">Últimos 90 días · {samples.length} registros</p>
          </div>
          <span className="text-[10.5px] text-slate-600 dark:text-slate-300">Retención requerida: 1 año (9 CFR 417.5)</span>
        </div>

        {samples.length === 0 ? (
          <div className="flex flex-col items-center py-12">
            <Microscope className="w-8 h-8 text-slate-200 mb-2" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Sin muestras registradas</p>
            <Link href="/listeria/nuevo" className="mt-3 text-sm text-purple-500 hover:underline font-semibold">
              Registrar primera muestra →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-50 dark:border-slate-700 text-[10.5px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Fecha</th>
                  <th className="text-left px-4 py-3">Zona</th>
                  <th className="text-left px-4 py-3">Ubicación</th>
                  <th className="text-left px-4 py-3">Superficie</th>
                  <th className="text-left px-4 py-3">Método</th>
                  <th className="text-left px-4 py-3">Resultado</th>
                  <th className="text-left px-4 py-3">Acción tomada</th>
                  <th className="text-left px-4 py-3">Registró</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {samples.map((s) => {
                  const res = RESULT_STYLE[s.result as keyof typeof RESULT_STYLE] ?? RESULT_STYLE.pending
                  const zone = ZONES[s.zone as keyof typeof ZONES]
                  return (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3 text-[12.5px] font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                        {fmtDate(s.sample_date)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border ${zone?.color ?? ""}`}>
                          {zone?.label ?? `Z${s.zone}`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-slate-600 dark:text-slate-300 max-w-[160px] truncate">
                        {s.location}
                      </td>
                      <td className="px-4 py-3 text-[11.5px] text-slate-600 dark:text-slate-400">
                        {SURFACE_ES[s.surface_type] ?? s.surface_type}
                      </td>
                      <td className="px-4 py-3 text-[11.5px] text-slate-600 dark:text-slate-300 font-mono">
                        {s.test_method || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full ${res.bg} ${res.text}`}>
                          <res.icon className="w-3 h-3" />
                          {res.label}
                        </span>
                        {s.product_on_hold && (
                          <span className="ml-1 text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">HOLD</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[11.5px] text-slate-600 dark:text-slate-400 max-w-[200px] truncate">
                        {s.action_taken || "—"}
                      </td>
                      <td className="px-4 py-3 text-[11.5px] text-slate-600 dark:text-slate-300">
                        {s.profiles?.full_name ?? "—"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
