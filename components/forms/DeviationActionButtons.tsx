"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { CheckCircle2, X, ShieldAlert, RotateCcw } from "lucide-react"

interface Props {
  deviation: {
    id: string
    status: string
    severity: string
    usda_notified: boolean
  }
  currentUserId: string
  currentUserRole: string
}

export function DeviationActionButtons({ deviation, currentUserId, currentUserRole }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [showCloseForm, setShowCloseForm] = useState(false)
  const [showUsdaForm, setShowUsdaForm] = useState(false)
  const [closureNotes, setClosureNotes] = useState("")
  const [usdaDate, setUsdaDate] = useState(new Date().toISOString().split("T")[0])

  const canClose = ["qa", "admin"].includes(currentUserRole) && deviation.status !== "closed"
  const canMarkUsda = ["qa", "admin"].includes(currentUserRole) &&
    deviation.severity === "critical" && !deviation.usda_notified

  const handleClose = async () => {
    if (!closureNotes.trim()) { toast.error("Closure notes are required"); return }
    setLoading(true)
    const { error } = await supabase
      .from("deviations")
      .update({
        status: "closed",
        closed_by: currentUserId,
        closed_at: new Date().toISOString(),
        closure_notes: closureNotes.trim(),
      })
      .eq("id", deviation.id)
    setLoading(false)
    if (error) { toast.error(error.message); return }
    toast.success("Deviation closed")
    setShowCloseForm(false)
    router.refresh()
  }

  const handleMarkUsda = async () => {
    setLoading(true)
    const { error } = await supabase
      .from("deviations")
      .update({
        usda_notified: true,
        usda_notification_date: usdaDate,
      })
      .eq("id", deviation.id)
    setLoading(false)
    if (error) { toast.error(error.message); return }
    toast.success("USDA notification recorded")
    setShowUsdaForm(false)
    router.refresh()
  }

  const handleReopen = async () => {
    if (!["admin"].includes(currentUserRole)) return
    setLoading(true)
    const { error } = await supabase
      .from("deviations")
      .update({
        status: "under_review",
        closed_by: null,
        closed_at: null,
        closure_notes: null,
      })
      .eq("id", deviation.id)
    setLoading(false)
    if (error) { toast.error(error.message); return }
    toast.success("Deviation reopened")
    router.refresh()
  }

  if (!canClose && !canMarkUsda && deviation.status === "closed") {
    return null
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {canMarkUsda && (
          <Button
            variant="warning"
            size="sm"
            onClick={() => { setShowUsdaForm(true); setShowCloseForm(false) }}
          >
            <ShieldAlert className="w-4 h-4" />
            Mark USDA Notified
          </Button>
        )}
        {canClose && (
          <Button
            variant="success"
            size="sm"
            onClick={() => { setShowCloseForm(true); setShowUsdaForm(false) }}
          >
            <CheckCircle2 className="w-4 h-4" />
            Close Deviation
          </Button>
        )}
        {deviation.status === "closed" && currentUserRole === "admin" && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleReopen}
            loading={loading}
          >
            <RotateCcw className="w-4 h-4" />
            Reopen
          </Button>
        )}
      </div>

      {/* USDA notification form */}
      {showUsdaForm && (
        <div className="p-4 rounded-xl border-2 border-amber-300 bg-amber-50 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-amber-800 text-sm">Record USDA Notification</p>
            <button onClick={() => setShowUsdaForm(false)}><X className="w-4 h-4 text-amber-600" /></button>
          </div>
          <div className="space-y-1.5">
            <Label className="text-amber-800">Notification Date</Label>
            <input
              type="date"
              value={usdaDate}
              onChange={(e) => setUsdaDate(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-amber-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="warning" onClick={handleMarkUsda} loading={loading}>
              Confirm USDA Notified
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowUsdaForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Close deviation form */}
      {showCloseForm && (
        <div className="p-4 rounded-xl border-2 border-emerald-300 bg-emerald-50 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-emerald-800 text-sm">Close Deviation</p>
            <button onClick={() => setShowCloseForm(false)}><X className="w-4 h-4 text-emerald-600" /></button>
          </div>
          <div className="space-y-1.5">
            <Label className="text-emerald-800">Closure Notes <span className="text-red-500">*</span></Label>
            <Textarea
              value={closureNotes}
              onChange={(e) => setClosureNotes(e.target.value)}
              placeholder="Describe how this deviation was resolved, root cause confirmed, and any preventive measures taken..."
              rows={3}
              className="border-emerald-300 focus:ring-emerald-400"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="success" onClick={handleClose} loading={loading}>
              Confirm Close
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowCloseForm(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  )
}
