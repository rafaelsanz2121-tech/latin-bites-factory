import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Plus, AlertTriangle, CheckCircle2, Clock, Wrench, ListTodo } from "lucide-react"
import { Pagination } from "@/components/ui/Pagination"
import { formatDate } from "@/lib/utils"

const PAGE_SIZE = 25

function CapaTypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    corrective: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
    preventive:  "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${map[type] ?? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"}`}>
      {type}
    </span>
  )
}

function StatusBadge({ status, isOverdue }: { status: string; isOverdue: boolean }) {
  if (isOverdue) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
        <AlertTriangle className="w-3 h-3" />OVERDUE
      </span>
    )
  }
  const map: Record<string, string> = {
    open:        "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
    in_progress: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
    closed:      "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${map[status] ?? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"}`}>
      {status.replace(/_/g, " ")}
    </span>
  )
}

export default async function CorrectiveActionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam || "1", 10))

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const today = new Date().toISOString().split("T")[0]
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const [{ data: capas }, { count }, { count: openCount }, { count: closedCount }, { count: overdueCount }] = await Promise.all([
    supabase
      .from("corrective_actions")
      .select(`id, capa_type, status, action_description, due_date, date_opened, created_at, assignee:profiles!corrective_actions_assigned_to_fkey(full_name, initials), assigner:profiles!corrective_actions_assigned_by_fkey(full_name)`)
      .order("due_date", { ascending: true })
      .range(from, to),
    supabase.from("corrective_actions").select("*", { count: "exact", head: true }),
    supabase.from("corrective_actions").select("*", { count: "exact", head: true }).neq("status", "closed"),
    supabase.from("corrective_actions").select("*", { count: "exact", head: true }).eq("status", "closed"),
    supabase.from("corrective_actions").select("*", { count: "exact", head: true }).neq("status", "closed").lt("due_date", today),
  ])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
            <Wrench className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Corrective Actions</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">CAPA — 21 CFR Part 120 / HACCP corrective action tracking</p>
          </div>
        </div>
        <Link
          href="/corrective-actions/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          New CAPA
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
              <ListTodo className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{count ?? 0}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">all time</p>
        </div>

        {/* Open */}
        <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] p-4 overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Open</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{openCount ?? 0}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">pending resolution</p>
        </div>

        {/* Overdue */}
        <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] p-4 overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-1 bg-red-500" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Overdue</span>
            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{overdueCount ?? 0}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">past due date</p>
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
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">completed</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Type</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Action</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Assigned To</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Due Date</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {!capas?.length ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No corrective actions yet</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">Create one when a deviation requires follow-up</p>
                    </div>
                  </td>
                </tr>
              ) : capas.map((capa: any) => {
                const isOverdue = capa.status !== "closed" && capa.due_date < today
                return (
                  <tr key={capa.id} className={`hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors ${isOverdue ? "bg-red-50/40 dark:bg-red-900/5" : ""}`}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <CapaTypeBadge type={capa.capa_type} />
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 max-w-[280px]">
                      <p className="truncate">{capa.action_description}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 dark:from-amber-600 dark:to-amber-800 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                          {capa.assignee?.initials || "?"}
                        </div>
                        <span className="text-sm text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{capa.assignee?.full_name || "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {isOverdue && <AlertTriangle className="w-3.5 h-3.5 text-red-500 dark:text-red-400 shrink-0" />}
                        <span className={`text-sm ${isOverdue ? "text-red-600 dark:text-red-400 font-semibold" : "text-slate-700 dark:text-slate-300"}`}>
                          {formatDate(capa.due_date)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={capa.status} isOverdue={isOverdue} />
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Link
                        href={`/corrective-actions/${capa.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 transition-colors"
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
        <div className="border-t border-slate-100 dark:border-slate-800">
          <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} baseHref="/corrective-actions" />
        </div>
      </div>
    </div>
  )
}
