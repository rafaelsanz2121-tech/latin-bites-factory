import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, AlertTriangle, CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LogStatusBadge } from "@/components/logs/LogStatusBadge"
import { SignatureBlock } from "@/components/logs/SignatureBlock"
import { GenericActionButtons } from "@/components/forms/GenericActionButtons"
import { formatDate, formatTime } from "@/lib/utils"
import { PrintButton } from "@/components/ui/PrintButton"

interface Props { params: Promise<{ id: string }> }

export default async function ReceivingDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [{ data: profile }, { data: log }] = await Promise.all([
    supabase.from("profiles").select("id, role").eq("id", user.id).single(),
    supabase.from("receiving_logs").select(`
      *, products(name),
      creator:profiles!receiving_logs_created_by_fkey(id, full_name, initials),
      verifier:profiles!receiving_logs_verified_by_fkey(id, full_name, initials),
      approver:profiles!receiving_logs_approved_by_fkey(id, full_name, initials)
    `).eq("id", id).single(),
  ])

  if (!profile || !log) notFound()

  const tempAlert = log.internal_temp_f > 40

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <Link href="/receiving" className="flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-3">
          <ArrowLeft className="w-3.5 h-3.5" />Receiving Logs
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Receiving Log</h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{log.supplier} · {formatDate(log.date)}</p>
          </div>
          <div className="flex items-center gap-2">
            <PrintButton module="receiving" id={id} />
            <LogStatusBadge status={log.status} />
          </div>
        </div>
      </div>

      <GenericActionButtons log={{ id: log.id, status: log.status, created_by: log.created_by }} tableName="receiving_logs" currentUserId={user.id} currentUserRole={profile.role} />

      {tempAlert && (
        <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-red-300 bg-red-50">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-700">Temperature Violation</p>
            <p className="text-sm text-red-600">Internal temperature {log.internal_temp_f}°F exceeds 40°F limit for refrigerated products.</p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Shipment Details</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {[
            { label: "Date", value: formatDate(log.date) },
            { label: "Time Received", value: formatTime(log.time_received) },
            { label: "Supplier", value: log.supplier },
            { label: "Product", value: log.products?.name || "—" },
            { label: "Quantity", value: log.quantity_lbs ? `${log.quantity_lbs} lbs` : "—" },
            { label: "Internal Temp", value: log.internal_temp_f ? `${log.internal_temp_f}°F` : "—", alert: tempAlert },
            { label: "Vehicle Temp", value: log.vehicle_temp_f ? `${log.vehicle_temp_f}°F` : "—" },
            { label: "Packaging", value: log.packaging_condition || "—" },
            { label: "Labeling", value: log.labeling_ok ? "Acceptable" : "Not acceptable" },
          ].map((item: any) => (
            <div key={item.label} className="flex justify-between py-1.5 border-b border-[var(--border)] last:border-0">
              <span className="text-sm text-[var(--muted-foreground)]">{item.label}</span>
              <span className={`text-sm font-medium ${item.alert ? "text-red-600" : ""}`}>{item.value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

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
