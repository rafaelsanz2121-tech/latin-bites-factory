import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Plus, Flame, Thermometer, ClipboardList, ShieldCheck } from "lucide-react"
import { LogStatusBadge } from "@/components/logs/LogStatusBadge"
import { Pagination } from "@/components/ui/Pagination"
import { formatDate } from "@/lib/utils"
import { CCP_LABELS } from "@/constants/products"
import type { LogStatus } from "@/types"

export default async function CookingListPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1)
  const PAGE_SIZE = 25
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [{ data: logs }, { count }] = await Promise.all([
    supabase
      .from("cooking_chilling_logs")
      .select(`id, date, status, log_type, ccp_number, readings, created_at, products(name), creator:profiles!cooking_chilling_logs_created_by_fkey(full_name, initials)`)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, to),
    supabase
      .from("cooking_chilling_logs")
      .select("*", { count: "exact", head: true }),
  ])

  const total = count ?? 0
  const cookingLogs = logs?.filter((l: any) => l.log_type === "cooking").length ?? 0
  const chillingLogs = logs?.filter((l: any) => l.log_type !== "cooking").length ?? 0
  const compliant = logs?.filter((l: any) => l.status === "approved" || l.status === "pass").length ?? 0

  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/20 shrink-0">
            <Flame className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Registros de Cocción / Enfriamiento</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">9 CFR 417.2 — Monitoreo de CCPs y control de temperaturas</p>
          </div>
        </div>
        <Link
          href="/cooking/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nuevo Registro
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total */}
        <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] p-4 overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-1 bg-orange-500" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Registros</span>
            <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
              <ClipboardList className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{total}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">registros en el sistema</p>
        </div>

        {/* Cocción */}
        <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] p-4 overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-1 bg-red-500" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Cocción</span>
            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
              <Flame className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{cookingLogs}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">registros de cocción</p>
        </div>

        {/* Enfriamiento */}
        <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] p-4 overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Enfriamiento</span>
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
              <Thermometer className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{chillingLogs}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">registros de enfriamiento</p>
        </div>

        {/* Conformes */}
        <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] p-4 overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Conformes</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{compliant}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">aprobados en esta página</p>
        </div>
      </div>

      {/* Table Card */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Fecha</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tipo</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">CCP</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Producto</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Lecturas</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Operador</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {!logs?.length ? (
                <tr>
                  <td colSpan={8}>
                    <div className="flex flex-col items-center justify-center py-20 px-4">
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                        <Flame className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                      </div>
                      <h3 className="text-base font-bold text-slate-700 dark:text-slate-200 mb-1">Sin registros aún</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-xs mb-6">
                        Documenta cada proceso de cocción y enfriamiento con lecturas de temperatura en los puntos críticos de control (CCPs) según 9 CFR 417.2.
                      </p>
                      <Link
                        href="/cooking/new"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
                      >
                        <Plus className="w-4 h-4" />
                        Crear primer registro
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : logs.map((log: any) => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white whitespace-nowrap">{formatDate(log.date)}</td>
                  <td className="px-4 py-3">
                    {log.log_type === "cooking" ? (
                      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
                        <Flame className="w-3 h-3" />
                        Cocción
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                        <Thermometer className="w-3 h-3" />
                        Enfriamiento
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 max-w-[180px] truncate" title={log.ccp_number}>
                    {log.ccp_number || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{log.products?.name || "—"}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {(log.readings || []).length} lecturas
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        {log.creator?.initials || "?"}
                      </div>
                      <span className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block truncate max-w-[100px]">
                        {log.creator?.full_name || ""}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <LogStatusBadge status={log.status as LogStatus} />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/cooking/${log.id}`}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors whitespace-nowrap"
                    >
                      Ver →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 dark:border-slate-800">
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} baseHref="/cooking" />
        </div>
      </div>
    </div>
  )
}
