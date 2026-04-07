import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Plus, AlertTriangle, CheckCircle2, Clock, BarChart3 } from "lucide-react"
import { Pagination } from "@/components/ui/Pagination"
import { formatDate } from "@/lib/utils"

const PAGE_SIZE = 25

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    critical: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
    major:    "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
    minor:    "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300",
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${map[severity] ?? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"}`}>
      {severity}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    open:                      "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
    under_review:              "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
    corrective_action_pending: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
    in_progress:               "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
    closed:                    "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${map[status] ?? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"}`}>
      {status.replace(/_/g, " ")}
    </span>
  )
}

export default async function DeviationsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [{ data: deviations }, { count }, { count: openCount }, { count: criticalCount }, { count: closedCount }] = await Promise.all([
    supabase
      .from("deviations")
      .select(`id, date_identified, severity, status, description, source_log_type, usda_notified, created_at, identifier:profiles!deviations_identified_by_fkey(full_name, initials), areas(name)`)
      .order("created_at", { ascending: false })
      .range(from, to),
    supabase.from("deviations").select("*", { count: "exact", head: true }),
    supabase.from("deviations").select("*", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("deviations").select("*", { count: "exact", head: true }).eq("severity", "critical"),
    supabase.from("deviations").select("*", { count: "exact", head: true }).eq("status", "closed"),
  ])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg shadow-red-500/20 shrink-0">
            <AlertTriangle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Deviations</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">HACCP Prerequisite — food safety & operational deviations</p>
          </div>
        </div>
        <Link
          href="/deviations/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          Flag Deviation
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total */}
        <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] p-4 overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-1 bg-slate-400" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{count ?? 0}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">all time</p>
        </div>

        {/* Open */}
        <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] p-4 overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-1 bg-red-500" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Open</span>
            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
              <Clock className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{openCount ?? 0}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">require action</p>
        </div>

        {/* Critical */}
        <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] p-4 overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Critical</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{criticalCount ?? 0}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">USDA notification may apply</p>
        </div>

        {/* Closed */}
        <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] p-4 overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Closed</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{closedCount ?? 0}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">resolved & verified</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Date</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Severity</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Description</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Source</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">USDA</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Identified By</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {!deviations?.length ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No deviations found</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">Great work — keep it up!</p>
                    </div>
                  </td>
                </tr>
              ) : deviations.map((dev: any) => (
                <tr key={dev.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">{formatDate(dev.date_identified)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <SeverityBadge severity={dev.severity} />
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 max-w-[280px]">
                    <p className="truncate">{dev.description}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 capitalize whitespace-nowrap">
                    {dev.source_log_type ? dev.source_log_type.replace(/_logs?$/, "").replace(/_/g, " ") : "Manual"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {dev.severity === "critical" && (
                      <span className={`text-[11px] font-semibold ${dev.usda_notified ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                        {dev.usda_notified ? "✓ Notified" : "⚠ Required"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge status={dev.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                        {dev.identifier?.initials || "?"}
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 hidden lg:block truncate max-w-[100px]">{dev.identifier?.full_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Link
                      href={`/deviations/${dev.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 dark:border-slate-800">
          <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} baseHref="/deviations" />
        </div>
      </div>
    </div>
  )
}
