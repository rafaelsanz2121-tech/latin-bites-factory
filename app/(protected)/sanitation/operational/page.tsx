import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Plus, CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { LogStatusBadge } from "@/components/logs/LogStatusBadge"
import { formatDate } from "@/lib/utils"

export default async function OperationalSanitationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: logs } = await supabase
    .from("operational_sanitation_logs")
    .select(`
      id, log_date, status, sanitizer_ppm, sanitizer_pass, blades_inspected, created_at,
      creator:profiles!operational_sanitation_logs_created_by_fkey(full_name, initials)
    `)
    .order("log_date", { ascending: false })
    .limit(50)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Operational Sanitation</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">Daily sanitation inspection logs with sanitizer PPM and equipment checks</p>
        </div>
        <Link href="/sanitation/operational/new"><Button><Plus className="w-4 h-4" />New Log</Button></Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Completed By</th>
                  <th className="text-left px-4 py-3">Sanitizer PPM</th>
                  <th className="text-left px-4 py-3">Blades</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {!logs?.length ? (
                  <tr><td colSpan={6} className="text-center py-12 text-[var(--muted-foreground)]">No logs yet.</td></tr>
                ) : logs.map((log: any) => (
                  <tr key={log.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium">{formatDate(log.log_date)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold">{log.creator?.initials || "?"}</div>
                        <span className="text-sm">{log.creator?.full_name || "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{log.sanitizer_ppm ?? "—"} ppm</span>
                        {log.sanitizer_ppm != null && (
                          log.sanitizer_pass
                            ? <CheckCircle className="w-4 h-4 text-emerald-600" />
                            : <XCircle className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {log.blades_inspected != null && (
                        log.blades_inspected
                          ? <CheckCircle className="w-4 h-4 text-emerald-600" />
                          : <XCircle className="w-4 h-4 text-red-600" />
                      )}
                    </td>
                    <td className="px-4 py-3"><LogStatusBadge status={log.status} /></td>
                    <td className="px-4 py-3"><Link href={`/sanitation/operational/${log.id}`} className="text-xs text-blue-600 hover:underline">View →</Link></td>
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
