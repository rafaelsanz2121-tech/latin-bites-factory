import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { TrendingUp, DollarSign, ShoppingCart, Package, Users, AlertCircle, BarChart3, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react"

function fmt$(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
function fmt$2(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 })
}

function getMonthRange(monthsBack = 0) {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1)
  const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0]
  const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0]
  const label = d.toLocaleString("es-US", { month: "long", year: "numeric" })
  return { start, end, label }
}

const COST_TYPE_ES: Record<string, string> = {
  raw_material: "Materia Prima",
  labor:        "Mano de Obra",
  packaging:    "Empaque",
  overhead:     "Gastos Generales",
  other:        "Otros",
}

const COST_TYPE_COLOR: Record<string, { bg: string; text: string; bar: string }> = {
  raw_material: { bg: "bg-blue-50",   text: "text-blue-700",   bar: "bg-blue-500"   },
  labor:        { bg: "bg-green-50",  text: "text-green-700",  bar: "bg-green-500"  },
  packaging:    { bg: "bg-purple-50", text: "text-purple-700", bar: "bg-purple-500" },
  overhead:     { bg: "bg-amber-50",  text: "text-amber-700",  bar: "bg-amber-500"  },
  other:        { bg: "bg-slate-50",  text: "text-slate-700",  bar: "bg-slate-400"  },
}

