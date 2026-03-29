import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, CheckCircle, XCircle, Clock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LogStatusBadge } from "@/components/logs/LogStatusBadge"
import { SignatureBlock } from "@/components/logs/SignatureBlock"
import { GenericActionButtons } from "@/components/forms/GenericActionButtons"
import { formatDate } from "@/lib/utils"
import { PrintButton } from "@/components/ui/PrintButton"

interface Props { params: Promise<{ id: string }> }

const CHECK_LABELS: Record<string, string> = {
  receiving_logs_reviewed: "Receiving logs reviewed",
  thawing_logs_reviewed: "Thawing logs reviewed",
  cooking_logs_reviewed: "Cooking/chilling CCP logs reviewed",
  calibration_logs_reviewed: "Thermometer calibration logs reviewed",
  sanitation_logs_reviewed: "Sanitation logs reviewed",
  deviations_reviewed: "All open deviations reviewed",
  labels_verified: "Product labels verified",
  temperature_verified: "Product temperature verified",
  packaging_integrity: "Packaging integrity confirmed",
  lot_traceability: "Lot traceability complete",
}

export default async function PreshipmentDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [{ data: profile }, { data: review }] = await Promise.all([
    supabase.from("profiles").select("id, role").eq("id", user.id).single(),
    supabase.from("preshipment_reviews").select(`
      *,
      lot:lots(lot_number, products(name)),
      creator:profiles!preshipment_reviews_created_by_fkey(id, full_name, initials),
      verifier:profiles!preshipment_reviews_verified_by_fkey(full_name),
      approver:profiles!preshipment_reviews_approved_by_fkey(full_name)
    `).eq("id", id).single(),
  ])

  if (!profile || !review) notFound()

  const checks: Record<string, boolean | null> = review.checks || {}

  const dispositionConfig = {
    approved_for_shipment: { label: "Approved for Shipment", icon: CheckCircle, className: "text-emerald-700 bg-emerald-50 border-emerald-200" },
    hold: { label: "Hold — Pending Review", icon: Clock, className: "text-orange-700 bg-orange-50 border-orange-200" },
    rejected: { label: "Rejected / Destroy", icon: XCircle, className: "text-red-700 bg-red-50 border-red-200" },
  }
  const disp = dispositionConfig[review.disposition as keyof typeof dispositionConfig]

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <Link href="/preshipment" className="flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-3">
          <ArrowLeft className="w-3.5 h-3.5" />Pre-Shipment Reviews
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Pre-Shipment Review</h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{formatDate(review.review_date)}</p>
          </div>
          <div className="flex items-center gap-2">
            <PrintButton module="preshipment" id={id} />
            <LogStatusBadge status={review.status} />
          </div>
        </div>
      </div>

      <GenericActionButtons
        log={{ id: review.id, status: review.status, created_by: review.created_by }}
        currentUserId={user.id}
        currentUserRole={profile.role}
        tableName="preshipment_reviews"
      />

      {/* Disposition */}
      {disp && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border-2 ${disp.className}`}>
          <disp.icon className="w-5 h-5" />
          <p className="font-semibold">{disp.label}</p>
        </div>
      )}

      {/* Lot info */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Product Lot</CardTitle></CardHeader>
        <CardContent>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--muted-foreground)]">Lot Number</span>
            <span className="font-mono font-semibold">{review.lot?.lot_number || "—"}</span>
          </div>
          <div className="flex justify-between text-sm mt-2">
            <span className="text-[var(--muted-foreground)]">Product</span>
            <span className="font-medium">{review.lot?.products?.name || "—"}</span>
          </div>
        </CardContent>
      </Card>

      {/* Checklist */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Pre-Shipment Checklist</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(checks).map(([key, val]) => (
              <div key={key} className="flex items-center justify-between py-1.5 border-b border-[var(--border)] last:border-0">
                <span className="text-sm">{CHECK_LABELS[key] || key}</span>
                {val === true ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                ) : val === false ? (
                  <XCircle className="w-4 h-4 text-red-600" />
                ) : (
                  <span className="text-xs text-[var(--muted-foreground)]">—</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {review.notes && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Notes / Justification</CardTitle></CardHeader>
          <CardContent><p className="text-sm">{review.notes}</p></CardContent>
        </Card>
      )}

      <SignatureBlock
        status={review.status}
        creator={review.creator}
        submittedAt={review.submitted_at}
        verifier={review.verifier}
        verifiedAt={review.verified_at}
        approver={review.approver}
        approvedAt={review.approved_at}
        lockedAt={review.locked_at}
      />
    </div>
  )
}
