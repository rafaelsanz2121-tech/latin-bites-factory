import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Plus, Snowflake, Droplets, ClipboardList, ThermometerSnowflake } from "lucide-react"
import { LogStatusBadge } from "@/components/logs/LogStatusBadge"
import { Pagination } from "@/components/ui/Pagination"
import { formatDate } from "@/lib/utils"
import type { LogStatus } from "@/types"

const PAGE_SIZE = 25

export default async function ThawingListPage({
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

  const [{ data: logs }, { count: total }] = await Promise.all([
    supabase
      .from("thawing_logs")
      .select(`
        id, date, status, thawing_method, lot_batch_number,
        start_temp_f, end_temp_f, employee_initials, created_at,
        products(name),
        creator:profiles!thawing_logs_created_by_fkey(full_name, initials)
      `)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, to),
    supabase
      .from("thawing_logs")
      .select("*", { count: "exact", head: true }),
  ])

  const totalCount = total ?? 0
  const runningWater = logs?.filter((l: any) => l.thawing_method === "running_water").length ?? 0
  const cooler = logs?.filter((l: any) => l.thawing_method !== "running_water").length ?? 0
  const tempAlerts = logs?.filter((l: any) => l.start_temp_f > 40).length ?? 0

  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-700 flex items-center justify-center shadow-lg shadow-cyan-500/20 shrink-0">
            <Snowflake className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Registros de Descongelación</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">9 CFR 381.66 — Control de temperaturas en descongelamiento</p>
          </div>
        </div>
        <Link
          href="/thawing/new"
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
          <div className="absolute top-0 left-0 right-0 h-1 bg-cyan-500" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Registros</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-900/40 flex items-center justify-center">
              <ClipboardList className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{totalCount}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">registros en el sistema</p>
        </div>

        {/* Agua Corriente */}
        <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] p-4 overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Agua Corriente</span>
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
              <Droplets className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{runningWater}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">método agua corriente</p>
        </div>

        {/* Cooler */}
        <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] p-4 overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Cooler</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
              <Snowflake className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{cooler}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">método refrigerador</p>
        </div>

        {/* Alertas */}
        <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] p-4 overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Alertas Temp.</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
              <ThermometerSnowflake className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{tempAlerts}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">inicio por encima de 40°F</p>
        </div>
      </div>

      {/* Table Card */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Fecha</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Producto</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Lote / Batch</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Método</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Temp. Inicio</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Temp. Fin</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Operador</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Estado</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Imprimir</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {!logs?.length ? (
                <tr>
                  <td colSpan={10}>
                    <div className="flex flex-col items-center justify-center py-20 px-4">
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                        <Snowflake className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                      </div>
                      <h3 className="text-base font-bold text-slate-700 dark:text-slate-200 mb-1">Sin registros aún</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-xs mb-6">
                        Registra cada proceso de descongelación con temperaturas de inicio y fin para garantizar inocuidad alimentaria según 9 CFR 381.66.
                      </p>
                      <Link
                        href="/thawing/new"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
                      >
                        <Plus className="w-4 h-4" />
                        Crear primer registro
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white whitespace-nowrap">{formatDate(log.date)}</td>
                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{log.products?.name || "—"}</td>
                    <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 font-mono">
                      {log.lot_batch_number || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {log.thawing_method === "running_water" ? (
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                          <Droplets className="w-3 h-3" />
                          Agua Corriente
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400">
                          <Snowflake className="w-3 h-3" />
                          Cooler
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {log.start_temp_f > 40 ? (
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                          {log.start_temp_f}°F
                        </span>
                      ) : (
                        <span className="text-slate-700 dark:text-slate-300">{log.start_temp_f}°F</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                      {log.end_temp_f !== null ? `${log.end_temp_f}°F` : <span className="text-slate-400 dark:text-slate-500">—</span>}
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
                      <a
                        href={`/print/thawing/${log.id}`}
                        target="_blank"
                        className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Imprimir"
                      >
                        🖨
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/thawing/${log.id}`}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors whitespace-nowrap"
                      >
                        Ver →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 dark:border-slate-800">
          <Pagination page={page} pageSize={PAGE_SIZE} total={totalCount} baseHref="/thawing" />
        </div>
      </div>
    </div>
  )
}
