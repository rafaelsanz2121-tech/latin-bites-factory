import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { formatDate } from "@/lib/utils"
import { DollarSign, ArrowLeft, Package, Users, Tag, Layers } from "lucide-react"
import { AddCostItemForm } from "./AddCostItemForm"
import { ExportCostosButton } from "@/components/export/ExportCostosButton"

function fmt$(n: number | null | undefined) {
  if (n == null) return "—"
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 })
}

const COST_TYPE_ES: Record<string, { label: string; color: string; icon: any }> = {
  raw_material: { label: "Materia Prima",    color: "bg-blue-100 text-blue-700",   icon: Package },
  labor:        { label: "Mano de Obra",     color: "bg-green-100 text-green-700", icon: Users },
  packaging:    { label: "Empaque",          color: "bg-purple-100 text-purple-700", icon: Tag },
  overhead:     { label: "Gastos Generales", color: "bg-amber-100 text-amber-700", icon: Layers },
  other:        { label: "Otros",            color: "bg-slate-100 text-slate-600",  icon: DollarSign },
}

export default async function CostoDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>
}) {
  const { orderId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  /* ── Fetch order ── */
  const { data: order } = await supabase
    .from("production_orders")
    .select("id, order_number, status, quantity_lbs, order_date, notes, clients(company_name), products(name, code)")
    .eq("id", orderId)
    .single()

  if (!order) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const o = order as any

  /* ── Fetch cost items ── */
  const { data: costItems } = await supabase
    .from("cost_items")
    .select("id, cost_type, description, quantity, unit_cost, total_cost, created_at, profiles(full_name)")
    .eq("production_order_id", orderId)
    .order("created_at", { ascending: false })

  /* ── Fetch cost summary from view ── */
  let summary: any = null
  try {
    const { data } = await supabase
      .from("production_order_costs")
      .select("*")
      .eq("production_order_id", orderId)
      .single()
    summary = data
  } catch {}

  const items = costItems || []

  /* ── Cost breakdown by type ── */
  const byType = items.reduce((acc: Record<string, number>, item: any) => {
    acc[item.cost_type] = (acc[item.cost_type] ?? 0) + Number(item.total_cost ?? 0)
    return acc
  }, {})

  const totalCost = Object.values(byType).reduce((s: number, v: number) => s + v, 0)
  const costPerLb = order.quantity_lbs && totalCost ? totalCost / Number(order.quantity_lbs) : null

  return (
    <div className="space-y-6 max-w-[1000px]">

      {/* Back link + Header */}
      <div>
        <Link href="/costos" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 mb-3 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Volver a Costos
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight font-mono">
              {order.order_number}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
              {o.clients?.company_name} · {o.products?.name} · {formatDate(o.order_date)}
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="text-right">
              <p className="text-[11px] text-slate-400 font-medium">Cantidad</p>
              <p className="text-xl font-black text-slate-700 tabular-nums">
                {order.quantity_lbs ? `${Number(order.quantity_lbs).toLocaleString()} lbs` : "—"}
              </p>
            </div>
            <ExportCostosButton orderId={orderId} label="Exportar" />
          </div>
        </div>
      </div>

      {/* Cost summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Materia Prima",    value: fmt$(byType.raw_material ?? 0),  color: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-100" },
          { label: "Mano de Obra",     value: fmt$(byType.labor ?? 0),          color: "text-green-700",  bg: "bg-green-50",  border: "border-green-100" },
          { label: "Empaque",          value: fmt$(byType.packaging ?? 0),      color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-100" },
          { label: "Gastos Generales", value: fmt$((byType.overhead ?? 0) + (byType.other ?? 0)), color: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-100" },
        ].map((c) => (
          <div key={c.label} className={`rounded-xl border p-4 ${c.bg} ${c.border}`}>
            <p className={`text-lg font-black ${c.color} leading-none`}>{c.value}</p>
            <p className="text-[11px] font-medium text-slate-500 mt-1.5">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Total + Cost per lb */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-amber-600 rounded-xl p-5 text-white">
          <p className="text-[11px] font-bold uppercase tracking-wider opacity-70 mb-1">COSTO TOTAL DEL LOTE</p>
          <p className="text-3xl font-black">{fmt$(totalCost)}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-5 text-white">
          <p className="text-[11px] font-bold uppercase tracking-wider opacity-70 mb-1">COSTO POR LIBRA</p>
          <p className="text-3xl font-black">
            {costPerLb ? `$${costPerLb.toFixed(4)}` : "—"}
          </p>
          {costPerLb && (
            <p className="text-[11px] opacity-50 mt-1">
              basado en {Number(order.quantity_lbs).toLocaleString()} lbs
            </p>
          )}
        </div>
      </div>

      {/* Cost items table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">Detalle de Costos</h2>
          <span className="text-[11px]  text-slate-600 dark:text-slate-300">{items.length} partida{items.length !== 1 ? "s" : ""}</span>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-slate-300">
            <DollarSign className="w-8 h-8 mb-2" />
            <p className="text-sm font-medium  text-slate-600 dark:text-slate-300">Sin costos cargados aún</p>
            <p className="text-xs text-slate-300 mt-1">Usa el formulario de abajo para agregar el primer costo</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-50 text-[10.5px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Tipo</th>
                  <th className="text-left px-4 py-3">Descripción</th>
                  <th className="text-right px-4 py-3">Cantidad</th>
                  <th className="text-right px-4 py-3">Costo Unit.</th>
                  <th className="text-right px-4 py-3">Total</th>
                  <th className="text-left px-4 py-3">Registrado por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {items.map((item: any) => {
                  const ct = COST_TYPE_ES[item.cost_type] ?? COST_TYPE_ES.other
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${ct.color}`}>
                          {ct.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[12.5px] text-slate-700 dark:text-slate-300">{item.description}</td>
                      <td className="px-4 py-3 text-right text-[12px] tabular-nums text-slate-700 dark:text-slate-300">
                        {item.quantity != null ? Number(item.quantity).toLocaleString() : "1"}
                      </td>
                      <td className="px-4 py-3 text-right text-[12px] tabular-nums text-slate-700 dark:text-slate-300">
                        {fmt$(item.unit_cost)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-[13px] font-bold text-amber-700">{fmt$(item.total_cost)}</span>
                      </td>
                      <td className="px-4 py-3 text-[11.5px]  text-slate-600 dark:text-slate-300">
                        {item.profiles?.full_name ?? "—"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add cost item form */}
      <AddCostItemForm orderId={orderId} />
    </div>
  )
}
