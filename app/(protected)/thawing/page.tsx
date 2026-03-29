import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Thawing Logs</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
            Track and manage product thawing records
          </p>
        </div>
        <Link href="/thawing/new">
          <Button>
            <Plus className="w-4 h-4" />
            New Thawing Log
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Product</th>
                  <th className="text-left px-4 py-3">Lot / Batch</th>
                  <th className="text-left px-4 py-3">Method</th>
                  <th className="text-left px-4 py-3">Start Temp</th>
                  <th className="text-left px-4 py-3">End Temp</th>
                  <th className="text-left px-4 py-3">Operator</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {!logs?.length ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-[var(--muted-foreground)]">
                      No thawing logs yet. Create the first one!
                    </td>
                  </tr>
                ) : (
                  logs.map((log: any) => (
                    <tr
                      key={log.id}
                      className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-medium">{formatDate(log.date)}</td>
                      <td className="px-4 py-3 text-sm">{log.products?.name || "—"}</td>
                      <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">
                        {log.lot_batch_number || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            log.thawing_method === "running_water"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-cyan-100 text-cyan-700"
                          }`}
                        >
                          {log.thawing_method === "running_water" ? "Running Water" : "Cooler"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={
                            log.start_temp_f > 40
                              ? "text-amber-600 font-medium"
                              : "text-[var(--foreground)]"
                          }
                        >
                          {log.start_temp_f}°F
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {log.end_temp_f !== null ? `${log.end_temp_f}°F` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                            {log.creator?.initials || "?"}
                          </div>
                          <span className="text-sm text-[var(--muted-foreground)] hidden sm:block">
                            {log.creator?.full_name || "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <LogStatusBadge status={log.status as LogStatus} />
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/thawing/${log.id}`} className="text-xs text-blue-600 hover:underline">
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={total ?? 0} baseHref="/thawing" />
        </CardContent>
      </Card>
    </div>
  )
}
