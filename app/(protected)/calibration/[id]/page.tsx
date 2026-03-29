import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, AlertTriangle, CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LogStatusBadge } from "@/components/logs/LogStatusBadge"
import { SignatureBlock } from "@/components/logs/SignatureBlock"
import { GenericActionButtons } from "@/components/forms/GenericActionButtons"
import { formatDate } from "@/lib/utils"
import { PrintButton } from "@/components/ui/PrintButton"

interface Props { params: Promise<{ id: string }> }

export default async function CalibrationDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [{ data: profile }, { data: log }] = await Promise.all([
    supabase.from("profiles").select("id, role").eq("id", user.id).single(),
    supabase.from("calibration_logs").select(`
      *, creator:profiles!calibration_logs_created_by_fkey(id, full_name, initials),
      verifier:profiles!calibration_logs_verified_by_fkey(id, full_name, initials),
      approver:profiles!calibration_logs_approved_by_fkey(id, full_name, initials)
    `).eq("id", id).single(),
  ])

  if (!profile || !log) notFound()

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <Link href="/calibration" className="flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-3">
          <ArrowLeft className="w-3.5 h-3.5" />Calibration Logs
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Thermometer Calibration</h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{log.thermometer_id} · {formatDate(log.date)}</p>
          </div>
          <div className="flex items-center gap-2">
            <PrintButton module="calibration" id={id} />
            <LogStatusBadge status={log.status} />
          </div>
        </div>
      </div>

      <GenericActionButtons log={{ id: log.id, status: log.status, created_by: log.created_by }} tableName="calibration_logs" currentUserId={user.id} currentUserRole={profile.role} />

      {/* Tolerance result */}
      <div className={`flex items-center gap-3 p-4 rounded-xl border-2 ${log.is_in_tolerance ? "border-emerald-300 bg-emerald-50" : "border-red-300 bg-red-50"}`}>
        {log.is_in_tolerance ? <CheckCircle2 className="w-6 h-6 text-emerald-600" /> : <AlertTriangle className="w-6 h-6 text-red-600" />}
        <div>
          <p className={`font-semibold ${log.is_in_tolerance ? "text-emerald-700" : "text-red-700"}`}>
            {log.is_in_tolerance ? "Within Tolerance" : "OUT OF TOLERANCE"}
          </p>
          <p className="text-sm text-[var(--muted-foreground)]">
            Reading: <strong>{log.ice_water_reading_f}°F</strong> · Reference: {log.ice_water_reference_f}°F · Tolerance: ±2°F
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Details</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {[
            { label: "Thermometer ID", value: log.thermometer_id },
            { label: "Type", value: log.thermometer_type || "—" },
            { label: "Date", value: formatDate(log.date) },
            { label: "Ice Water Reference", value: `${log.ice_water_reference_f}°F` },
            { label: "Actual Reading", value: `${log.ice_water_reading_f}°F` },
            { label: "Deviation from 32°F", value: `${(log.ice_water_reading_f - 32).toFixed(1)}°F` },
          ].map((item) => (
            <div key={item.label} className="flex justify-between py-1.5 border-b border-[var(--border)] last:border-0">
              <span className="text-sm text-[var(--muted-foreground)]">{item.label}</span>
              <span className="text-sm font-medium">{item.value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {log.corrective_action_taken && (
        <Card className="border-amber-200">
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold uppercase tracking-wide text-amber-700">Corrective Action Taken</CardTitle></CardHeader>
          <CardContent><p className="text-sm">{log.corrective_action_taken}</p></CardContent>
        </Card>
      )}

      {log.notes && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Notes</CardTitle></CardHeader>
          <CardContent><p className="text-sm">{log.notes}</p></CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-6">
          <SignatureBlock status={log.status} creator={log.creator} submittedAt={log.submitted_at} verifier={log.verifier} verifiedAt={log.verified_at} approver={log.approver} approvedAt={log.approved_at} lockedAt={log.locked_at} />
        </CardContent>
      </Card>
    </div>
  )
}
