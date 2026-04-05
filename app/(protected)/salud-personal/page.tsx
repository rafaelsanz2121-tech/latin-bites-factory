import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import {
  Plus, AlertTriangle, CheckCircle2, XCircle,
  Heart, Users, Clock, ShieldCheck,
} from "lucide-react"

export default async function SaludPersonalPage() {
  const supabase = await createClient()
  let declarations: any[] = []
  let tableExists = true

  try {
    const since30 = new Date()
    since30.setDate(since30.getDate() - 30)
    const { data, error } = await supabase
      .from("health_declarations")
      .select("*")
      .gte("declaration_date", since30.toISOString().split("T")[0])
      .order("declaration_date", { ascending: false })
      .order("declaration_time", { ascending: false })
      .limit(500)
    if (error?.code === "42P01") { tableExists = false } else { declarations = data || [] }
  } catch { tableExists = false }

  const today = new Date().toISOString().split("T")[0]
  const todayDeclarations  = declarations.filter((d) => d.declaration_date === today)
  const totalToday         = todayDeclarations.length
  const notClearedToday    = todayDeclarations.filter((d) => !d.cleared_to_work).length
  const symptomsToday      = todayDeclarations.filter((d) => !d.symptom_free).length

  const total30  = declarations.length
  const notCleared30 = declarations.filter((d) => !d.cleared_to_work).length

  const recentExclusions = declarations.filter((d) =>
    !d.cleared_to_work &&
    (Date.now() - new Date(d.declaration_date + "T12:00:00").getTime()) / 86_400_000 <= 7
  )

  const fmtDate = (d: string) =>
    new Date(d + "T12:00:00").toLocaleDateString("es-MX", { weekday: "short", month: "short", day: "numeric" })

  const SHIFT: Record<string, string> = {
    morning:   "Mañana",
    afternoon: "Tarde",
    night:     "Noche",
    split:     "Partido",
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center">
              <Heart className="w-4 h-4 text-rose-600" />
            </span>
            Declaraciones de Salud
          </h1>
          <p className="text-sm text-slate-400 mt-1">9 CFR 416.8 · Control de salud del personal de proceso</p>
        </div>
        <Link
          href="/salud-personal/nuevo"
          className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Nueva declaración
        </Link>
      </div>

      {/* Active exclusions alert */}
      {tableExists && recentExclusions.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-sm font-bold text-red-800 dark:text-red-200">
              {recentExclusions.length} empleado{recentExclusions.length > 1 ? "s" : ""} excluido{recentExclusions.length > 1 ? "s" : ""} del área de proceso (últimos 7 días)
            </p>
          </div>
          {recentExclusions.map((d) => (
            <div key={d.id} className="bg-white dark:bg-red-900/10 rounded-lg px-4 py-3 text-xs space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-red-700 dark:text-red-300">{fmtDate(d.declaration_date)}</span>
                <span className="text-slate-500">{SHIFT[d.shift] ?? d.shift}</span>
                {d.restriction_note && (
                  <span className="text-slate-600 dark:text-slate-300">{d.restriction_note}</span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {d.has_vomiting      && <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded font-semibold">Vómito</span>}
                {d.has_diarrhea      && <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded font-semibold">Diarrea</span>}
                {d.has_jaundice      && <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded font-semibold">Ictericia</span>}
                {d.has_sore_throat_fever && <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded font-semibold">Garganta/Fiebre</span>}
                {d.has_infected_wound && <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded font-semibold">Herida infectada</span>}
              </div>
            </div>
          ))}
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
          {/* Today's summary */}
          <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 p-5">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
              Resumen de hoy — {new Date().toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 text-center">
                <p className="text-2xl font-black text-slate-700 dark:text-slate-200 tabular-nums">{totalToday}</p>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Declaraciones hoy</p>
              </div>
              <div className={`rounded-xl p-4 text-center ${symptomsToday > 0 ? "bg-amber-50 dark:bg-amber-900/20" : "bg-slate-50 dark:bg-slate-800/50"}`}>
                <p className={`text-2xl font-black tabular-nums ${symptomsToday > 0 ? "text-amber-600" : "text-slate-400"}`}>{symptomsToday}</p>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Con síntomas</p>
              </div>
              <div className={`rounded-xl p-4 text-center ${notClearedToday > 0 ? "bg-red-50 dark:bg-red-900/20" : "bg-green-50 dark:bg-green-900/20"}`}>
                <p className={`text-2xl font-black tabular-nums ${notClearedToday > 0 ? "text-red-600" : "text-green-600"}`}>{notClearedToday}</p>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Excluidos hoy</p>
              </div>
            </div>
          </div>

          {/* KPIs 30 days */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Declaraciones (30d)",  value: total30,       icon: Users,       color: "text-rose-600",   bg: "bg-rose-50 dark:bg-rose-900/20" },
              { label: "Exclusiones (30d)",    value: notCleared30,  icon: XCircle,     color: notCleared30 > 0 ? "text-red-600" : "text-slate-400",  bg: notCleared30 > 0 ? "bg-red-50 dark:bg-red-900/20" : "bg-slate-50 dark:bg-slate-800/50" },
              { label: "Con síntomas (30d)",   value: declarations.filter((d) => !d.symptom_free).length, icon: AlertTriangle, color: declarations.filter((d) => !d.symptom_free).length > 0 ? "text-amber-600" : "text-slate-400", bg: declarations.filter((d) => !d.symptom_free).length > 0 ? "bg-amber-50 dark:bg-amber-900/20" : "bg-slate-50 dark:bg-slate-800/50" },
              { label: "Hoy habilitados",      value: totalToday - notClearedToday, icon: ShieldCheck, color: "text-green-600",  bg: "bg-green-50 dark:bg-green-900/20" },
            ].map((k) => (
              <div key={k.label} className={`rounded-xl p-4 ${k.bg}`}>
                <k.icon className={`w-4 h-4 ${k.color} mb-2`} />
                <p className={`text-2xl font-black ${k.color} tabular-nums`}>{k.value}</p>
                <p className="text-[10.5px] font-medium text-slate-500 dark:text-slate-400 mt-1">{k.label}</p>
              </div>
            ))}
          </div>

          {/* 5 exclusion symptoms reference */}
          <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl px-5 py-4">
            <p className="text-xs font-bold text-rose-800 dark:text-rose-200 mb-2">9 CFR 416.8 — 5 síntomas que requieren exclusión del área de proceso</p>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
              {[
                { sym: "Vómito",             note: "Activo o reciente" },
                { sym: "Diarrea",            note: "Activa" },
                { sym: "Ictericia",          note: "Coloración amarilla" },
                { sym: "Garganta irritada\n+ fiebre", note: "Ambos simultáneos" },
                { sym: "Herida infectada",   note: "Expuesta" },
              ].map((s) => (
                <div key={s.sym} className="bg-white dark:bg-rose-900/10 rounded-lg px-3 py-2 text-center">
                  <p className="font-bold text-rose-700 dark:text-rose-300 whitespace-pre-line">{s.sym}</p>
                  <p className="text-rose-500/80 dark:text-rose-500 text-[10px] mt-0.5">{s.note}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Declaraciones — últimos 30 días</span>
              <span className="text-xs text-slate-400">{total30} registros</span>
            </div>
            {declarations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Heart className="w-8 h-8 text-slate-200 dark:text-slate-700" />
                <p className="text-sm text-slate-400">Sin declaraciones registradas.</p>
                <p className="text-xs text-slate-400 max-w-xs text-center">9 CFR 416.8 requiere documentar el estado de salud del personal antes de iniciar operaciones.</p>
                <Link href="/salud-personal/nuevo" className="text-sm text-rose-600 font-semibold hover:underline">+ Primera declaración</Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50">
                    <tr>
                      {["Fecha","Turno","Hora","Síntoma libre","Síntomas","Habilitado","Nota restricción"].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                    {declarations.map((d) => (
                      <tr key={d.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${!d.cleared_to_work ? "bg-red-50/20 dark:bg-red-900/5" : ""}`}>
                        <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">{fmtDate(d.declaration_date)}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{SHIFT[d.shift] ?? d.shift}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 tabular-nums">{d.declaration_time?.slice(0, 5) ?? "—"}</td>
                        <td className="px-4 py-3">
                          {d.symptom_free
                            ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                            : <XCircle className="w-4 h-4 text-red-500" />}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {d.has_vomiting      && <span className="text-[10px] px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded font-bold">Vómito</span>}
                            {d.has_diarrhea      && <span className="text-[10px] px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded font-bold">Diarrea</span>}
                            {d.has_jaundice      && <span className="text-[10px] px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded font-bold">Ictericia</span>}
                            {d.has_sore_throat_fever && <span className="text-[10px] px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded font-bold">Garganta/Fiebre</span>}
                            {d.has_infected_wound && <span className="text-[10px] px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded font-bold">Herida</span>}
                            {d.symptom_free && <span className="text-[10px] text-slate-400">Ninguno</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {d.cleared_to_work
                            ? <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">HABILITADO</span>
                            : <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">EXCLUIDO</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 max-w-[180px] truncate">{d.restriction_note || "—"}</td>
                      </tr>
                    ))}
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
