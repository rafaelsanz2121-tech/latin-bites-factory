import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { formatDate } from "@/lib/utils"
import {
  ClipboardList, Plus, Factory, Clock, CheckCircle2,
  Truck, AlertTriangle, BarChart3, ArrowRight,
} from "lucide-react"
import { Pagination } from "@/components/ui/Pagination"

const PAGE_SIZE = 25

type ProductionStatus =
  | "planned" | "in_production" | "cooking" | "chilling"
  | "packaging" | "refrigerating" | "ready" | "shipped" | "cancelled"

const STATUS_LABELS: Record<ProductionStatus, string> = {
  planned:       "Planificado",
  in_production: "En Producción",
  cooking:       "Cocción",
  chilling:      "Enfriamiento",
  packaging:     "Empaque",
  refrigerating: "Refrigeración",
  ready:         "Listo",
  shipped:       "Despachado",
  cancelled:     "Cancelado",
}

const STATUS_STYLE: Record<ProductionStatus, string> = {
  planned:       "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
  in_production: "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300",
  cooking:       "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300",
  chilling:      "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300",
  packaging:     "bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300",
  refrigerating: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300",
  ready:         "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
  shipped:       "bg-slate-100 dark:bg-slate-700/40 text-slate-600 dark:text-slate-400",
  cancelled:     "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",
}

const STATUS_BAR: Record<ProductionStatus, string> = {
  planned:       "bg-blue-500",
  in_production: "bg-orange-500",
  cooking:       "bg-orange-600",
  chilling:      "bg-sky-500",
  packaging:     "bg-cyan-500",
  refrigerating: "bg-indigo-500",
  ready:         "bg-emerald-500",
  shipped:       "bg-slate-400",
  cancelled:     "bg-red-500",
}

const ALL_STATUSES = Object.keys(STATUS_LABELS) as ProductionStatus[]

