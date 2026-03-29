import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDate, formatDateTime } from "@/lib/utils"
import { DeviationActionButtons } from "@/components/forms/DeviationActionButtons"
import { PrintButton } from "@/components/ui/PrintButton"

interface Props { params: Promise<{ id: string }> }

export default async function DeviationDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [{ data: profile }, { data: dev }, { data: capas }] = await Promise.all([
    supabase.from("profiles").select("id, role").eq("id", user.id).single(),
    supabase.from("deviations").select(`
      *, identifier:profiles!deviations_identified_by_fkey(full_name, initials),
      closer:profiles!deviations_closed_by_fkey(full_name, initials),
      areas(name)
    `).eq("id", id).single(),
    supabase.from("corrective_actions").select("id, status, action_description, due_date, capa_type").eq("deviation_id", id),
  ])

  if (!profile || !dev) notFound()

  const isCritical = dev.severity === "critical"

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <Link href="/deviations" className="flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-3">
          <ArrowLeft className="w-3.5 h-3.5" />Deviations
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Deviation Report</h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{formatDate(dev.date_identified)}</p>
          </div>
          <div className="flex items-center gap-2">
            <PrintButton module="deviation" id={id} />
            <Badge variant={dev.severity === "critical" ? "destructive" : dev.severity === "major" ? "warning" : "info"} className="uppercase">
              {dev.severity}
            </Badge>
            <Badge variant={dev.status === "closed" ? "success" : dev.status === "open" ? "destructive" : "warning"}>
              {dev.status.replace(/_/g, " ")}
            </Badge>
          </div>
        </div>
      </div>

      {isCritical && !dev.usda_notified && (
        <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-red-400 bg-red-50">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <div>
            <p className="font-semibold text-red-700">USDA Notification Required</p>
            <p className="text-sm text-red-600">This critical deviation requires USDA notification. Please update this record.</p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Deviation Details</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide mb-1">Description</p>
            <p className="text-sm">{dev.description}</p>
          </div>
          {dev.immediate_action && (
            <div>
              <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide mb-1">Immediate Action Taken</p>
              <p className="text-sm">{dev.immediate_action}</p>
            </div>
          )}
          {[
            { label: "Date Identified", value: formatDate(dev.date_identified) },
            { label: "Identified By", value: dev.identifier?.full_name || "—" },
            { label: "Area", value: dev.areas?.name || "—" },
            { label: "Source Log", value: dev.source_log_type ? dev.source_log_type.replace(/_logs?$/, "").replace(/_/g, " ") : "Manual" },
            { label: "USDA Notified", value: dev.severity === "critical" ? (dev.usda_notified ? `Yes – ${formatDate(dev.usda_notification_date)}` : "NOT YET NOTIFIED") : "N/A" },
          ].map((item) => (
            <div key={item.label} className="flex justify-between py-1.5 border-b border-[var(--border)] last:border-0">
              <span className="text-sm text-[var(--muted-foreground)]">{item.label}</span>
              <span className="text-sm font-medium">{item.value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Linked CAPAs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Corrective Actions</CardTitle>
            {profile.role !== "operator" && (
              <Link href={`/corrective-actions/new?deviation=${dev.id}`} className="text-xs text-blue-600 hover:underline">+ Add CAPA</Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!capas?.length ? (
            <p className="text-sm text-[var(--muted-foreground)] italic">No corrective actions linked yet.</p>
          ) : (
            <div className="space-y-2">
              {capas.map((capa: any) => (
                <Link key={capa.id} href={`/corrective-actions/${capa.id}`} className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)] hover:bg-[var(--muted)] transition-colors">
                  <div>
                    <p className="text-sm font-medium">{capa.action_description}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">Due: {formatDate(capa.due_date)} · {capa.capa_type}</p>
                  </div>
                  <Badge variant={capa.status === "closed" ? "success" : capa.status === "open" ? "destructive" : "warning"} className="text-xs">
                    {capa.status}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {dev.status === "closed" && dev.closure_notes && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Closure Notes</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm">{dev.closure_notes}</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-2">Closed by {dev.closer?.full_name} · {formatDateTime(dev.closed_at)}</p>
          </CardContent>
        </Card>
      )}

      {/* QA/Admin actions */}
      {["qa", "admin"].includes(profile.role) && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Actions</CardTitle></CardHeader>
          <CardContent>
            <DeviationActionButtons
              deviation={{ id: dev.id, status: dev.status, severity: dev.severity, usda_notified: dev.usda_notified }}
              currentUserId={user.id}
              currentUserRole={profile.role}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
