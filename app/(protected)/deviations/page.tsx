import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Pagination } from "@/components/ui/Pagination"
import { formatDate } from "@/lib/utils"

const SEVERITY_BADGE: Record<string, "destructive" | "warning" | "info"> = {
  critical: "destructive",
  major: "warning",
  minor: "info",
}

const STATUS_BADGE: Record<string, "destructive" | "warning" | "secondary" | "success"> = {
  open: "destructive",
  under_review: "warning",
  corrective_action_pending: "warning",
  closed: "success",
}

export default async function DeviationsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1)
  const PAGE_SIZE = 25
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [{ data: deviations }, { count }] = await Promise.all([
    supabase
      .from("deviations")
      .select(`id, date_identified, severity, status, description, source_log_type, usda_notified, created_at, identifier:profiles!deviations_identified_by_fkey(full_name, initials), areas(name)`)
      .order("created_at", { ascending: false })
      .range(from, to),
    supabase
      .from("deviations")
      .select("*", { count: "exact", head: true }),
  ])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Deviations</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">Food safety and operational deviations requiring corrective action</p>
        </div>
        <Link href="/deviations/new"><Button><Plus className="w-4 h-4" />Flag Deviation</Button></Link>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Severity</th>
                  <th className="text-left px-4 py-3">Description</th>
                  <th className="text-left px-4 py-3">Source</th>
                  <th className="text-left px-4 py-3">USDA</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Identified By</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {!deviations?.length ? (
                  <tr><td colSpan={8} className="text-center py-12 text-[var(--muted-foreground)]">No deviations found. Great work!</td></tr>
                ) : deviations.map((dev: any) => (
                  <tr key={dev.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium">{formatDate(dev.date_identified)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={SEVERITY_BADGE[dev.severity] || "secondary"} className="uppercase text-xs">
                        {dev.severity}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm max-w-[300px]">
                      <p className="truncate">{dev.description}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">
                      {dev.source_log_type ? dev.source_log_type.replace(/_logs?$/, "").replace(/_/g, " ") : "Manual"}
                    </td>
                    <td className="px-4 py-3">
                      {dev.severity === "critical" && (
                        <span className={`text-xs font-medium ${dev.usda_notified ? "text-emerald-600" : "text-red-600"}`}>
                          {dev.usda_notified ? "✓ Notified" : "⚠ Required"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_BADGE[dev.status] || "secondary"} className="text-xs">
                        {dev.status.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold">{dev.identifier?.initials || "?"}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Link href={`/deviations/${dev.id}`} className="text-xs text-blue-600 hover:underline">View →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} baseHref="/deviations" />
        </CardContent>
      </Card>
    </div>
  )
}
