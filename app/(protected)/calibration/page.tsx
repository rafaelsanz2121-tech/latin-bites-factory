import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Plus, CheckCircle2, XCircle, Thermometer, ClipboardList, AlertTriangle, BadgeCheck } from "lucide-react"
import { LogStatusBadge } from "@/components/logs/LogStatusBadge"
import { Pagination } from "@/components/ui/Pagination"
import { formatDate } from "@/lib/utils"
import type { LogStatus } from "@/types"

const PAGE_SIZE = 25

export default async function CalibrationListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam || "1", 10))

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const [{ data: logs }, { count }] = await Promise.all([
    supabase
      .from("calibration_logs")
      .select(`id, date, status, thermometer_id, thermometer_type, ice_water_reading_f, is_in_tolerance, created_at, creator:profiles!calibration_logs_created_by_fkey(full_name, initials)`)
      .order("date", { ascending: false })
      .range(from, to),
    supabase.from("calibration_logs").select("*", { count: "exact", head: true }),
  ])

  const totalLogs = count ?? 0
  const inToleranceCount = logs?.filter((l: any) => l.is_in_tolerance).length ?? 0
  const outOfRangeCount = logs?.filter((l: any) => !l.is_in_tolerance).length ?? 0

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Thermometer className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Thermometer Calibration</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">9 CFR 417.2 — Daily ice water verification (±2°F from 32°F)</p>
          </div>
        </div>
        <Link
          href="/calibration/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nuevo Registro
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Records */}
        <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] p-4 overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Records</span>
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
              <ClipboardList className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{totalLogs}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Calibration logs on file</p>
        </div>

        {/* In Tolerance */}
        <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] p-4 overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">In Tolerance</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
              <BadgeCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{inToleranceCount}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">This page — passed verification</p>
        </div>

        {/* Out of Range */}
        <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] p-4 overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-1 bg-red-500" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Out of Range</span>
            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{outOfRangeCount}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">This page — failed tolerance</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Date</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Thermometer</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Type</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Reading</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tolerance</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Operator</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {!logs?.length ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-slate-500 dark:text-slate-400">
                    <Thermometer className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-medium">No calibration logs yet.</p>
                    <p className="text-xs mt-1">Create the first record to get started.</p>
                  </td>
                </tr>
              ) : logs.map((log: any) => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">{formatDate(log.date)}</td>
                  <td className="px-4 py-3 text-sm font-mono text-slate-700 dark:text-slate-300 font-medium">{log.thermometer_id}</td>
                  <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{log.thermometer_type || "—"}</td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{log.ice_water_reading_f}°F</span>
                  </td>
                  <td className="px-4 py-3">
                    {log.is_in_tolerance ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5" />In Tolerance
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
                        <XCircle className="w-3.5 h-3.5" />OUT OF RANGE
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-[11px] font-bold text-blue-700 dark:text-blue-400">
                        {log.creator?.initials || "?"}
                      </div>
                      <span className="text-sm text-slate-700 dark:text-slate-300">{log.creator?.full_name || "—"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><LogStatusBadge status={log.status as LogStatus} /></td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/calibration/${log.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                    >
                      Ver →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} baseHref="/calibration" />
      </div>
    </div>
  )
}
