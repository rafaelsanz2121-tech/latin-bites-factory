import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import {
  AlertTriangle,
  CheckSquare,
  ClipboardList,
  Factory,
  ShieldAlert,
  Truck,
  Wrench,
  CheckCircle2,
  Circle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LogStatusBadge } from "@/components/logs/LogStatusBadge"
import { formatDate } from "@/lib/utils"
import Link from "next/link"
import type { LogStatus } from "@/types"

const COVERAGE_MODULES = [
  { label: "Receiving",    table: "receiving_logs",           dateField: "received_date", href: "/receiving/new" },
  { label: "Thawing",     table: "thawing_logs",             dateField: "date",          href: "/thawing/new" },
  { label: "Cooking/CCP", table: "cooking_chilling_logs",    dateField: "cook_date",     href: "/cooking/new" },
  { label: "Calibration", table: "calibration_logs",         dateField: "calibration_date", href: "/calibration/new" },
  { label: "Pre-Op",      table: "preop_sanitation_reports", dateField: "report_date",   href: "/sanitation/preop/new" },
  { label: "Sanitation",  table: "operational_sanitation_logs", dateField: "log_date",  href: "/sanitation/operational/new" },
]

async function getDashboardData(userId: string, role: string) {
  const supabase = await createClient()
  const today = new Date().toISOString().split("T")[0]

  // All log tables that need pending approval counting
  const LOG_TABLES = [
    "thawing_logs",
    "receiving_logs",
    "cooking_chilling_logs",
    "calibration_logs",
    "preop_sanitation_reports",
    "operational_sanitation_logs",
    "preshipment_reviews",
  ] as const

  const [
    { count: openDeviations },
    { count: overdueCapas },
    { count: activeOrders },
    { count: readyToShip },
    { data: recentThawing },
    { data: recentDeviations },
    { data: recentOrders },
    ...pendingResults
  ] = await Promise.all([
    supabase.from("deviations").select("*", { count: "exact", head: true }).in("status", ["open", "under_review"]),
    supabase.from("corrective_actions").select("*", { count: "exact", head: true }).lt("due_date", today).in("status", ["open", "in_progress"]),
    supabase.from("production_orders").select("*", { count: "exact", head: true })
      .in("status", ["planned", "in_production", "cooking", "chilling", "packaging", "refrigerating"]),
    supabase.from("production_orders").select("*", { count: "exact", head: true }).eq("status", "ready"),
    supabase
      .from("thawing_logs")
      .select("id, date, status, lot_batch_number, thawing_method, created_at, products(name)")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("deviations")
      .select("id, date_identified, severity, status, description")
      .order("created_at", { ascending: false })
      .limit(4),
    supabase
      .from("production_orders")
      .select("id, order_number, status, quantity_lbs, order_date, clients(company_name), products(name)")
      .in("status", ["planned", "in_production", "cooking", "chilling", "packaging", "refrigerating", "ready"])
      .order("created_at", { ascending: false })
      .limit(4),
    // Count submitted (pending approval) across all log tables
    ...LOG_TABLES.map((t) =>
      supabase.from(t).select("*", { count: "exact", head: true }).eq("status", "submitted")
    ),
  ])

  const pendingApproval = pendingResults.reduce((sum, r) => sum + (r.count || 0), 0)

  // Today's coverage — check each module for at least one log today
  const coverageResults = await Promise.all(
    COVERAGE_MODULES.map((mod) =>
      supabase
        .from(mod.table as any)
        .select("*", { count: "exact", head: true })
        .eq(mod.dateField, today)
    )
  )
  const coverage = COVERAGE_MODULES.map((mod, i) => ({
    ...mod,
    count: coverageResults[i].count || 0,
  }))

  // Total logs today
  const logsToday = coverage.reduce((sum, m) => sum + m.count, 0)

  return {
    logsToday,
    pendingApproval,
    openDeviations: openDeviations || 0,
    overdueCapas: overdueCapas || 0,
    recentThawing: recentThawing || [],
    recentDeviations: recentDeviations || [],
    activeOrders: activeOrders || 0,
    readyToShip: readyToShip || 0,
    recentOrders: recentOrders || [],
    coverage,
  }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile) redirect("/login")

  const stats = await getDashboardData(user.id, profile.role)

  const coveredCount = stats.coverage.filter((m) => m.count > 0).length

  const kpis = [
    {
      label: "Logs Today",
      value: stats.logsToday,
      icon: ClipboardList,
      color: "text-blue-600",
      bg: "bg-blue-50",
      href: "/thawing",
      pulse: false,
    },
    {
      label: "Pending Approval",
      value: stats.pendingApproval,
      icon: CheckSquare,
      color: stats.pendingApproval > 0 ? "text-amber-600" : "text-green-600",
      bg: stats.pendingApproval > 0 ? "bg-amber-50" : "bg-green-50",
      href: "/thawing",
      pulse: stats.pendingApproval > 0,
    },
    {
      label: "Open Deviations",
      value: stats.openDeviations,
      icon: AlertTriangle,
      color: stats.openDeviations > 0 ? "text-red-600" : "text-green-600",
      bg: stats.openDeviations > 0 ? "bg-red-50" : "bg-green-50",
      href: "/deviations",
      pulse: stats.openDeviations > 0,
    },
    {
      label: "Overdue CAPAs",
      value: stats.overdueCapas,
      icon: Wrench,
      color: stats.overdueCapas > 0 ? "text-red-600" : "text-green-600",
      bg: stats.overdueCapas > 0 ? "bg-red-50" : "bg-green-50",
      href: "/corrective-actions",
      pulse: stats.overdueCapas > 0,
    },
    {
      label: "Active Orders",
      value: stats.activeOrders,
      icon: Factory,
      color: stats.activeOrders > 0 ? "text-indigo-600" : "text-slate-400",
      bg: stats.activeOrders > 0 ? "bg-indigo-50" : "bg-slate-50",
      href: "/production",
      pulse: false,
    },
    {
      label: "Ready to Ship",
      value: stats.readyToShip,
      icon: Truck,
      color: stats.readyToShip > 0 ? "text-emerald-600" : "text-slate-400",
      bg: stats.readyToShip > 0 ? "bg-emerald-50" : "bg-slate-50",
      href: "/production?status=ready",
      pulse: stats.readyToShip > 0,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Operations Dashboard</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi) => (
          <Link href={kpi.href} key={kpi.label}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-lg ${kpi.bg}`}>
                    <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                  </div>
                  {kpi.pulse && (
                    <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                  )}
                </div>
                <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{kpi.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Today's Coverage */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Today's Log Coverage</CardTitle>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              coveredCount === stats.coverage.length
                ? "bg-green-100 text-green-700"
                : coveredCount === 0
                ? "bg-red-100 text-red-700"
                : "bg-amber-100 text-amber-700"
            }`}>
              {coveredCount} / {stats.coverage.length} modules
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {stats.coverage.map((mod) => (
              <Link
                key={mod.table}
                href={mod.count > 0 ? mod.href.replace("/new", "") : mod.href}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border text-center transition-colors ${
                  mod.count > 0
                    ? "border-green-200 bg-green-50 hover:bg-green-100"
                    : "border-[var(--border)] bg-white hover:border-amber-300 hover:bg-amber-50"
                }`}
              >
                {mod.count > 0 ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <Circle className="w-5 h-5 text-[var(--muted-foreground)]" />
                )}
                <span className="text-xs font-medium leading-tight">{mod.label}</span>
                {mod.count > 0 && (
                  <span className="text-[10px] text-green-700 font-semibold">{mod.count} log{mod.count !== 1 ? "s" : ""}</span>
                )}
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "New Thawing Log", href: "/thawing/new", emoji: "🧊" },
              { label: "New Receiving", href: "/receiving/new", emoji: "📦" },
              { label: "Cooking Log", href: "/cooking/new", emoji: "🔥" },
              { label: "Calibration", href: "/calibration/new", emoji: "🌡️" },
              { label: "Flag Deviation", href: "/deviations/new", emoji: "⚠️" },
              { label: "New Order", href: "/production/new", emoji: "🏭" },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex flex-col items-center gap-2 p-3 rounded-lg border border-[var(--border)] hover:border-blue-300 hover:bg-blue-50 transition-colors text-center"
              >
                <span className="text-2xl">{action.emoji}</span>
                <span className="text-xs font-medium text-[var(--foreground)]">{action.label}</span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Thawing Logs */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Thawing Logs</CardTitle>
              <Link href="/thawing" className="text-xs text-blue-600 hover:underline">View all →</Link>
            </div>
          </CardHeader>
          <CardContent>
            {stats.recentThawing.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)] text-center py-6">No records yet today</p>
            ) : (
              <div className="space-y-2">
                {stats.recentThawing.map((log: any) => (
                  <Link
                    key={log.id}
                    href={`/thawing/${log.id}`}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[var(--muted)] transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{log.products?.name || "—"}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {log.lot_batch_number || "No lot"} · {formatDate(log.date)}
                      </p>
                    </div>
                    <LogStatusBadge status={log.status as LogStatus} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Deviations */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Deviations</CardTitle>
              <Link href="/deviations" className="text-xs text-blue-600 hover:underline">View all →</Link>
            </div>
          </CardHeader>
          <CardContent>
            {stats.recentDeviations.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-[var(--muted-foreground)]">
                <ShieldAlert className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">No open deviations — good job!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {stats.recentDeviations.map((dev: any) => (
                  <Link
                    key={dev.id}
                    href={`/deviations/${dev.id}`}
                    className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-[var(--muted)] transition-colors"
                  >
                    <span
                      className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                        dev.severity === "critical"
                          ? "bg-red-500"
                          : dev.severity === "major"
                          ? "bg-amber-500"
                          : "bg-yellow-400"
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{dev.description}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {formatDate(dev.date_identified)} · {dev.severity}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active Production Orders */}
      {stats.recentOrders.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Factory className="w-4 h-4 text-indigo-600" />
                Active Production Orders
              </CardTitle>
              <Link href="/production" className="text-xs text-blue-600 hover:underline">View all →</Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {stats.recentOrders.map((order: any) => {
                const statusColors: Record<string, string> = {
                  planned:       "bg-blue-50 text-blue-700 border-blue-200",
                  in_production: "bg-orange-50 text-orange-700 border-orange-200",
                  cooking:       "bg-red-50 text-red-700 border-red-200",
                  chilling:      "bg-cyan-50 text-cyan-700 border-cyan-200",
                  packaging:     "bg-purple-50 text-purple-700 border-purple-200",
                  refrigerating: "bg-indigo-50 text-indigo-700 border-indigo-200",
                  ready:         "bg-emerald-50 text-emerald-700 border-emerald-200",
                }
                const colorClass = statusColors[order.status] || "bg-slate-50 text-slate-600 border-slate-200"
                return (
                  <Link
                    key={order.id}
                    href={`/production/${order.id}`}
                    className="flex flex-col gap-1.5 p-3 rounded-lg border hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-[var(--muted-foreground)]">{order.order_number}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border uppercase ${colorClass}`}>
                        {order.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="text-sm font-semibold truncate">{order.clients?.company_name || "—"}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {order.products?.name} · {Number(order.quantity_lbs || 0).toLocaleString()} lbs
                    </p>
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
