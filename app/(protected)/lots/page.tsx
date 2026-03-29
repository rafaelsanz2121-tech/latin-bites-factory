import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Pagination } from "@/components/ui/Pagination"
import { formatDate } from "@/lib/utils"
import { Package, Plus } from "lucide-react"

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
  const to = from + PAGE_SIZE - 1

  const [{ data: lots }, { count }] = await Promise.all([
    supabase
      .from("lots")
      .select("id, lot_number, received_date, quantity_lbs, supplier, notes, products(name, code)")
      .order("created_at", { ascending: false })
      .range(from, to),
    supabase.from("lots").select("*", { count: "exact", head: true }),
  ])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Raw Material Lots</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">Track incoming raw material batches and traceability</p>
        </div>
        <Link href="/lots/new">
          <Button><Plus className="w-4 h-4" />New Lot</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          {!lots?.length && page === 1 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[var(--muted-foreground)]">
              <Package className="w-10 h-10 mb-3 opacity-30" />
              <p className="font-medium">No lots registered yet</p>
              <p className="text-sm mt-1">Create your first raw material lot to begin traceability</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
                      <th className="text-left px-4 py-3">Lot Number</th>
                      <th className="text-left px-4 py-3">Product</th>
                      <th className="text-left px-4 py-3">Received</th>
                      <th className="text-left px-4 py-3">Qty (lbs)</th>
                      <th className="text-left px-4 py-3">Supplier</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {lots?.map((lot: any) => (
                      <tr key={lot.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-sm font-mono font-semibold">{lot.lot_number}</p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className="text-xs">{lot.products?.name || "—"}</Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">
                          {lot.received_date ? formatDate(lot.received_date) : "—"}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium tabular-nums">
                          {lot.quantity_lbs ? `${Number(lot.quantity_lbs).toLocaleString()} lbs` : "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">{lot.supplier || "—"}</td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/lots/${lot.id}`} className="text-xs text-blue-600 hover:underline">View</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} baseHref="/lots" />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
