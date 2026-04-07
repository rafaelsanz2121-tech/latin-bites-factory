import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Plus, CheckCircle, XCircle, ShieldCheck, Droplets, Scissors, ClipboardList } from "lucide-react"
import { LogStatusBadge } from "@/components/logs/LogStatusBadge"
import { formatDate } from "@/lib/utils"

export default async function OperationalSanitationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: logs } = await supabase
    .from("operational_sanitation_logs")
    .select(`
      id, log_date, status, sanitizer_ppm, sanitizer_pass, blades_inspected, created_at,
      creator:profiles!operational_sanitation_logs_created_by_fkey(full_name, initials)
    `)
    .order("log_date", { ascending: false })
    .limit(50)

  const totalLogs = logs?.length ?? 0
  const sanitizerPassCount = logs?.filter((l: any) => l.sanitizer_pass).length ?? 0
  const bladesPassCount = logs?.filter((l: any) => l.blades_inspected).length ?? 0

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Operational Sanitation</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">9 CFR 416.13 — Daily sanitation monitoring &amp; sanitizer PPM verification</p>
          </div>
        </div>
        <Link
          href="/sanitation/operational/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nuevo Registro
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Logs */}
        <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] p-4 overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-1 bg-violet-500" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Logs</span>
            <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
              <ClipboardList className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{totalLogs}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Sanitation logs on record</p>
        </div>

        {/* Sanitizer Pass */}
        <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] p-4 overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Sanitizer Pass</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
              <Droplets className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{sanitizerPassCount}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">PPM within acceptable range</p>
        </div>

        {/* Blades Inspected */}
        <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] p-4 overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-1 bg-violet-400" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Blades OK</span>
            <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
              <Scissors className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{bladesPassCount}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Blade inspections passed</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Date</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Completed By</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Sanitizer PPM</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Blades</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {!logs?.length ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-slate-500 dark:text-slate-400">
                    <ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-medium">No sanitation logs yet.</p>
                    <p className="text-xs mt-1">Create the first record to get started.</p>
                  </td>
                </tr>
              ) : logs.map((log: any) => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">{formatDate(log.log_date)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center text-[11px] font-bold text-violet-700 dark:text-violet-400">
                        {log.creator?.initials || "?"}
                      </div>
                      <span className="text-sm text-slate-700 dark:text-slate-300">{log.creator?.full_name || "—"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{log.sanitizer_ppm ?? "—"} ppm</span>
                      {log.sanitizer_ppm != null && (
                        log.sanitizer_pass
                          ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle className="w-3 h-3" />Pass
                            </span>
                          : <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2 py-0.5 rounded-full border border-red-200 dark:border-red-800">
                              <XCircle className="w-3 h-3" />Fail
                            </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {log.blades_inspected != null && (
                      log.blades_inspected
                        ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle className="w-3 h-3" />OK
                          </span>
                        : <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2 py-0.5 rounded-full border border-red-200 dark:border-red-800">
                            <XCircle className="w-3 h-3" />Fail
                          </span>
                    )}
                  </td>
                  <td className="px-4 py-3"><LogStatusBadge status={log.status} /></td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/sanitation/operational/${log.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 transition-colors"
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
