import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import {
  Factory,
  Scale,
  Play,
  Plus,
  CheckCircle2,
  Clock,
  Package2,
  ArrowRight,
  TrendingUp,
  Box,
  Zap,
} from "lucide-react"

function fmtDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("es-US", {
    weekday: "short",
    day:     "2-digit",
    month:   "short",
  })
}

function fmtWeight(lbs: number) {
  return `${lbs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} lbs`
}

function fmtDuration(start: string | null, end: string | null) {
  if (!start) return "—"
  const s = new Date(start).getTime()
  const e = end ? new Date(end).getTime() : Date.now()
  const mins = Math.floor((e - s) / 60000)
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

const STATUS_STYLE: Record<string, string> = {
  active:    "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
  completed: "bg-slate-100 dark:bg-slate-700/40 text-slate-600 dark:text-slate-400",
  cancelled: "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400",
}

const STATUS_LABELS: Record<string, string> = {
  active:    "En Producción",
  completed: "Completada",
  cancelled: "Cancelada",
}

export default async function ProduccionPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const today = new Date().toISOString().split("T")[0]

  // Fetch last 7 days + today
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const weekStart = sevenDaysAgo.toISOString().split("T")[0]

  const { data: sessions } = await supabase
    .from("box_sessions")
    .select(`
      id, client_name, product_name, shift_date, status,
      target_boxes, target_weight_lbs, created_at, completed_at,
      start_time, production_line, session_number, lot_reference,
      box_entries(id, weight_lbs)
    `)
    .gte("shift_date", weekStart)
    .order("created_at", { ascending: false })

  const allSessions      = sessions || []
  const todaySessions    = allSessions.filter((s) => s.shift_date === today)
  const recentSessions   = allSessions.filter((s) => s.shift_date !== today)
  const activeSessions   = todaySessions.filter((s) => s.status === "active")

  const totalBoxesToday  = todaySessions.reduce((sum, s) => sum + (s.box_entries?.length || 0), 0)
  const totalWeightToday = todaySessions.reduce(
    (sum, s) =>
      sum +
      (s.box_entries || []).reduce(
        (a: number, b: any) => a + parseFloat(b.weight_lbs || "0"),
        0
      ),
    0
  )
  const sessionsThisWeek = allSessions.length

  const kpis = [
    {
      label:    "Cajas Hoy",
      value:    totalBoxesToday,
      icon:     Box,
      bar:      "bg-emerald-500",
      iconBg:   "bg-emerald-100 dark:bg-emerald-900/40",
      iconText: "text-emerald-600 dark:text-emerald-300",
      sub:      "cajas registradas",
    },
    {
      label:    "Lbs Hoy",
      value:    totalWeightToday > 0 ? fmtWeight(totalWeightToday) : "—",
      icon:     Scale,
      bar:      "bg-blue-500",
      iconBg:   "bg-blue-100 dark:bg-blue-900/40",
      iconText: "text-blue-600 dark:text-blue-300",
      sub:      "libras producidas",
    },
    {
      label:    "Sesiones Activas",
      value:    activeSessions.length,
      icon:     Zap,
      bar:      "bg-orange-500",
      iconBg:   "bg-orange-100 dark:bg-orange-900/40",
      iconText: "text-orange-600 dark:text-orange-300",
      sub:      "en proceso ahora",
    },
    {
      label:    "Sesiones Semana",
      value:    sessionsThisWeek,
      icon:     TrendingUp,
      bar:      "bg-violet-500",
      iconBg:   "bg-violet-100 dark:bg-violet-900/40",
      iconText: "text-violet-600 dark:text-violet-300",
      sub:      "últimos 7 días",
    },
  ]

  return (
    <div className="space-y-6 max-w-[1100px]">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <Factory className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Centro de Producción
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Monitoreo en tiempo real · Sesiones de turno · Control de cajas y peso
            </p>
          </div>
        </div>
        <Link
          href="/produccion/iniciar"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4" />
          Nueva Sesión
        </Link>
      </div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] p-4 overflow-hidden shadow-sm"
          >
            <div className={`absolute top-0 left-0 right-0 h-1 ${k.bar}`} />
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {k.label}
              </span>
              <div className={`w-8 h-8 rounded-lg ${k.iconBg} flex items-center justify-center`}>
                <k.icon className={`w-4 h-4 ${k.iconText}`} />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white leading-none tabular-nums">
              {k.value}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ── ¿Qué producimos hoy? CTA ── */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-600 to-emerald-800 p-6 shadow-lg shadow-emerald-500/20">
        {/* decorative circles */}
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute -bottom-8 -right-4 w-32 h-32 rounded-full bg-white/5" />

        <div className="relative">
          <p className="text-emerald-200 text-xs font-semibold uppercase tracking-widest mb-1">
            Producción
          </p>
          <h2 className="text-2xl font-black text-white mb-1">¿Qué producimos hoy?</h2>
          <p className="text-emerald-100 text-sm mb-5 max-w-sm">
            Registra cliente, producto, metas de cajas y peso. La sesión quedará activa para registrar en tiempo real.
          </p>
          <Link
            href="/produccion/iniciar"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-emerald-50 text-emerald-700 text-sm font-bold rounded-xl transition-colors shadow-sm"
          >
            <Play className="w-4 h-4 fill-emerald-600 text-emerald-600" />
            Iniciar nueva sesión de producción
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* ── Active Sessions Today ── */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              {activeSessions.length > 0 && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${activeSessions.length > 0 ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`}
              />
            </span>
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">
              Sesiones de Hoy
            </h2>
            {todaySessions.length > 0 && (
              <span className="inline-flex items-center px-2 py-px rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {todaySessions.length}
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">{today}</span>
        </div>

        {todaySessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 px-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
              <Factory className="w-7 h-7 text-slate-400 dark:text-slate-500" />
            </div>
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">
              Sin producción hoy
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-xs mb-5">
              No hay sesiones registradas para hoy. Inicia una para comenzar.
            </p>
            <Link
              href="/produccion/iniciar"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
            >
              <Play className="w-4 h-4 fill-white" />
              Iniciar Producción
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {todaySessions.map((s) => {
              const boxes  = s.box_entries?.length || 0
              const totalW = (s.box_entries || []).reduce(
                (a: number, b: any) => a + parseFloat(b.weight_lbs || "0"),
                0
              )
              const pctBoxes =
                s.target_boxes
                  ? Math.min(100, Math.round((boxes / s.target_boxes) * 100))
                  : null

              return (
                <Link
                  key={s.id}
                  href={`/produccion/${s.id}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        s.status === "active"
                          ? "bg-emerald-100 dark:bg-emerald-900/40"
                          : "bg-slate-100 dark:bg-slate-800"
                      }`}
                    >
                      {s.status === "active" ? (
                        <Play className="w-5 h-5 text-emerald-600 dark:text-emerald-400 fill-emerald-600 dark:fill-emerald-400" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {s.client_name}
                        </p>
                        <span className="text-[11px] text-slate-400">·</span>
                        <p className="text-sm text-slate-600 dark:text-slate-300">{s.product_name}</p>
                        <span
                          className={`inline-flex items-center px-2 py-px rounded-full text-[10px] font-semibold ${STATUS_STYLE[s.status] ?? ""}`}
                        >
                          {STATUS_LABELS[s.status] ?? s.status}
                        </span>
                        {s.production_line && (
                          <span className="inline-flex items-center px-2 py-px rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                            {s.production_line}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                          {boxes} {boxes === 1 ? "caja" : "cajas"}
                        </span>
                        {totalW > 0 && (
                          <>
                            <span className="text-slate-300 dark:text-slate-700">·</span>
                            <span className="text-[12px] text-slate-600 dark:text-slate-400 tabular-nums">
                              {fmtWeight(totalW)}
                            </span>
                          </>
                        )}
                        {pctBoxes !== null && (
                          <>
                            <span className="text-slate-300 dark:text-slate-700">·</span>
                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                              {pctBoxes}% de meta
                            </span>
                          </>
                        )}
                        <span className="text-slate-300 dark:text-slate-700">·</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {fmtDuration(s.start_time, s.completed_at)}
                        </span>
                      </div>
                      {/* Progress bar when target exists */}
                      {pctBoxes !== null && (
                        <div className="mt-2 w-48 h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all"
                            style={{ width: `${pctBoxes}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-slate-400 transition-colors flex-shrink-0 ml-4" />
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Recent Sessions Table (last 7 days, not today) ── */}
      {recentSessions.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">
              Sesiones Recientes
            </h2>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 ml-1">últimos 7 días</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                  {["Fecha", "Cliente", "Producto", "Cajas", "Peso Total", "Duración", "Estado", ""].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {recentSessions.map((s) => {
                  const boxes  = s.box_entries?.length || 0
                  const totalW = (s.box_entries || []).reduce(
                    (a: number, b: any) => a + parseFloat(b.weight_lbs || "0"),
                    0
                  )
                  return (
                    <tr
                      key={s.id}
                      className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {fmtDate(s.shift_date)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {s.client_name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600 dark:text-slate-300">
                          {s.product_name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                          {boxes}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                          {totalW > 0 ? fmtWeight(totalW) : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600 dark:text-slate-400 tabular-nums">
                          {fmtDuration(s.start_time, s.completed_at)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold ${STATUS_STYLE[s.status] ?? ""}`}
                        >
                          {STATUS_LABELS[s.status] ?? s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/produccion/${s.id}`}
                          className="inline-flex items-center gap-1 text-[12px] font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors whitespace-nowrap"
                        >
                          Ver <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Full empty state ── */}
      {allSessions.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] flex flex-col items-center justify-center py-20 px-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-4">
            <Package2 className="w-8 h-8 text-emerald-400 dark:text-emerald-500" />
          </div>
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-200 mb-1">
            Sin sesiones registradas
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-sm mb-6">
            Inicia tu primera sesión de producción para comenzar a registrar cajas, pesos y
            totales automáticamente.
          </p>
          <Link
            href="/produccion/iniciar"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
          >
            <Play className="w-4 h-4 fill-white" />
            Iniciar Primera Sesión
          </Link>
        </div>
      )}
    </div>
  )
}