export default async function ProductionOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  const { status: filterStatus, page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam || "1", 10))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  let dataQuery = supabase
    .from("production_orders")
    .select("id, order_number, quantity_lbs, order_date, scheduled_date, status, clients(company_name), products(name, code)")
    .order("created_at", { ascending: false })
    .range(from, to)

  let countQuery = supabase
    .from("production_orders")
    .select("*", { count: "exact", head: true })

  if (filterStatus && filterStatus !== "all") {
    dataQuery = dataQuery.eq("status", filterStatus)
    countQuery = countQuery.eq("status", filterStatus)
  }

  const [{ data: orders }, { count: filteredCount }, { data: allForCount }] = await Promise.all([
    dataQuery,
    countQuery,
    supabase.from("production_orders").select("status"),
  ])

  const allOrders = orders || []
  const allData = allForCount || []

  const statusCounts: Partial<Record<ProductionStatus, number>> = {}
  for (const row of allData) {
    const s = row.status as ProductionStatus
    statusCounts[s] = (statusCounts[s] || 0) + 1
  }

  const totalOrders   = allData.length
  const activeOrders  = allData.filter((o) => !["shipped", "cancelled", "planned"].includes(o.status)).length
  const readyOrders   = statusCounts["ready"] || 0
  const shippedOrders = statusCounts["shipped"] || 0

  const kpis = [
    { label: "Total Órdenes", value: totalOrders, icon: ClipboardList, bar: "bg-slate-500", iconBg: "bg-slate-100 dark:bg-slate-700/60", iconText: "text-slate-600 dark:text-slate-300", sub: "en el sistema" },
    { label: "En Producción", value: activeOrders, icon: Factory,      bar: "bg-orange-500", iconBg: "bg-orange-100 dark:bg-orange-900/40", iconText: "text-orange-600 dark:text-orange-300", sub: "órdenes activas" },
    { label: "Listas",        value: readyOrders,  icon: CheckCircle2, bar: "bg-emerald-500", iconBg: "bg-emerald-100 dark:bg-emerald-900/40", iconText: "text-emerald-600 dark:text-emerald-300", sub: "para despachar" },
    { label: "Despachadas",   value: shippedOrders,icon: Truck,        bar: "bg-blue-500", iconBg: "bg-blue-100 dark:bg-blue-900/40", iconText: "text-blue-600 dark:text-blue-300", sub: "completadas" },
  ]

  return (
    <div className="space-y-6 max-w-[1200px]">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Factory className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Órdenes de Producción</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">9 CFR 416 — Gestión y trazabilidad de lotes de producción</p>
          </div>
        </div>
        <Link
          href="/production/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nueva Orden
        </Link>
      </div>

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
            <p className="text-2xl font-black text-slate-900 dark:text-white leading-none tabular-nums">{k.value}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Status filter pills ── */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/production"
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-semibold border transition-colors ${
            !filterStatus || filterStatus === "all"
              ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100"
              : "bg-white dark:bg-[#111827] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500"
          }`}
        >
          Todos
          <span className={`rounded-full px-1.5 py-px text-[10px] font-bold leading-none ${!filterStatus || filterStatus === "all" ? "bg-white/20" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}>
            {totalOrders}
          </span>
        </Link>
        {ALL_STATUSES.filter((s) => (statusCounts[s] || 0) > 0).map((s) => (
          <Link
            key={s}
            href={`/production?status=${s}`}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-semibold border transition-colors ${
              filterStatus === s
                ? `${STATUS_STYLE[s]} border-current`
                : "bg-white dark:bg-[#111827] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500"
            }`}
          >
            {STATUS_LABELS[s]}
            <span className="bg-current/10 rounded-full px-1.5 py-px text-[10px] font-bold leading-none opacity-70">
              {statusCounts[s]}
            </span>
          </Link>
        ))}
      </div>

      {/* ── Table ── */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] shadow-sm overflow-hidden">
        {/* Table header bar */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">
              {filterStatus && filterStatus !== "all"
                ? `${STATUS_LABELS[filterStatus as ProductionStatus]} — ${filteredCount ?? 0} órdenes`
                : `Todas las órdenes — ${totalOrders} total`}
            </h2>
          </div>
        </div>

        {!allOrders.length ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
              <ClipboardList className="w-8 h-8 text-slate-400 dark:text-slate-500" />
            </div>
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-200 mb-1">Sin órdenes aún</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-xs mb-6">
              {filterStatus && filterStatus !== "all"
                ? `No hay órdenes con estado "${STATUS_LABELS[filterStatus as ProductionStatus] ?? filterStatus}".`
                : "Crea la primera orden de producción para comenzar el seguimiento de lotes."}
            </p>
            {!filterStatus || filterStatus === "all" ? (
              <Link href="/production/new" className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm">
                <Plus className="w-4 h-4" />
                Crear primera orden
              </Link>
            ) : (
              <Link href="/production" className="inline-flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm font-semibold rounded-lg transition-colors">
                Ver todas las órdenes
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                  {["Orden #", "Cliente", "Producto", "Cantidad (lbs)", "F. Orden", "F. Programada", "Estado", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allOrders.map((order: any) => {
                  const status = order.status as ProductionStatus
                  const isOverdue =
                    order.scheduled_date &&
                    new Date(order.scheduled_date) < new Date() &&
                    !["shipped", "cancelled"].includes(status)

                  return (
                    <tr
                      key={order.id}
                      className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono font-bold text-slate-800 dark:text-slate-100">
                          {order.order_number}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-700 dark:text-slate-300">{order.clients?.company_name || "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11.5px] font-semibold">
                          {order.products?.name || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                          {order.quantity_lbs ? Number(order.quantity_lbs).toLocaleString() : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600 dark:text-slate-400">{formatDate(order.order_date)}</span>
                      </td>
                      <td className="px-4 py-3">
                        {order.scheduled_date ? (
                          <div className="flex items-center gap-1.5">
                            {isOverdue && <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
                            <span className={`text-sm ${isOverdue ? "text-red-600 dark:text-red-400 font-semibold" : "text-slate-600 dark:text-slate-400"}`}>
                              {formatDate(order.scheduled_date)}
                              {isOverdue && <span className="ml-1 text-[10px]">(vencida)</span>}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400 dark:text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_STYLE[status] ?? "bg-slate-100 text-slate-600"}`}>
                          {STATUS_LABELS[status] ?? status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/production/${order.id}`}
                          className="inline-flex items-center gap-1 text-[12px] font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                        >
                          Ver
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {allOrders.length > 0 && (
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={filteredCount ?? 0}
            baseHref={filterStatus && filterStatus !== "all" ? `/production?status=${filterStatus}` : "/production"}
          />
        )}
      </div>
    </div>
  )
}
