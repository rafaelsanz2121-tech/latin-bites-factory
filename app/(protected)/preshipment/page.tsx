import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Plus, CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pre-Shipment Reviews</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">Final product disposition review before shipment</p>
        </div>
        <Link href="/preshipment/new"><Button><Plus className="w-4 h-4" />New Review</Button></Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Lot</th>
                  <th className="text-left px-4 py-3">Product</th>
                  <th className="text-left px-4 py-3">Disposition</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Reviewer</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {!reviews?.length ? (
                  <tr><td colSpan={7} className="text-center py-12 text-[var(--muted-foreground)]">No reviews yet.</td></tr>
                ) : reviews.map((r: any) => (
                  <tr key={r.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium">{formatDate(r.review_date)}</td>
                    <td className="px-4 py-3 text-sm font-mono">{r.lot?.lot_number || "—"}</td>
                    <td className="px-4 py-3 text-sm">{r.lot?.products?.name || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {r.disposition === "approved_for_shipment" ? (
                          <><CheckCircle className="w-4 h-4 text-emerald-600" /><span className="text-sm text-emerald-700 font-medium">Approved</span></>
                        ) : r.disposition === "hold" ? (
                          <><span className="text-sm text-orange-600 font-medium">Hold</span></>
                        ) : r.disposition === "rejected" ? (
                          <><XCircle className="w-4 h-4 text-red-600" /><span className="text-sm text-red-600 font-medium">Rejected</span></>
                        ) : (
                          <span className="text-sm text-[var(--muted-foreground)]">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3"><LogStatusBadge status={r.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold">{r.creator?.initials || "?"}</div>
                        <span className="text-sm">{r.creator?.full_name || "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Link href={`/preshipment/${r.id}`} className="text-xs text-blue-600 hover:underline">View →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} baseHref="/preshipment" />
        </CardContent>
      </Card>
    </div>
  )
}
