import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Pagination } from "@/components/ui/Pagination"
import { formatDate } from "@/lib/utils"
import { Package, Plus, Layers, ArrowRight, Scale, CalendarDays } from "lucide-react"

const PAGE_SIZE = 25

export default async function LotsPage({
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
  const to   = from + PAGE_SIZE - 1

  const [{ data: lots }, { count }, { data: allLots }] = await Promise.all([
    supabase
      .from("lots")
      .select("id, lot_number, received_date, quantity_lbs, supplier, notes, products(name, code)")
      .order("created_at", { ascending: false })
      .range(from, to),
    supabase.from("lots").select("*", { count: "exact", head: true }),
    supabase.from("lots").select("quantity_lbs"),
  ])

  const totalLots   = count ?? 0
  const totalLbs    = (allLots || []).reduce((sum: number, l: any) => sum + (parseFloat(l.quantity_lbs) || 0), 0)
  const thisMonth   = (allLots || []).filter((l: any) => {
    const d = new Date(l.received_date || "")
    const n = new Date()
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear()
  }).length

  const kpis = [
    { label: "Total Lotes", value: totalLots, icon: Layers, bar: "bg-teal-500", iconBg: "bg-teal-100 dark:bg-teal-900/40", iconText: "text-teal-600 dark:text-teal-300", sub: "registrados" },
    { label: "Lbs. Total", value: totalLbs > 0 ? `${totalLbs.toLocaleString()} lbs` : "—", icon: Scale, bar: "bg-blue-500", iconBg: "bg-blue-100 dark:bg-blue-900/40", iconText: "text-blue-600 dark:text-blue-300", sub: "materia prima" },
    { label: "Este Mes", value: thisMonth, icon: CalendarDays, bar: "bg-violet-500", iconBg: "bg-violet-100 dark:bg-violet-900/40", iconText: "text-violet-600 dark:text-violet-300", sub: "lotes recibidos" },
  ]

  return (
    <div className="space-y-6 max-w-[1100px]">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Lotes de Materia Prima</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">9 CFR 320 — Trazabilidad y control de lotes de entrada</p>
          </div>
        </div>
        <Link
          href="/lots/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nuevo Lote
        </Link>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

      {/* ── Table ── */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">
              Historial de Lotes — {totalLots} total
            </h2>
          </div>
        </div>

        {!lots?.length && page === 1 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-slate-400 dark:text-slate-500" />
            </div>
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-200 mb-1">Sin lotes registrados</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-xs mb-6">
              Registra los lotes de materia prima para habilitar la trazabilidad completa desde el proveedor hasta el despacho.
            </p>
            <Link href="/lots/new" className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm">
              <Plus className="w-4 h-4" />
              Crear primer lote
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                    {["Lote #", "Producto", "Fecha Recibo", "Cantidad", "Proveedor", ""].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lots?.map((lot: any) => (
                    <tr key={lot.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono font-bold text-slate-800 dark:text-slate-100">{lot.lot_number}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 text-[11.5px] font-semibold">
                          {lot.products?.name || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {lot.received_date ? formatDate(lot.received_date) : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                          {lot.quantity_lbs ? `${Number(lot.quantity_lbs).toLocaleString()} lbs` : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600 dark:text-slate-400">{lot.supplier || "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/lots/${lot.id}`}
                          className="inline-flex items-center gap-1 text-[12px] font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                        >
                          Ver
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} baseHref="/lots" />
          </>
        )}
      </div>
    </div>
  )
}
