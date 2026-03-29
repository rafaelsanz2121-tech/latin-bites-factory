import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Plus, AlertTriangle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { LogStatusBadge } from "@/components/logs/LogStatusBadge"
import { Pagination } from "@/components/ui/Pagination"
import { formatDate, formatTime } from "@/lib/utils"
import type { LogStatus } from "@/types"

export default async function ReceivingListPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
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
      .from("receiving_logs")
      .select(`id, date, time_received, status, supplier, internal_temp_f, packaging_condition, created_at, products(name), creator:profiles!receiving_logs_created_by_fkey(full_name, initials)`)
      .order("date", { ascending: false })
      .range(from, to),
    supabase
      .from("receiving_logs")
      .select("*", { count: "exact", head: true }),
  ])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Receiving Log</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">Incoming product temperature and condition records</p>
        </div>
        <Link href="/receiving/new"><Button><Plus className="w-4 h-4" />New Receiving</Button></Link>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Time</th>
                  <th className="text-left px-4 py-3">Supplier</th>
                  <th className="text-left px-4 py-3">Product</th>
                  <th className="text-left px-4 py-3">Internal Temp</th>
                  <th className="text-left px-4 py-3">Packaging</th>
                  <th className="text-left px-4 py-3">Operator</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {!logs?.length ? (
                  <tr><td colSpan={9} className="text-center py-12 text-[var(--muted-foreground)]">No receiving logs yet.</td></tr>
                ) : logs.map((log: any) => (
                  <tr key={log.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium">{formatDate(log.date)}</td>
                    <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">{formatTime(log.time_received)}</td>
                    <td className="px-4 py-3 text-sm">{log.supplier}</td>
                    <td className="px-4 py-3 text-sm">{log.products?.name || "—"}</td>
                    <td className="px-4 py-3 text-sm">
                      {log.internal_temp_f !== null ? (
                        <span className={log.internal_temp_f > 40 ? "text-red-600 font-semibold flex items-center gap-1" : "text-emerald-600 font-medium"}>
                          {log.internal_temp_f > 40 && <AlertTriangle className="w-3.5 h-3.5" />}
                          {log.internal_temp_f}°F
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {log.packaging_condition === "acceptable" ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5" />OK</span>
                      ) : log.packaging_condition === "deficient" ? (
                        <span className="flex items-center gap-1 text-xs text-red-700"><AlertTriangle className="w-3.5 h-3.5" />Deficient</span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold">{log.creator?.initials || "?"}</div>
                    </td>
                    <td className="px-4 py-3"><LogStatusBadge status={log.status as LogStatus} /></td>
                    <td className="px-4 py-3"><Link href={`/receiving/${log.id}`} className="text-xs text-blue-600 hover:underline">View →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} baseHref="/receiving" />
        </CardContent>
      </Card>
    </div>
  )
}