export default async function FinanzasPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>
}) {
  const { m } = await searchParams
  const monthsBack = m ? parseInt(m) : 0
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { start, end, label } = getMonthRange(monthsBack)
  const prevPeriod = getMonthRange(monthsBack + 1)

  /* ── Cost items for current period ── */
  let costItems: any[] = []
  let costError = false
  try {
    const { data, error } = await supabase
      .from("cost_items")
      .select(`
        id, cost_type, description, quantity, unit_cost, total_cost, created_at,
        production_orders(id, order_number, quantity_lbs, status,
          clients(name),
          products(name)
        )
      `)
      .gte("created_at", start + "T00:00:00")
      .lte("created_at", end + "T23:59:59")

    if (error) costError = true
    else costItems = data || []
  } catch { costError = true }

  /* ── Previous period for trend ── */
  let prevCostItems: any[] = []
  if (!costError) {
    const { data } = await supabase
      .from("cost_items")
      .select("cost_type, total_cost")
      .gte("created_at", prevPeriod.start + "T00:00:00")
      .lte("created_at", prevPeriod.end + "T23:59:59")
    prevCostItems = data || []
  }

  /* ── Labor entries for current period ── */
  let laborEntries: any[] = []
  if (!costError) {
    const { data } = await supabase
      .from("labor_entries")
      .select("hours_worked, total_pay, is_overtime, profiles!employee_id(full_name)")
      .gte("work_date", start)
      .lte("work_date", end)
    laborEntries = data || []
  }

  /* ── Inventory value ── */
  let inventoryItems: any[] = []
  if (!costError) {
    const { data } = await supabase
      .from("inventory_items")
      .select("current_stock, cost_per_unit, category")
      .eq("is_active", true)
    inventoryItems = data || []
  }

  /* ── Calculations ── */
  const totalCOGS     = costItems.reduce((s, i) => s + Number(i.total_cost ?? 0), 0)
  const prevTotalCOGS = prevCostItems.reduce((s, i) => s + Number(i.total_cost ?? 0), 0)
  const cogsDelta     = prevTotalCOGS > 0 ? ((totalCOGS - prevTotalCOGS) / prevTotalCOGS) * 100 : null

  /* By cost type */
  const byType: Record<string, number> = {}
  costItems.forEach((i) => {
    byType[i.cost_type] = (byType[i.cost_type] ?? 0) + Number(i.total_cost ?? 0)
  })
  const typeEntries = Object.entries(byType).sort((a, b) => b[1] - a[1])

  /* Labor KPIs */
  const totalHours    = laborEntries.reduce((s, e) => s + Number(e.hours_worked ?? 0), 0)
  const totalLabor    = laborEntries.reduce((s, e) => s + Number(e.total_pay ?? 0), 0)
  const overtimeHours = laborEntries.filter((e) => e.is_overtime).reduce((s, e) => s + Number(e.hours_worked), 0)

  /* By product */
  const byProduct: Record<string, { name: string; lbs: number; cost: number; orders: number }> = {}
  costItems.forEach((i) => {
    const o = i.production_orders
    if (!o) return
    const key = o.products?.name ?? "Sin producto"
    if (!byProduct[key]) byProduct[key] = { name: key, lbs: 0, cost: 0, orders: 0 }
    byProduct[key].cost   += Number(i.total_cost ?? 0)
    byProduct[key].lbs    += Number(o.quantity_lbs ?? 0)
    byProduct[key].orders += 1
  })
  const productEntries = Object.values(byProduct).sort((a, b) => b.cost - a.cost)

  /* By employee (from labor_entries) */
  const byEmployee: Record<string, { name: string; hours: number; pay: number }> = {}
  laborEntries.forEach((e) => {
    const name = (e.profiles as any)?.full_name ?? "Desconocido"
    if (!byEmployee[name]) byEmployee[name] = { name, hours: 0, pay: 0 }
    byEmployee[name].hours += Number(e.hours_worked ?? 0)
    byEmployee[name].pay   += Number(e.total_pay ?? 0)
  })
  const employeeEntries = Object.values(byEmployee).sort((a, b) => b.pay - a.pay).slice(0, 5)

  /* Inventory value */
  const inventoryValue = inventoryItems.reduce((s, i) =>
    s + (Number(i.current_stock) * Number(i.cost_per_unit ?? 0)), 0)

  /* Cost per lb overall */
  const totalLbs = [...new Set(costItems.map((i) => i.production_orders?.id).filter(Boolean))]
    .reduce((s, id) => {
      const order = costItems.find((i) => i.production_orders?.id === id)?.production_orders
      return s + Number(order?.quantity_lbs ?? 0)
    }, 0)
  const avgCostPerLb = totalLbs > 0 ? totalCOGS / totalLbs : 0

  return (
    <div className="space-y-6 max-w-[1200px]">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </span>
            Dashboard Financiero
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Costos reales de producción · Mano de obra · Inventario</p>
        </div>

        {/* Period navigation */}
        <div className="flex items-center gap-2">
          <a
            href={`/finanzas?m=${monthsBack + 1}`}
            className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg text-slate-600 dark:text-slate-400 hover:border-slate-400 transition-colors"
          >
            ← Mes anterior
          </a>
          <span className="px-3 py-1.5 text-xs font-bold bg-slate-800 text-white rounded-lg capitalize">
            {label}
          </span>
          {monthsBack > 0 && (
            <a
              href="/finanzas"
              className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg text-slate-600 dark:text-slate-400 hover:border-slate-400 transition-colors"
            >
              Mes actual →
            </a>
          )}
        </div>
      </div>

      {/* Migration notice */}
      {costError && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-blue-800">Módulo de finanzas no activado</p>
            <p className="text-sm text-blue-700 mt-0.5">
              Ejecuta <strong>012_enterprise_modules.sql</strong> en el SQL Editor de Supabase para habilitar este módulo.
            </p>
          </div>
        </div>
      )}

      {/* Top KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "COGS del período",
            value: fmt$(totalCOGS),
            sub: cogsDelta !== null
              ? `${cogsDelta > 0 ? "+" : ""}${cogsDelta.toFixed(1)}% vs mes anterior`
              : "Sin dato anterior",
            icon: DollarSign,
            bar: "bg-amber-500", iconBg: "bg-amber-100 dark:bg-amber-900/40", iconText: "text-amber-600 dark:text-amber-300",
            trend: cogsDelta,
          },
          {
            label: "Horas MOD",
            value: `${totalHours.toFixed(1)} hrs`,
            sub: `Costo total: ${fmt$(totalLabor)}`,
            icon: Users,
            bar: "bg-green-500", iconBg: "bg-green-100 dark:bg-green-900/40", iconText: "text-green-600 dark:text-green-300",
            trend: null,
          },
          {
            label: "Costo por libra (avg)",
            value: avgCostPerLb > 0 ? fmt$2(avgCostPerLb) : "—",
            sub: `${totalLbs.toLocaleString()} lbs producidas`,
            icon: BarChart3,
            bar: "bg-blue-500", iconBg: "bg-blue-100 dark:bg-blue-900/40", iconText: "text-blue-600 dark:text-blue-300",
            trend: null,
          },
          {
            label: "Valor de inventario",
            value: inventoryValue > 0 ? fmt$(inventoryValue) : "—",
            sub: `${inventoryItems.length} artículos activos`,
            icon: Package,
            bar: "bg-purple-500", iconBg: "bg-purple-100 dark:bg-purple-900/40", iconText: "text-purple-600 dark:text-purple-300",
            trend: null,
          },
        ].map((k) => (
          <div key={k.label} className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] p-4 overflow-hidden">
            <div className={`absolute top-0 left-0 right-0 h-1 ${k.bar}`} />
            <div className="flex items-start justify-between mb-3 mt-1">
              <div className={`w-8 h-8 rounded-lg ${k.iconBg ?? "bg-slate-100"} flex items-center justify-center`}>
                <k.icon className={`w-4 h-4 ${k.iconText ?? k.text}`} />
              </div>
              {k.trend !== null && (
                <span className={`flex items-center gap-0.5 text-[11px] font-bold ${k.trend > 5 ? "text-red-500" : k.trend < -5 ? "text-green-600" : "text-slate-600 dark:text-slate-400"}`}>
                  {k.trend > 2 ? <ArrowUpRight className="w-3 h-3" /> : k.trend < -2 ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                  {Math.abs(k.trend).toFixed(1)}%
                </span>
              )}
            </div>
            <p className="text-xl font-black text-slate-900 dark:text-slate-100 leading-none">{k.value}</p>
            <p className="text-[10.5px] font-medium text-slate-600 dark:text-slate-400 mt-1">{k.label}</p>
            <p className="text-[10px] text-slate-600 dark:text-slate-300 mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Cost breakdown by type */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-800">Desglose de Costos</h2>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">Por categoría este período</p>
          </div>
          {typeEntries.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-300 text-center py-8">Sin costos registrados</p>
          ) : (
            <div className="p-5 space-y-4">
              {typeEntries.map(([type, amount]) => {
                const pct = totalCOGS > 0 ? (amount / totalCOGS) * 100 : 0
                const colors = COST_TYPE_COLOR[type] ?? COST_TYPE_COLOR.other
                return (
                  <div key={type}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                        {COST_TYPE_ES[type] ?? type}
                      </span>
                      <div className="text-right">
                        <span className="text-[13px] font-black text-slate-700">{fmt$(amount)}</span>
                        <span className="text-[10px] text-slate-600 dark:text-slate-300 ml-1">{pct.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${colors.bar} transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">TOTAL COGS</span>
                <span className="text-base font-black text-slate-800">{fmt$(totalCOGS)}</span>
              </div>
            </div>
          )}
        </div>

        {/* By product */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-800">Costo por Producto</h2>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">Ordenado por costo total</p>
          </div>
          {productEntries.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-300 text-center py-8">Sin datos</p>
          ) : (
            <div className="divide-y divide-slate-50">
              {productEntries.map((p) => {
                const cpLb = p.lbs > 0 ? p.cost / p.lbs : 0
                const pct  = totalCOGS > 0 ? (p.cost / totalCOGS) * 100 : 0
                return (
                  <div key={p.name} className="px-5 py-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[12.5px] font-semibold text-slate-700 truncate max-w-[160px]">{p.name}</p>
                      <span className="text-[12.5px] font-black text-slate-900 dark:text-slate-100">{fmt$(p.cost)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden mr-2">
                        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10.5px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {cpLb > 0 ? `${fmt$2(cpLb)}/lb` : "sin lbs"} · {p.orders} orden{p.orders !== 1 ? "es" : ""}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Top employees by labor cost */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-800">MOD por Empleado</h2>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">Top 5 por costo de mano de obra</p>
          </div>
          {employeeEntries.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-300 text-center py-8">Sin horas registradas</p>
          ) : (
            <div className="divide-y divide-slate-50">
              {employeeEntries.map((emp) => {
                const pct = totalLabor > 0 ? (emp.pay / totalLabor) * 100 : 0
                return (
                  <div key={emp.name} className="px-5 py-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[12.5px] font-semibold text-slate-700 truncate max-w-[160px]">{emp.name}</p>
                      <span className="text-[12.5px] font-black text-slate-900 dark:text-slate-100">{fmt$(emp.pay)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden mr-2">
                        <div className="h-full bg-green-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10.5px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {emp.hours.toFixed(1)} hrs
                      </span>
                    </div>
                  </div>
                )
              })}
              {overtimeHours > 0 && (
                <div className="px-5 py-3 bg-orange-50">
                  <p className="text-[11.5px] font-semibold text-orange-700">
                    ⚠ {overtimeHours.toFixed(1)} horas de overtime este período
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Recent cost items table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Partidas de Costo Recientes</h2>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">{costItems.length} registros este período</p>
          </div>
          <a href="/costos" className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700 transition-colors">
            Ver todas <ArrowUpRight className="w-3 h-3" />
          </a>
        </div>

        {costItems.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-slate-300">
            <ShoppingCart className="w-8 h-8 mb-2" />
            <p className="text-sm font-medium  text-slate-600 dark:text-slate-300">Sin costos registrados este período</p>
            <a href="/costos" className="mt-3 text-sm text-amber-500 hover:underline font-semibold">
              Ir a Control de Costos →
            </a>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-50 text-[10.5px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Descripción</th>
                  <th className="text-left px-4 py-3">Tipo</th>
                  <th className="text-left px-4 py-3">Orden</th>
                  <th className="text-left px-4 py-3">Producto</th>
                  <th className="text-right px-4 py-3">Cantidad</th>
                  <th className="text-right px-4 py-3">Costo Unit.</th>
                  <th className="text-right px-4 py-3">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {costItems.slice(0, 15).map((item: any) => {
                  const colors = COST_TYPE_COLOR[item.cost_type] ?? COST_TYPE_COLOR.other
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3">
                        <p className="text-[12.5px] font-semibold text-slate-700">{item.description}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                          {COST_TYPE_ES[item.cost_type] ?? item.cost_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11.5px] font-mono text-slate-600 dark:text-slate-400">
                        {item.production_orders?.order_number ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-[11.5px] text-slate-600 dark:text-slate-400">
                        {item.production_orders?.products?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-[12px] text-slate-600 dark:text-slate-400 tabular-nums">
                        {Number(item.quantity).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-[12px] text-slate-600 dark:text-slate-400 tabular-nums">
                        {fmt$2(Number(item.unit_cost))}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-[13px] text-amber-700 tabular-nums">
                        {fmt$2(Number(item.total_cost))}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {costItems.length > 15 && (
              <div className="px-5 py-3 border-t border-slate-50 text-center">
                <a href="/costos" className="text-xs font-semibold text-amber-600 hover:underline">
                  Ver {costItems.length - 15} partidas más en Control de Costos →
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Inventory snapshot */}
      {inventoryItems.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Snapshot de Inventario</h2>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">Valor actual en planta por categoría</p>
            </div>
            <a href="/inventario" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">
              Ver inventario <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
          <div className="p-5">
            {(() => {
              const byCategory: Record<string, { value: number; count: number }> = {}
              inventoryItems.forEach((i) => {
                const cat = i.category ?? "other"
                if (!byCategory[cat]) byCategory[cat] = { value: 0, count: 0 }
                byCategory[cat].value += Number(i.current_stock) * Number(i.cost_per_unit ?? 0)
                byCategory[cat].count += 1
              })
              const catEntries = Object.entries(byCategory).sort((a, b) => b[1].value - a[1].value)
              const CAT_ES: Record<string, string> = {
                raw_material: "Materia Prima", packaging: "Empaque",
                finished_good: "Producto Terminado", supply: "Insumos", chemical: "Químicos",
              }
              return (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {catEntries.map(([cat, { value, count }]) => (
                    <div key={cat} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                      <p className="text-[10.5px] font-semibold text-slate-600 dark:text-slate-400 mb-1">{CAT_ES[cat] ?? cat}</p>
                      <p className="text-[15px] font-black text-slate-800">{value > 0 ? fmt$(value) : "—"}</p>
                      <p className="text-[10px] text-slate-600 dark:text-slate-300 mt-0.5">{count} artículo{count !== 1 ? "s" : ""}</p>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
