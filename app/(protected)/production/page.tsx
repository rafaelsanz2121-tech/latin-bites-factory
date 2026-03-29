import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/utils"
import { ClipboardList, Plus } from "lucide-react"
import { Pagination } from "@/components/ui/Pagination"

const PAGE_SIZE = 25

type ProductionStatus =
  | "planned"
  | "in_production"
  | "cooking"
  | "chilling"
  | "packaging"
  | "refrigerating"
  | "ready"
  | "shipped"
  | "cancelled"

const STATUS_LABELS: Record<ProductionStatus, string> = {
  planned: "Planned",
  in_production: "In Production",
  cooking: "Cooking",
  chilling: "Chilling",
  packaging: "Packaging",
  refrigerating: "Refrigerating",
  ready: "Ready",
  shipped: "Shipped",
  cancelled: "Cancelled",
}

const STATUS_BADGE: Record<ProductionStatus, string> = {
  planned:       "bg-blue-100 text-blue-800 border-blue-200",
  in_production: "bg-orange-100 text-orange-800 border-orange-200",
  cooking:       "bg-orange-100 text-orange-800 border-orange-200",
  chilling:      "bg-sky-100 text-sky-800 border-sky-200",
  packaging:     "bg-cyan-100 text-cyan-800 border-cyan-200",
  refrigerating: "bg-indigo-100 text-indigo-800 border-indigo-200",
  ready:         "bg-green-100 text-green-800 border-green-200",
  shipped:       "bg-gray-100 text-gray-700 border-gray-200",
  cancelled:     "bg-red-100 text-red-800 border-red-200",
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
    .select(
      "id, order_number, quantity_lbs, order_date, scheduled_date, status, clients(company_name), products(name, code)"
    )
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

  const statusCounts: Partial<Record<ProductionStatus, number>> = {}
  for (const row of allForCount || []) {
    const s = row.status as ProductionStatus
    statusCounts[s] = (statusCounts[s] || 0) + 1
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Production Orders</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
            Manage and track all production runs
          </p>
        </div>
        <Link href="/production/new">
          <Button>
            <Plus className="w-4 h-4" />
            New Order
          </Button>
        </Link>
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/production"
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
            !filterStatus || filterStatus === "all"
              ? "bg-slate-800 text-white border-slate-800"
              : "bg-white text-[var(--muted-foreground)] border-[var(--border)] hover:border-slate-400"
          }`}
        >
          All
          <span className="bg-white/20 rounded-full px-1.5 py-0.5 text-xs font-bold leading-none">
            {allForCount?.length ?? 0}
          </span>
        </Link>
        {ALL_STATUSES.filter((s) => (statusCounts[s] || 0) > 0).map((s) => (
          <Link
            key={s}
            href={`/production?status=${s}`}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
              filterStatus === s
                ? "bg-slate-800 text-white border-slate-800"
                : `${STATUS_BADGE[s]} hover:opacity-80`
            }`}
          >
            {STATUS_LABELS[s]}
            <span className="bg-white/50 rounded-full px-1.5 py-0.5 text-xs font-bold leading-none">
              {statusCounts[s]}
            </span>
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {!allOrders.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-[var(--muted-foreground)]">
              <ClipboardList className="w-10 h-10 mb-3 opacity-30" />
              <p className="font-medium">
                {filterStatus && filterStatus !== "all"
                  ? `No orders with status "${STATUS_LABELS[filterStatus as ProductionStatus] ?? filterStatus}"`
                  : "No production orders yet"}
              </p>
              {!filterStatus && (
                <p className="text-sm mt-1">Create your first order to get started</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)] text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
                    <th className="text-left px-4 py-3">Order #</th>
                    <th className="text-left px-4 py-3">Client</th>
                    <th className="text-left px-4 py-3">Product</th>
                    <th className="text-left px-4 py-3">Qty (lbs)</th>
                    <th className="text-left px-4 py-3">Order Date</th>
                    <th className="text-left px-4 py-3">Scheduled</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="px-4 py-3" />
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
                        className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <p className="text-sm font-mono font-semibold">
                            {order.order_number}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm">{order.clients?.company_name || "—"}</p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className="text-xs">
                            {order.products?.name || "—"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium tabular-nums">
                            {order.quantity_lbs
                              ? Number(order.quantity_lbs).toLocaleString()
                              : "—"}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-[var(--muted-foreground)]">
                            {formatDate(order.order_date)}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          {order.scheduled_date ? (
                            <p className={`text-sm ${isOverdue ? "text-red-600 font-semibold" : "text-[var(--muted-foreground)]"}`}>
                              {formatDate(order.scheduled_date)}
                              {isOverdue && <span className="ml-1 text-xs">(overdue)</span>}
                            </p>
                          ) : (
                            <p className="text-sm text-[var(--muted-foreground)]">—</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                              STATUS_BADGE[status] ?? "bg-gray-100 text-gray-700 border-gray-200"
                            }`}
                          >
                            {STATUS_LABELS[status] ?? status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/production/${order.id}`}
                            className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            View →
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
        </CardContent>
      </Card>
    </div>
  )
}
