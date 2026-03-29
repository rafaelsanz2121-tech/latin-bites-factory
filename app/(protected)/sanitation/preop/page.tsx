import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Plus, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LogStatusBadge } from "@/components/logs/LogStatusBadge"
import { formatDate } from "@/lib/utils"

export default async function PreOpSanitationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: reports } = await supabase
    .from("preop_sanitation_reports")
    .select(`
      id, report_date, inspection_time, status, total_items, pass_count, fail_count, na_count, created_at,
      creator:profiles!preop_sanitation_reports_created_by_fkey(full_name, initials)
    `)
    .order("report_date", { ascending: false })
    .limit(50)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Daily Pre-Op Sanitation</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">Pre-operation facility inspection — Sections A–K</p>
        </div>
        <Link href="/sanitation/preop/new"><Button><Plus className="w-4 h-4" />New Report</Button></Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Time</th>
                  <th className="text-left px-4 py-3">Completed By</th>
                  <th className="text-left px-4 py-3">Results</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {!reports?.length ? (
                  <tr><td colSpan={6} className="text-center py-12 text-[var(--muted-foreground)]">No reports yet.</td></tr>
                ) : reports.map((r: any) => (
                  <tr key={r.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium">{formatDate(r.report_date)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {r.inspection_time ? r.inspection_time.slice(0, 5) : "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold">{r.creator?.initials || "?"}</div>
                        <span className="text-sm">{r.creator?.full_name || "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 text-xs">
                        {r.pass_count > 0 && (
                          <span className="flex items-center gap-1 text-emerald-600">
                            <CheckCircle className="w-3.5 h-3.5" />{r.pass_count}
                          </span>
                        )}
                        {r.fail_count > 0 && (
                          <span className="flex items-center gap-1 text-red-600 font-semibold">
                            <XCircle className="w-3.5 h-3.5" />{r.fail_count} fail
                          </span>
                        )}
                        {r.na_count > 0 && (
                          <span className="flex items-center gap-1 text-[var(--muted-foreground)]">
                            <AlertCircle className="w-3.5 h-3.5" />{r.na_count} N/A
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3"><LogStatusBadge status={r.status} /></td>
                    <td className="px-4 py-3"><Link href={`/sanitation/preop/${r.id}`} className="text-xs text-blue-600 hover:underline">View →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
