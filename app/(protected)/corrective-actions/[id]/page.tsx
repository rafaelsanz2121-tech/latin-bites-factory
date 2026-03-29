import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CapaActionButtons } from "@/components/forms/CapaActionButtons"
import { formatDate, formatDateTime } from "@/lib/utils"
import { PrintButton } from "@/components/ui/PrintButton"

interface Props { params: Promise<{ id: string }> }

export default async function CapaDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [{ data: profile }, { data: capa }] = await Promise.all([
    supabase.from("profiles").select("id, role").eq("id", user.id).single(),
    supabase.from("corrective_actions").select(`
      *,
      assignee:profiles!corrective_actions_assigned_to_fkey(id, full_name, initials),
      assigner:profiles!corrective_actions_assigned_by_fkey(full_name),
      verifier:profiles!corrective_actions_verified_effective_by_fkey(full_name),
      deviation:deviations(id, severity, description)
    `).eq("id", id).single(),
  ])

  if (!profile || !capa) notFound()

  const today = new Date().toISOString().split("T")[0]
  const isOverdue = capa.status !== "closed" && capa.due_date < today

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <Link href="/corrective-actions" className="flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-3">
          <ArrowLeft className="w-3.5 h-3.5" />Corrective Actions
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{capa.capa_type === "corrective" ? "🔧" : "🛡️"} {capa.capa_type === "corrective" ? "Corrective" : "Preventive"} Action</h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-0.5">Opened {formatDate(capa.date_opened)}</p>
          </div>
          <div className="flex items-center gap-2">
            <PrintButton module="corrective-action" id={id} />
            {isOverdue && <Badge variant="destructive">OVERDUE</Badge>}
            <Badge variant={capa.status === "closed" ? "success" : capa.status === "open" ? "warning" : "info"}>
              {capa.status.replace(/_/g, " ")}
            </Badge>
          </div>
        </div>
      </div>

      <CapaActionButtons capa={{ id: capa.id, status: capa.status, assigned_to: capa.assigned_to }} currentUserId={user.id} currentUserRole={profile.role} />

      {capa.deviation && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <Link href={`/deviations/${capa.deviation.id}`} className="flex items-start gap-3 hover:opacity-80">
              <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-orange-700">Linked Deviation ({capa.deviation.severity})</p>
                <p className="text-sm text-orange-600">{capa.deviation.description}</p>
              </div>
            </Link>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Action Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide mb-1">Root Cause</p>
            <p className="text-sm">{capa.root_cause}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide mb-1">Action Description</p>
            <p className="text-sm">{capa.action_description}</p>
          </div>
          {capa.preventive_measure && (
            <div>
              <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide mb-1">Preventive Measure</p>
              <p className="text-sm">{capa.preventive_measure}</p>
            </div>
          )}
          {[
            { label: "Assigned To", value: capa.assignee?.full_name || "—" },
            { label: "Assigned By", value: capa.assigner?.full_name || "—" },
            { label: "Due Date", value: formatDate(capa.due_date) },
          ].map((item) => (
            <div key={item.label} className="flex justify-between py-1.5 border-b border-[var(--border)] last:border-0">
              <span className="text-sm text-[var(--muted-foreground)]">{item.label}</span>
              <span className="text-sm font-medium">{item.value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {capa.completed_at && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Completion</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm">{capa.completion_notes}</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-2">{formatDateTime(capa.completed_at)}</p>
          </CardContent>
        </Card>
      )}

      {capa.verified_effective_at && (
        <Card className="border-emerald-200">
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Verified Effective</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm">{capa.verification_notes}</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-2">By {capa.verifier?.full_name} · {formatDateTime(capa.verified_effective_at)}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
