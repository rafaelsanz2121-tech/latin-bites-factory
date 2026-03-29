import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Snowflake, Thermometer, Clock, Droplets } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LogStatusBadge } from "@/components/logs/LogStatusBadge"
import { SignatureBlock } from "@/components/logs/SignatureBlock"
import { ThawingActionButtons } from "@/components/forms/ThawingActionButtons"
import { PrintButton } from "@/components/ui/PrintButton"
import { formatDate, formatTime, formatDuration, calcDurationMinutes } from "@/lib/utils"

interface Props {
  params: Promise<{ id: string }>
}

export default async function ThawingDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [{ data: profile }, { data: log }] = await Promise.all([
    supabase.from("profiles").select("id, role").eq("id", user.id).single(),
    supabase
      .from("thawing_logs")
      .select(`
        *,
        products(id, name, code),
        creator:profiles!thawing_logs_created_by_fkey(id, full_name, initials),
        verifier:profiles!thawing_logs_verified_by_fkey(id, full_name, initials),
        approver:profiles!thawing_logs_approved_by_fkey(id, full_name, initials)
      `)
      .eq("id", id)
      .single(),
  ])

  if (!profile || !log) notFound()

  const duration = calcDurationMinutes(log.start_time, log.end_time)

  const details = [
    { label: "Date", value: formatDate(log.date), icon: null },
    { label: "Product", value: log.products?.name || "—", icon: null },
    { label: "Lot / Batch", value: log.lot_batch_number || "—", icon: null },
    {
      label: "Thawing Method",
      value: log.thawing_method === "running_water" ? "Running Water (≤70°F)" : "Cooler",
      icon: log.thawing_method === "running_water" ? Droplets : Snowflake,
    },
  ]

  const tempReadings = [
    { label: "Start Time", value: formatTime(log.start_time), icon: Clock },
    {
      label: "Start Temp",
      value: log.start_temp_f ? `${log.start_temp_f}°F` : "—",
      icon: Thermometer,
      alert: log.start_temp_f > 50,
    },
    { label: "End Time", value: formatTime(log.end_time), icon: Clock },
    {
      label: "End Temp",
      value: log.end_temp_f ? `${log.end_temp_f}°F` : "—",
      icon: Thermometer,
      alert: log.end_temp_f > 40,
    },
  ]

  if (log.water_temp_f) {
    tempReadings.push({
      label: "Water Temp",
      value: `${log.water_temp_f}°F`,
      icon: Droplets,
      alert: log.water_temp_f > 70,
    })
  }

  if (duration !== null) {
    tempReadings.push({
      label: "Duration",
      value: formatDuration(duration),
      icon: Clock,
      alert: duration > 480,
    })
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Back + Header */}
      <div>
        <Link href="/thawing" className="flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-3">
          <ArrowLeft className="w-3.5 h-3.5" />
          Thawing Logs
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Thawing Log</h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
              {log.products?.name} · {formatDate(log.date)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <PrintButton module="thawing" id={id} />
            <LogStatusBadge status={log.status} />
          </div>
        </div>
      </div>

      {/* Verification bar */}
      <ThawingActionButtons
        log={log}
        currentUserId={user.id}
        currentUserRole={profile.role}
      />

      {/* Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              Product Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {details.map((d) => (
              <div key={d.label} className="flex justify-between items-center py-1.5 border-b border-[var(--border)] last:border-0">
                <span className="text-sm text-[var(--muted-foreground)]">{d.label}</span>
                <div className="flex items-center gap-1.5">
                  {d.icon && <d.icon className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />}
                  <span className="text-sm font-medium">{d.value}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              Temperature & Time
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tempReadings.map((r) => (
              <div key={r.label} className="flex justify-between items-center py-1.5 border-b border-[var(--border)] last:border-0">
                <div className="flex items-center gap-1.5">
                  {r.icon && <r.icon className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />}
                  <span className="text-sm text-[var(--muted-foreground)]">{r.label}</span>
                </div>
                <span className={`text-sm font-medium ${r.alert ? "text-amber-600" : ""}`}>
                  {r.value}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {log.notes && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[var(--foreground)]">{log.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Signatures */}
      <Card>
        <CardContent className="p-6">
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
        </CardContent>
      </Card>
    </div>
  )
}
