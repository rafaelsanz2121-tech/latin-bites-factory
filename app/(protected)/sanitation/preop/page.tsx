import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Plus, CheckCircle, XCircle, AlertCircle, ClipboardCheck, BarChart3, ShieldAlert } from "lucide-react"
import { LogStatusBadge } from "@/components/logs/LogStatusBadge"
import { formatDate } from "@/lib/utils"

export default async function PreOpSanitationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: reports } = await supabase
    .from("preop_sanitation_reports")
    .select(`
      id, report_date, inspection_time, status, total_items, pass_count, fail_count, na_count, created_at,
      creator:profiles!preop_sanitation_reports_created_by_fkey(full_name, initials)
    `)
    .order("report_date", { ascending: false })
    .limit(50)

  const totalReports = reports?.length ?? 0
  const totalFailures = reports?.reduce((sum: number, r: any) => sum + (r.fail_count || 0), 0) ?? 0
  const cleanReports = reports?.filter((r: any) => (r.fail_count || 0) === 0).length ?? 0

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <ClipboardCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Daily Pre-Op Sanitation</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">9 CFR 416.11-12 — Pre-operation facility inspection, Sections A–K</p>
          </div>
        </div>
        <Link
          href="/sanitation/preop/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nuevo Registro
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Reports */}
        <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] p-4 overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-1 bg-teal-500" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Reports</span>
            <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{totalReports}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Pre-op inspections on file</p>
        </div>

        {/* Clean Inspections */}
        <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] p-4 overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">All Pass</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{cleanReports}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Reports with zero failures</p>
        </div>

        {/* Total Failures */}
        <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] p-4 overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-1 bg-red-500" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Failures</span>
            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{totalFailures}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Failed items across all reports</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Date</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Time</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Inspector</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Results</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {!reports?.length ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-slate-500 dark:text-slate-400">
                    <ClipboardCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-medium">No pre-op reports yet.</p>
                    <p className="text-xs mt-1">Create the first inspection to get started.</p>
                  </td>
                </tr>
              ) : reports.map((r: any) => (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">{formatDate(r.report_date)}</td>
                  <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 tabular-nums">
                    {r.inspection_time ? r.inspection_time.slice(0, 5) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center text-[11px] font-bold text-teal-700 dark:text-teal-400">
                        {r.creator?.initials || "?"}
                      </div>
                      <span className="text-sm text-slate-700 dark:text-slate-300">{r.creator?.full_name || "—"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {r.pass_count > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle className="w-3 h-3" />{r.pass_count} pass
                        </span>
                      )}
                      {r.fail_count > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2 py-0.5 rounded-full border border-red-200 dark:border-red-800">
                          <XCircle className="w-3 h-3" />{r.fail_count} fail
                        </span>
                      )}
                      {r.na_count > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                          <AlertCircle className="w-3 h-3" />{r.na_count} N/A
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3"><LogStatusBadge status={r.status} /></td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/sanitation/preop/${r.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 transition-colors"
                    >
                      Ver →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
