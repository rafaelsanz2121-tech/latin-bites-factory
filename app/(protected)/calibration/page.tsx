import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Plus, CheckCircle2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { LogStatusBadge } from "@/components/logs/LogStatusBadge"
import { Pagination } from "@/components/ui/Pagination"
import { formatDate } from "@/lib/utils"
import type { LogStatus } from "@/types"

const PAGE_SIZE = 25

export default async function CalibrationListPage({
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

  const [{ data: logs }, { count }] = await Promise.all([
    supabase
      .from("calibration_logs")
      .select(`id, date, status, thermometer_id, thermometer_type, ice_water_reading_f, is_in_tolerance, created_at, creator:profiles!calibration_logs_created_by_fkey(full_name, initials)`)
      .order("date", { ascending: false })
      .range(from, to),
    supabase.from("calibration_logs").select("*", { count: "exact", head: true }),
  ])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Thermometer Calibration</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">Daily thermometer verification records (ice water method ±2°F from 32°F)</p>
        </div>
        <Link href="/calibration/new"><Button><Plus className="w-4 h-4" />New Calibration</Button></Link>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Thermometer</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">Reading</th>
                  <th className="text-left px-4 py-3">Tolerance</th>
                  <th className="text-left px-4 py-3">Operator</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {!logs?.length ? (
                  <tr><td colSpan={8} className="text-center py-12 text-[var(--muted-foreground)]">No calibration logs yet.</td></tr>
                ) : logs.map((log: any) => (
                  <tr key={log.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium">{formatDate(log.date)}</td>
                    <td className="px-4 py-3 text-sm font-mono">{log.thermometer_id}</td>
                    <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">{log.thermometer_type || "—"}</td>
                    <td className="px-4 py-3 text-sm font-medium">{log.ice_water_reading_f}°F</td>
                    <td className="px-4 py-3">
                      {log.is_in_tolerance ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-700 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />In Tolerance
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-red-700 font-medium">
                          <XCircle className="w-3.5 h-3.5" />OUT OF RANGE
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold">{log.creator?.initials || "?"}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><LogStatusBadge status={log.status as LogStatus} /></td>
                    <td className="px-4 py-3"><Link href={`/calibration/${log.id}`} className="text-xs text-blue-600 hover:underline">View →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} baseHref="/calibration" />
        </CardContent>
      </Card>
    </div>
  )
}
