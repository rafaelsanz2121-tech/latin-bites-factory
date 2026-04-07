import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import {
  Scale, ArrowLeft, CheckCircle2, AlertTriangle,
  TrendingUp, Box, Clock,
} from "lucide-react"
import { BoxEntryForm } from "./BoxEntryForm"
import { CloseSessionButton } from "./CloseSessionButton"
import { DeleteEntryButton } from "./DeleteEntryButton"

function fmtW(lbs: number) {
  return `${lbs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} lbs`
}

function fmtTime(ts: string) {
  return new Date(ts).toLocaleTimeString("es-US", { hour: "2-digit", minute: "2-digit", hour12: true })
}

export default async function BoxSessionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: session } = await supabase
    .from("box_sessions")
    .select(`
      id, client_name, product_name, shift_date, status,
      target_boxes, target_weight_lbs, notes, created_at, completed_at,
      started_by:profiles!started_by(full_name)
    `)
    .eq("id", id)
    .single()

  if (!session) notFound()

  const { data: entries } = await supabase
    .from("box_entries")
    .select("id, box_number, weight_lbs, created_at, logged_by:profiles!logged_by(full_name)")
    .eq("session_id", id)
    .order("box_number", { ascending: true })

  const boxes  = entries || []
  const count  = boxes.length
  const totalW = boxes.reduce((s, b) => s + parseFloat(b.weight_lbs), 0)
  const avgW   = count > 0 ? totalW / count : 0
  const minW   = count > 0 ? Math.min(...boxes.map((b) => parseFloat(b.weight_lbs))) : 0
  const maxW   = count > 0 ? Math.max(...boxes.map((b) => parseFloat(b.weight_lbs))) : 0

  const pctBoxes  = session.target_boxes   ? Math.min(100, Math.round((count / session.target_boxes) * 100))          : null
  const pctWeight = session.target_weight_lbs ? Math.min(100, Math.round((totalW / parseFloat(session.target_weight_lbs)) * 100)) : null

  const isActive = session.status === "active"

  const kpis = [
    { label: "Total Cajas",      value: count,                icon: Box,        bar: "bg-blue-500",    iconBg: "bg-blue-100 dark:bg-blue-900/40",     iconText: "text-blue-600 dark:text-blue-300",    sub: session.target_boxes ? `meta: ${session.target_boxes}` : "registradas" },
    { label: "Peso Total",       value: totalW > 0 ? fmtW(totalW) : "—", icon: Scale, bar: "bg-emerald-500", iconBg: "bg-emerald-100 dark:bg-emerald-900/40", iconText: "text-emerald-600 dark:text-emerald-300", sub: session.target_weight_lbs ? `meta: ${fmtW(parseFloat(session.target_weight_lbs))}` : "acumulado" },
    { label: "Promedio / Caja",  value: avgW > 0 ? fmtW(avgW) : "—",    icon: TrendingUp, bar: "bg-violet-500", iconBg: "bg-violet-100 dark:bg-violet-900/40", iconText: "text-violet-600 dark:text-violet-300", sub: "peso promedio" },
    { label: "Rango",            value: count > 0 ? `${fmtW(minW)} — ${fmtW(maxW)}` : "—", icon: AlertTriangle, bar: "bg-amber-500", iconBg: "bg-amber-100 dark:bg-amber-900/40", iconText: "text-amber-600 dark:text-amber-300", sub: "mín — máx" },
  ]

  return (
    <div className="space-y-6 max-w-[900px]">

      {/* ── Header ── */}
      <div>
        <Link href="/box-tracker" className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" />
          Control de Cajas
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${isActive ? "bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-emerald-500/20" : "bg-slate-200 dark:bg-slate-700"}`}>
              {isActive
                ? <Scale className="w-6 h-6 text-white" />
                : <CheckCircle2 className="w-6 h-6 text-slate-500 dark:text-slate-400" />
              }
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-black text-slate-900 dark:text-white">{session.client_name}</h1>
                <span className="text-slate-400">·</span>
                <span className="text-lg text-slate-600 dark:text-slate-300">{session.product_name}</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  isActive ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300" : "bg-slate-100 dark:bg-slate-700/40 text-slate-600 dark:text-slate-400"
                }`}>
                  {isActive ? "En Producción" : "Completada"}
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {new Date(session.shift_date + "T12:00:00").toLocaleDateString("es-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                {session.started_by?.full_name && ` · Inició: ${session.started_by.full_name}`}
              </p>
            </div>
          </div>
          {isActive && (
            <CloseSessionButton sessionId={id} />
          )}
        </div>
      </div>

      {/* ── Progress bars ── */}
      {(pctBoxes !== null || pctWeight !== null) && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] p-4 shadow-sm space-y-3">
          {pctBoxes !== null && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">Cajas: {count} / {session.target_boxes}</span>
                <span className="text-[12px] font-bold text-blue-600 dark:text-blue-400">{pctBoxes}%</span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pctBoxes}%` }} />
              </div>
            </div>
          )}
          {pctWeight !== null && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">Peso: {fmtW(totalW)} / {fmtW(parseFloat(session.target_weight_lbs!))}</span>
                <span className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400">{pctWeight}%</span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pctWeight}%` }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] p-4 overflow-hidden shadow-sm">
            <div className={`absolute top-0 left-0 right-0 h-1 ${k.bar}`} />
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{k.label}</span>
              <div className={`w-8 h-8 rounded-lg ${k.iconBg} flex items-center justify-center`}>
                <k.icon className={`w-4 h-4 ${k.iconText}`} />
              </div>
            </div>
            <p className="text-lg font-black text-slate-900 dark:text-white leading-tight tabular-nums">{k.value}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Add box form (only when active) ── */}
      {isActive && (
        <BoxEntryForm sessionId={id} nextBoxNumber={count + 1} />
      )}

      {/* ── Box list ── */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Box className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">Registro de Cajas</h2>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">{count} {count === 1 ? "caja" : "cajas"} · {totalW > 0 ? fmtW(totalW) : "0 lbs"} total</span>
        </div>

        {boxes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
              <Box className="w-6 h-6 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Aún no hay cajas registradas</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Usa el formulario de arriba para agregar la primera caja.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">#</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Peso (lbs)</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Hora</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Registró</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {boxes.map((b, idx) => {
                  const w = parseFloat(b.weight_lbs)
                  const isLow  = avgW > 0 && w < avgW * 0.9
                  const isHigh = avgW > 0 && w > avgW * 1.1
                  return (
                    <tr key={b.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono font-bold text-slate-500 dark:text-slate-500">#{b.box_number}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-black tabular-nums ${isLow ? "text-red-600 dark:text-red-400" : isHigh ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white"}`}>
                            {fmtW(w)}
                          </span>
                          {isLow  && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400">BAJO</span>}
                          {isHigh && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">ALTO</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-slate-400 dark:text-slate-600" />
                          <span className="text-sm text-slate-500 dark:text-slate-400">{fmtTime(b.created_at)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600 dark:text-slate-400">{b.logged_by?.full_name ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isActive && (
                          <DeleteEntryButton entryId={b.id} boxNumber={b.box_number} />
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {/* Totals row */}
              {count > 0 && (
                <tfoot>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
                    <td className="px-4 py-3 text-[12px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wide">{count} cajas</td>
                    <td className="px-4 py-3 text-[13px] font-black text-slate-900 dark:text-white tabular-nums">{fmtW(totalW)}</td>
                    <td colSpan={3} className="px-4 py-3 text-[12px] text-slate-500 dark:text-slate-400 tabular-nums">
                      Promedio: {fmtW(avgW)} · Mín: {fmtW(minW)} · Máx: {fmtW(maxW)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {session.notes && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Notas del turno</p>
          <p className="text-sm text-slate-700 dark:text-slate-300">{session.notes}</p>
        </div>
      )}
    </div>
  )
}
