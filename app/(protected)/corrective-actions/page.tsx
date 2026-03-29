import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Plus, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Pagination } from "@/components/ui/Pagination"
import { formatDate } from "@/lib/utils"

const PAGE_SIZE = 25

export default async function CorrectiveActionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam || "1", 10))

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const today = new Date().toISOString().split("T")[0]
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const [{ data: capas }, { count }] = await Promise.all([
    supabase
      .from("corrective_actions")
      .select(`id, capa_type, status, action_description, due_date, date_opened, created_at, assignee:profiles!corrective_actions_assigned_to_fkey(full_name, initials), assigner:profiles!corrective_actions_assigned_by_fkey(full_name)`)
      .order("due_date", { ascending: true })
      .range(from, to),
    supabase.from("corrective_actions").select("*", { count: "exact", head: true }),
  ])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Corrective Actions</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">CAPA tracking for deviations and food safety issues</p>
        </div>
        <Link href="/corrective-actions/new"><Button><Plus className="w-4 h-4" />New CAPA</Button></Link>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">Action</th>
                  <th className="text-left px-4 py-3">Assigned To</th>
                  <th className="text-left px-4 py-3">Due Date</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {!capas?.length ? (
                  <tr><td colSpan={6} className="text-center py-12 text-[var(--muted-foreground)]">No corrective actions yet.</td></tr>
                ) : capas.map((capa: any) => {
                  const isOverdue = capa.status !== "closed" && capa.due_date < today
                  return (
                    <tr key={capa.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${capa.capa_type === "corrective" ? "bg-orange-100 text-orange-700" : "bg-purple-100 text-purple-700"}`}>
                          {capa.capa_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm max-w-[300px]">
                        <p className="truncate">{capa.action_description}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold">{capa.assignee?.initials || "?"}</div>
                          <span className="text-sm">{capa.assignee?.full_name || "—"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {isOverdue && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                          <span className={`text-sm ${isOverdue ? "text-red-600 font-semibold" : ""}`}>{formatDate(capa.due_date)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={capa.status === "closed" ? "success" : isOverdue ? "destructive" : capa.status === "open" ? "warning" : "info"} className="text-xs">
                          {isOverdue && capa.status !== "closed" ? "OVERDUE" : capa.status.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3"><Link href={`/corrective-actions/${capa.id}`} className="text-xs text-blue-600 hover:underline">View →</Link></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} baseHref="/corrective-actions" />
        </CardContent>
      </Card>
    </div>
  )
}
