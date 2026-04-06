import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { formatDate } from "@/lib/utils"
import { DollarSign, TrendingDown, TrendingUp, Package, ArrowUpRight, Plus, AlertCircle } from "lucide-react"
import { ExportCostosButton } from "@/components/export/ExportCostosButton"

function fmt$(n: number | null) {
  if (n == null) return "—"
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 })
}

const STATUS_ES: Record<string, string> = {
  planned: "Planificado", in_production: "En Producción", cooking: "Cocción",
  chilling: "Enfriando", packaging: "Empacando", refrigerating: "Refrigerando",
  ready: "Listo", shipped: "Enviado", cancelled: "Cancelado",
}
const STATUS_COLOR: Record<string, string> = {
  planned: "bg-blue-50 text-blue-700", in_production: "bg-orange-50 text-orange-700",
  cooking: "bg-red-50 text-red-700", chilling: "bg-cyan-50 text-cyan-700",
  packaging: "bg-purple-50 text-purple-700", refrigerating: "bg-indigo-50 text-indigo-700",
  ready: "bg-emerald-50 text-emerald-700", shipped: "bg-slate-50 text-slate-600",
  cancelled: "bg-red-50 text-red-400",
}

export default async function CostosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  /* ── Fetch production orders ── */
  const { data: orders } = await supabase
    .from("production_orders")
    .select("id, order_number, status, quantity_lbs, order_date, clients(company_name), products(name)")
    .order("created_at", { ascending: false })
    .limit(50)

  /* ── Fetch cost summaries per order (from view if exists) ── */
  let costsByOrder: Record<string, any> = {}
  try {
    const { data: costs } = await supabase
      .from("production_order_costs")
      .select("*")
    if (costs) {
      costsByOrder = Object.fromEntries(costs.map((c: any) => [c.production_order_id, c]))
    }
  } catch {}

  const allOrders = orders || []

  /* ── KPIs ── */
  const ordersWithCosts = allOrders.filter((o: any) => costsByOrder[o.id])
  const totalCOGS       = ordersWithCosts.reduce((s: number, o: any) => s + (costsByOrder[o.id]?.total_cost ?? 0), 0)
  const avgCostPerLb    = ordersWithCosts.length
    ? ordersWithCosts.reduce((s: number, o: any) => s + (costsByOrder[o.id]?.cost_per_lb ?? 0), 0) / ordersWithCosts.length
    : 0
  const ordersNoCost = allOrders.length - ordersWithCosts.length

  return (
    <div className="space-y-6 max-w-[1200px]">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-amber-600" />
            </span>
            Costos de Producción
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Costo real por lote · Compatible con ADP y QuickBooks</p>
        </div>
        <ExportCostosButton label="Exportar Costos" />
      </div>

      {/* Migration notice if no data */}
      {allOrders.length > 0 && ordersWithCosts.length === 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Módulo recién activado</p>
            <p className="text-sm text-amber-700 mt-0.5">
              Las órdenes de producción ya están cargadas. Entra a cada orden y agrega los costos
              de materia prima, mano de obra y empaque para ver el costo real por lote.
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total COGS",        value: fmt$(totalCOGS),                          icon: DollarSign, bg: "bg-amber-50",  text: "text-amber-700",   border: "border-amber-100" },
          { label: "Órdenes con costo", value: `${ordersWithCosts.length} / ${allOrders.length}`, icon: Package,     bg: "bg-blue-50",   text: "text-blue-700",    border: "border-blue-100" },
          { label: "Costo prom./lb",    value: avgCostPerLb ? `$${avgCostPerLb.toFixed(3)}` : "—", icon: TrendingDown, bg: "bg-green-50",  text: "text-green-700",   border: "border-green-100" },
          { label: "Sin costo cargado", value: String(ordersNoCost),                     icon: AlertCircle, bg: ordersNoCost > 0 ? "bg-red-50" : "bg-slate-50", text: ordersNoCost > 0 ? "text-red-600" : "text-slate-400", border: ordersNoCost > 0 ? "border-red-100" : "border-slate-100" },
        ].map((k) => (
          <div key={k.label} className={`rounded-xl border p-4 ${k.bg} ${k.border}`}>
            <div className={`w-8 h-8 rounded-lg bg-white/60 flex items-center justify-center mb-3`}>
              <k.icon className={`w-4 h-4 ${k.text}`} />
            </div>
            <p className={`text-xl font-black ${k.text} leading-none`}>{k.value}</p>
            <p className="text-[11px] font-medium text-slate-500 mt-1.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Orders table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">Órdenes de Producción — Costos</h2>
          <span className="text-[11px]  text-slate-600 dark:text-slate-300">{allOrders.length} órdenes</span>
        </div>

        {allOrders.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-slate-300">
            <Package className="w-10 h-10 mb-3" />
            <p className="text-sm font-medium  text-slate-600 dark:text-slate-300">Sin órdenes de producción</p>
            <Link href="/production/new" className="mt-3 text-sm text-red-500 hover:underline font-semibold">
              Crear primera orden →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Orden</th>
                  <th className="text-left px-4 py-3">Cliente</th>
                  <th className="text-left px-4 py-3">Producto</th>
                  <th className="text-right px-4 py-3">Lbs</th>
                  <th className="text-right px-4 py-3">MP</th>
                  <th className="text-right px-4 py-3">Mano de Obra</th>
                  <th className="text-right px-4 py-3">Empaque</th>
                  <th className="text-right px-4 py-3">Total</th>
                  <th className="text-right px-4 py-3">$/lb</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {allOrders.map((order: any) => {
                  const cost = costsByOrder[order.id]
                  const hasCost = !!cost && cost.total_cost > 0
                  return (
                    <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3">
                        <p className="text-[12.5px] font-mono font-bold text-slate-700">{order.order_number}</p>
                        <p className="text-[10.5px]  text-slate-600 dark:text-slate-300">{formatDate(order.order_date)}</p>
                      </td>
                      <td className="px-4 py-3 text-[12.5px] text-slate-600">{order.clients?.company_name || "—"}</td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                          {order.products?.name || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-[12.5px] font-semibold text-slate-600 tabular-nums">
                        {order.quantity_lbs ? Number(order.quantity_lbs).toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-[12px] tabular-nums text-slate-500">
                        {hasCost ? fmt$(cost.raw_material_cost) : <span className="text-slate-200">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-[12px] tabular-nums text-slate-500">
                        {hasCost ? fmt$(cost.labor_cost) : <span className="text-slate-200">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-[12px] tabular-nums text-slate-500">
                        {hasCost ? fmt$(cost.packaging_cost) : <span className="text-slate-200">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {hasCost ? (
                          <span className="text-[13px] font-black text-amber-700">{fmt$(cost.total_cost)}</span>
                        ) : (
                          <span className="text-[10.5px] text-red-400 font-semibold bg-red-50 px-2 py-0.5 rounded-full">Sin costo</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-[12px] tabular-nums text-green-600 font-semibold">
                        {hasCost && cost.cost_per_lb ? `$${Number(cost.cost_per_lb).toFixed(3)}` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[order.status] ?? "bg-slate-50 text-slate-500"}`}>
                          {STATUS_ES[order.status] ?? order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/costos/${order.id}`}
                          className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-red-500 hover:text-red-600"
                        >
                          {hasCost ? "Ver" : "Agregar"} <ArrowUpRight className="w-3 h-3" />
                        </Link>
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
