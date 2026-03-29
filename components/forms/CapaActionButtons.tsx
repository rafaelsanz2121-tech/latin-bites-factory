"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { CheckCircle, PlayCircle, ShieldCheck, X } from "lucide-react"

interface CapaActionButtonsProps {
  capa: { id: string; status: string; assigned_to: string }
  currentUserId: string
  currentUserRole: string
}

export function CapaActionButtons({ capa, currentUserId, currentUserRole }: CapaActionButtonsProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [showCompleteForm, setShowCompleteForm] = useState(false)
  const [showVerifyForm, setShowVerifyForm] = useState(false)
  const [completionNotes, setCompletionNotes] = useState("")
  const [verificationNotes, setVerificationNotes] = useState("")

  const isAssignee = capa.assigned_to === currentUserId
  const isQaOrAdmin = currentUserRole === "qa" || currentUserRole === "admin"
  const isSupervisorOrAbove = ["supervisor", "qa", "admin"].includes(currentUserRole)

  const handleStartProgress = async () => {
    setLoading(true)
    const { error } = await supabase
      .from("corrective_actions")
      .update({ status: "in_progress" })
      .eq("id", capa.id)
    setLoading(false)
    if (error) { toast.error(error.message); return }
    toast.success("CAPA marked as in progress")
    router.refresh()
  }

  const handleComplete = async () => {
    if (!completionNotes.trim()) { toast.error("Please describe what was done"); return }
    setLoading(true)
    const { error } = await supabase
      .from("corrective_actions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        completion_notes: completionNotes,
      })
      .eq("id", capa.id)
    setLoading(false)
    if (error) { toast.error(error.message); return }
    toast.success("CAPA marked as completed")
    setShowCompleteForm(false)
    router.refresh()
  }

  const handleVerifyEffective = async () => {
    if (!verificationNotes.trim()) { toast.error("Please describe how effectiveness was verified"); return }
    setLoading(true)
    const { error } = await supabase
      .from("corrective_actions")
      .update({
        status: "verified_effective",
        verified_effective_at: new Date().toISOString(),
        verified_effective_by: currentUserId,
        verification_notes: verificationNotes,
      })
      .eq("id", capa.id)
    setLoading(false)
    if (error) { toast.error(error.message); return }
    toast.success("CAPA verified as effective")
    setShowVerifyForm(false)
    router.refresh()
  }

  const handleClose = async () => {
    setLoading(true)
    const { data: capaData } = await supabase
      .from("corrective_actions")
      .select("deviation_id")
      .eq("id", capa.id)
      .single()

    const { error } = await supabase
      .from("corrective_actions")
      .update({ status: "closed" })
      .eq("id", capa.id)

    if (!error && capaData?.deviation_id) {
      // Check if all CAPAs for this deviation are closed
      const { data: openCapas } = await supabase
        .from("corrective_actions")
        .select("id")
        .eq("deviation_id", capaData.deviation_id)
        .neq("status", "closed")
        .neq("id", capa.id)

      if (!openCapas?.length) {
        await supabase
          .from("deviations")
          .update({ status: "closed" })
          .eq("id", capaData.deviation_id)
      }
    }

    setLoading(false)
    if (error) { toast.error(error.message); return }
    toast.success("CAPA closed")
    router.refresh()
  }

  if (capa.status === "closed") return null

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {/* Assignee: start progress */}
        {capa.status === "open" && isAssignee && (
          <Button variant="outline" size="sm" onClick={handleStartProgress} loading={loading}>
            <PlayCircle className="w-4 h-4" />Start Working
          </Button>
        )}

        {/* Assignee: mark complete */}
        {capa.status === "in_progress" && isAssignee && !showCompleteForm && (
          <Button size="sm" onClick={() => setShowCompleteForm(true)}>
            <CheckCircle className="w-4 h-4" />Mark Complete
          </Button>
        )}

        {/* QA/Admin: verify effectiveness */}
        {capa.status === "completed" && isQaOrAdmin && !showVerifyForm && (
          <Button size="sm" variant="outline" onClick={() => setShowVerifyForm(true)}>
            <ShieldCheck className="w-4 h-4" />Verify Effective
          </Button>
        )}

        {/* QA/Admin: close after verification */}
        {capa.status === "verified_effective" && isQaOrAdmin && (
          <Button size="sm" variant="success" onClick={handleClose} loading={loading}>
            <CheckCircle className="w-4 h-4" />Close CAPA
          </Button>
        )}
      </div>

      {/* Completion form */}
      {showCompleteForm && (
        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--muted)]/30 space-y-3">
          <p className="text-sm font-semibold">Describe what was done to complete this action:</p>
          <div className="space-y-1.5">
            <Label>Completion Notes <span className="text-red-500">*</span></Label>
            <Textarea
              placeholder="Describe the specific actions taken..."
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleComplete} loading={loading}>Submit</Button>
            <Button size="sm" variant="outline" onClick={() => setShowCompleteForm(false)}>
              <X className="w-3.5 h-3.5" />Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Verification form */}
      {showVerifyForm && (
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 space-y-3">
          <p className="text-sm font-semibold text-emerald-800">Verify that this corrective action was effective:</p>
          <div className="space-y-1.5">
            <Label>Verification Notes <span className="text-red-500">*</span></Label>
            <Textarea
              placeholder="How was effectiveness confirmed? (e.g., follow-up inspection, temperature checks...)"
              value={verificationNotes}
              onChange={(e) => setVerificationNotes(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleVerifyEffective} loading={loading}>Confirm Effective</Button>
            <Button size="sm" variant="outline" onClick={() => setShowVerifyForm(false)}>
              <X className="w-3.5 h-3.5" />Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
