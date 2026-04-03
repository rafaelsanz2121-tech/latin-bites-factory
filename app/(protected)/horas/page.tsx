import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { formatDate } from "@/lib/utils"
import { Timer, Plus, ArrowUpRight, Users, DollarSign, Clock } from "lucide-react"

function fmt$(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 })
}

function getWeekRange() {
  const now = new Date()
  const day = now.getDay()
  const start = new Date(now)
  start.setDate(now.getDate() - day) // Sunday
  const end = new Date(start)
  end.setDate(start.getDate() + 6)   // Saturday
  return {
    start: start.toISOString().split("T")[0],
    end:   end.toISOString().split("T")[0],
  }
}

export default async function HorasPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { start, end } = getWeekRange()

  /* ── Fetch labor entries ── */
  const { data: entries, error } = await supabase
    .from("labor_entries")
    .select(`
      id, work_date, hours_worked, hourly_rate, total_pay, area, task_description, is_overtime, created_at,
      profiles!employee_id(full_name, employee_id),
      production_orders(order_number, products(name))
    `)
    .gte("work_date", start)
    .lte("work_date", end)
    .order("work_date", { ascending: false })
    .order("created_at", { ascending: false })

  const allEntries = entries || []
  const tableNotReady = !!error

  /* ── KPIs ── */
  const totalHours    = allEntries.reduce((s: number, e: any) => s + Number(e.hours_worked ?? 0), 0)
  const totalLabor    = allEntries.reduce((s: number, e: any) => s + Number(e.total_pay ?? 0), 0)
  const uniqueEmps    = new Set(allEntries.map((e: any) => e.profiles?.full_name)).size
  const overtimeHours = allEntries.filter((e: any) => e.is_overtime).reduce((s: number, e: any) => s + Number(e.hours_worked), 0)

  /* ── Group by employee for summary ── */
  const byEmployee: Record<string, { name: string; hours: number; pay: number; entries: number }> = {}
  allEntries.forEach((e: any) => {
    const name = e.profiles?.full_name ?? "Desconocido"
    if (!byEmployee[name]) byEmployee[name] = { name, hours: 0, pay: 0, entries: 0 }
    byEmployee[name].hours   += Number(e.hours_worked ?? 0)
    byEmployee[name].pay     += Number(e.total_pay ?? 0)
    byEmployee[name].entries += 1
  })

  return (
    <div className="space-y-6 max-w-[1200px]">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
              <Timer className="w-4 h-4 text-green-600" />
            </span>
            Control de Horas de Producción
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Complementa ADP — asigna horas a órdenes de producción para calcular costo MOD real
          </p>
        </div>
        <Link
          href="/horas/nuevo"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> Registrar Horas
        </Link>
      </div>

      {/* ADP compatibility note */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
        <span className="text-lg flex-shrink-0">✓</span>
        <div>
          <p className="text-sm font-semibold text-green-800">Compatible con ADP y cualquier sistema de nómina</p>
          <p className="text-sm text-green-700 mt-0.5">
            Este módulo <strong>no reemplaza ADP</strong>. Solo registra en qué orden de producción se usaron las horas
            para calcular el costo de mano de obra por lote. El pago lo sigue procesando ADP normalmente.
          </p>
        </div>
      </div>

      {/* Migration notice */}
      {tableNotReady && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm font-bold text-blue-800">Activar módulo de horas</p>
          <p className="text-sm text-blue-700 mt-1">Ejecuta la migración <strong>012_enterprise_modules.sql</strong> en Supabase para habilitar este módulo.</p>
        </div>
      )}

      {/* Week indicator */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Clock className="w-4 h-4" />
        <span>Semana actual: <strong className="text-slate-700">{formatDate(start)}</strong> → <strong className="text-slate-700">{formatDate(end)}</strong></span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Horas esta semana", value: `${totalHours.toFixed(1)} hrs`, icon: Clock,       bg: "bg-green-50",  text: "text-green-700",  border: "border-green-100" },
          { label: "Costo MOD total",   value: fmt$(totalLabor),               icon: DollarSign,  bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-100" },
          { label: "Empleados",          value: String(uniqueEmps),             icon: Users,       bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-100" },
          { label: "Horas overtime",    value: `${overtimeHours.toFixed(1)} hrs`, icon: Timer,     bg: overtimeHours > 0 ? "bg-orange-50" : "bg-slate-50", text: overtimeHours > 0 ? "text-orange-700" : "text-slate-400", border: overtimeHours > 0 ? "border-orange-100" : "border-slate-100" },
        ].map((k) => (
          <div key={k.label} className={`rounded-xl border p-4 ${k.bg} ${k.border}`}>
            <div className="w-8 h-8 rounded-lg bg-white/60 flex items-center justify-center mb-3">
              <k.icon className={`w-4 h-4 ${k.text}`} />
            </div>
            <p className={`text-xl font-black ${k.text} leading-none`}>{k.value}</p>
            <p className="text-[11px] font-medium text-slate-500 mt-1.5">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Employee summary */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-800">Resumen por Empleado</h2>
          </div>
          {Object.values(byEmployee).length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Sin registros esta semana</p>
          ) : (
            <div className="divide-y divide-slate-50">
              {Object.values(byEmployee)
                .sort((a, b) => b.hours - a.hours)
                .map((emp) => (
                <div key={emp.name} className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[12.5px] font-semibold text-slate-700">{emp.name}</p>
                    <span className="text-[11px] text-slate-400">{emp.entries} registro{emp.entries !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[12px] text-green-600 font-bold">{emp.hours.toFixed(1)} hrs</span>
                    <span className="text-[12px] text-amber-600 font-bold">{fmt$(emp.pay)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Entries table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">Registros de la semana</h2>
            <span className="text-[11px] text-slate-400">{allEntries.length} entradas</span>
          </div>
          {allEntries.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-slate-300">
              <Timer className="w-8 h-8 mb-2" />
              <p className="text-sm font-medium text-slate-400">Sin registros esta semana</p>
              <Link href="/horas/nuevo" className="mt-3 text-sm text-green-500 hover:underline font-semibold">
                Registrar primeras horas →
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-50 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="text-left px-5 py-3">Empleado</th>
                    <th className="text-left px-4 py-3">Orden</th>
                    <th className="text-left px-4 py-3">Fecha</th>
                    <th className="text-right px-4 py-3">Horas</th>
                    <th className="text-right px-4 py-3">Tasa</th>
                    <th className="text-right px-4 py-3">Total</th>
                    <th className="text-left px-4 py-3">Área</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {allEntries.map((entry: any) => (
                    <tr key={entry.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3">
                        <p className="text-[12.5px] font-semibold text-slate-700">{entry.profiles?.full_name ?? "—"}</p>
                        {entry.is_overtime && (
                          <span className="text-[9.5px] font-bold px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded-full">OT</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[11.5px] font-mono text-slate-600">{entry.production_orders?.order_number ?? "Sin orden"}</p>
                        <p className="text-[10.5px] text-slate-400">{entry.production_orders?.products?.name}</p>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-slate-500">{formatDate(entry.work_date)}</td>
                      <td className="px-4 py-3 text-right font-bold text-[13px] text-green-700 tabular-nums">
                        {Number(entry.hours_worked).toFixed(2)}h
                      </td>
                      <td className="px-4 py-3 text-right text-[12px] text-slate-500 tabular-nums">
                        ${Number(entry.hourly_rate).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-[13px] text-amber-700 tabular-nums">
                        {fmt$(Number(entry.total_pay))}
                      </td>
                      <td className="px-4 py-3 text-[11.5px] text-slate-400">{entry.area || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
