import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cooking / Chilling Logs</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">CCP monitoring and temperature control records</p>
        </div>
        <Link href="/cooking/new">
          <Button><Plus className="w-4 h-4" />New Log</Button>
        </Link>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">CCP</th>
                  <th className="text-left px-4 py-3">Product</th>
                  <th className="text-left px-4 py-3">Readings</th>
                  <th className="text-left px-4 py-3">Operator</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {!logs?.length ? (
                  <tr><td colSpan={8} className="text-center py-12 text-[var(--muted-foreground)]">No logs yet.</td></tr>
                ) : logs.map((log: any) => (
                  <tr key={log.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium">{formatDate(log.date)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${log.log_type === 'cooking' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                        {log.log_type === 'cooking' ? '🔥 Cooking' : '❄️ Chilling'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--muted-foreground)] max-w-[200px] truncate">{log.ccp_number}</td>
                    <td className="px-4 py-3 text-sm">{log.products?.name || "—"}</td>
                    <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">{(log.readings || []).length} readings</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">{log.creator?.initials || "?"}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><LogStatusBadge status={log.status as LogStatus} /></td>
                    <td className="px-4 py-3"><Link href={`/cooking/${log.id}`} className="text-xs text-blue-600 hover:underline">View →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} baseHref="/cooking" />
        </CardContent>
      </Card>
    </div>
  )
}
