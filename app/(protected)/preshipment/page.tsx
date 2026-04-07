import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Plus, CheckCircle, XCircle, PackageCheck, ClipboardList, Ban, Clock } from "lucide-react"
import { LogStatusBadge } from "@/components/logs/LogStatusBadge"
import { formatDate } from "@/lib/utils"
import { Pagination } from "@/components/ui/Pagination"

const PAGE_SIZE = 25

export default async function PreshipmentPage({
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

  const [{ data: reviews }, { count }] = await Promise.all([
    supabase
      .from("preshipment_reviews")
      .select(`
        id, review_date, disposition, status, created_at,
        lot:lots(lot_number, products(name)),
        creator:profiles!preshipment_reviews_created_by_fkey(full_name, initials)
      `)
      .order("review_date", { ascending: false })
      .range(from, to),
    supabase.from("preshipment_reviews").select("*", { count: "exact", head: true }),
  ])

  const totalReviews = count ?? 0
  const approvedCount = reviews?.filter((r: any) => r.disposition === "approved_for_shipment").length ?? 0
  const holdCount = reviews?.filter((r: any) => r.disposition === "hold").length ?? 0
  const rejectedCount = reviews?.filter((r: any) => r.disposition === "rejected").length ?? 0

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <PackageCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Pre-Shipment Reviews</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">9 CFR 417.5(c) — Final product disposition review prior to shipment</p>
          </div>
        </div>
        <Link
          href="/preshipment/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nuevo Registro
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Reviews */}
        <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] p-4 overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-1 bg-sky-500" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total</span>
            <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center">
              <ClipboardList className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{totalReviews}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Reviews on file</p>
        </div>

        {/* Approved */}
        <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] p-4 overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Approved</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{approvedCount}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Cleared for shipment</p>
        </div>

        {/* On Hold */}
        <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] p-4 overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">On Hold</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{holdCount}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Pending disposition</p>
        </div>

        {/* Rejected */}
        <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] p-4 overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-1 bg-red-500" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Rejected</span>
            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
              <Ban className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{rejectedCount}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Not cleared for shipment</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Date</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Lot</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Product</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Disposition</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Reviewer</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {!reviews?.length ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-slate-500 dark:text-slate-400">
                    <PackageCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-medium">No pre-shipment reviews yet.</p>
                    <p className="text-xs mt-1">Create the first review to get started.</p>
                  </td>
                </tr>
              ) : reviews.map((r: any) => (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">{formatDate(r.review_date)}</td>
                  <td className="px-4 py-3 text-sm font-mono font-medium text-slate-700 dark:text-slate-300">{r.lot?.lot_number || "—"}</td>
                  <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{r.lot?.products?.name || "—"}</td>
                  <td className="px-4 py-3">
                    {r.disposition === "approved_for_shipment" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle className="w-3.5 h-3.5" />Approved
                      </span>
                    ) : r.disposition === "hold" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                        <Clock className="w-3.5 h-3.5" />Hold
                      </span>
                    ) : r.disposition === "rejected" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
                        <XCircle className="w-3.5 h-3.5" />Rejected
                      </span>
                    ) : (
                      <span className="text-sm text-slate-500 dark:text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><LogStatusBadge status={r.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center text-[11px] font-bold text-sky-700 dark:text-sky-400">
                        {r.creator?.initials || "?"}
                      </div>
                      <span className="text-sm text-slate-700 dark:text-slate-300">{r.creator?.full_name || "—"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/preshipment/${r.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 transition-colors"
                    >
                      Ver →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} baseHref="/preshipment" />
      </div>
    </div>
  )
}
