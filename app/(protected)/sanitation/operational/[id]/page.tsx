import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LogStatusBadge } from "@/components/logs/LogStatusBadge"
import { SignatureBlock } from "@/components/logs/SignatureBlock"
import { GenericActionButtons } from "@/components/forms/GenericActionButtons"
import { formatDate, formatTime } from "@/lib/utils"

interface Props { params: Promise<{ id: string }> }

const SANITIZER_PPM_MIN = 100
const SANITIZER_PPM_MAX = 400

export default async function OperationalSanitationDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [{ data: profile }, { data: log }] = await Promise.all([
    supabase.from("profiles").select("id, role").eq("id", user.id).single(),
    supabase.from("operational_sanitation_logs").select(`
      *,
      creator:profiles!operational_sanitation_logs_created_by_fkey(id, full_name, initials),
      verifier:profiles!operational_sanitation_logs_verified_by_fkey(full_name),
      approver:profiles!operational_sanitation_logs_approved_by_fkey(full_name)
    `).eq("id", id).single(),
  ])

  if (!profile || !log) notFound()

  const blocks: any[] = log.inspection_blocks || []

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <Link href="/sanitation/operational" className="flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-3">
          <ArrowLeft className="w-3.5 h-3.5" />Operational Sanitation
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Operational Sanitation Log</h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{formatDate(log.log_date)}</p>
          </div>
          <LogStatusBadge status={log.status} />
        </div>
      </div>

      <GenericActionButtons
        log={{ id: log.id, status: log.status, created_by: log.created_by }}
        currentUserId={user.id}
        currentUserRole={profile.role}
        tableName="operational_sanitation_logs"
      />

      {/* Sanitizer check */}
      <Card className={log.sanitizer_pass === false ? "border-red-200 bg-red-50" : log.sanitizer_pass === true ? "border-emerald-200" : undefined}>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Sanitizer Concentration</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div>
              <p className="text-2xl font-bold">{log.sanitizer_ppm ?? "—"} <span className="text-base font-normal text-[var(--muted-foreground)]">ppm</span></p>
              <p className="text-xs text-[var(--muted-foreground)]">{log.sanitizer_time ? `Checked at ${formatTime(log.sanitizer_time)}` : ""}</p>
            </div>
            {log.sanitizer_pass != null && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold ${log.sanitizer_pass ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                {log.sanitizer_pass ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {log.sanitizer_pass ? "In Range" : "OUT OF RANGE"}
              </div>
            )}
          </div>
          <p className="text-xs text-[var(--muted-foreground)] mt-2">Acceptable range: {SANITIZER_PPM_MIN}–{SANITIZER_PPM_MAX} ppm</p>
        </CardContent>
      </Card>

      {/* Blades */}
      <Card className={log.blades_inspected === false ? "border-orange-200" : undefined}>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Blades Inspection</CardTitle></CardHeader>
        <CardContent>
          {log.blades_inspected == null ? (
            <p className="text-sm text-[var(--muted-foreground)] italic">Not recorded</p>
          ) : (
            <div className="flex items-center gap-2">
              {log.blades_inspected ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
              <span className="text-sm font-medium">{log.blades_inspected ? "All blades inspected & clean" : "Issues found"}</span>
            </div>
          )}
          {log.blades_notes && <p className="text-sm mt-2 text-orange-700">{log.blades_notes}</p>}
        </CardContent>
      </Card>

      {/* Area inspections */}
      {blocks.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Area Inspections</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {blocks.map((block: any, i: number) => (
              <div key={i} className="p-3 rounded-lg border border-[var(--border)]">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-sm">{block.area}</p>
                  {block.time && <span className="text-xs text-[var(--muted-foreground)]">{formatTime(block.time)}</span>}
                </div>
                <div className="grid grid-cols-2 gap-x-4 text-sm">
                  {block.cleaned_by && <p className="text-[var(--muted-foreground)]">Cleaned by: <span className="text-[var(--foreground)]">{block.cleaned_by}</span></p>}
                  {block.verified_by && <p className="text-[var(--muted-foreground)]">Verified by: <span className="text-[var(--foreground)]">{block.verified_by}</span></p>}
                </div>
                {block.notes && <p className="text-sm mt-1.5 text-[var(--muted-foreground)]">{block.notes}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {log.general_notes && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">General Notes</CardTitle></CardHeader>
          <CardContent><p className="text-sm">{log.general_notes}</p></CardContent>
        </Card>
      )}

      <SignatureBlock
        status={log.status}
        creator={log.creator}
        submittedAt={log.submitted_at}
        verifier={log.verifier}
        verifiedAt={log.verified_at}
        approver={log.approver}
        approvedAt={log.approved_at}
        lockedAt={log.locked_at}
      />
    </div>
  )
}
