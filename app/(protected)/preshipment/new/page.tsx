"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { CheckCircle, XCircle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

const CHECK_ITEMS = [
  { key: "receiving_logs_reviewed", label: "Receiving logs reviewed" },
  { key: "thawing_logs_reviewed", label: "Thawing logs reviewed" },
  { key: "cooking_logs_reviewed", label: "Cooking/chilling CCP logs reviewed" },
  { key: "calibration_logs_reviewed", label: "Thermometer calibration logs reviewed" },
  { key: "sanitation_logs_reviewed", label: "Sanitation logs reviewed" },
  { key: "deviations_reviewed", label: "All open deviations reviewed" },
  { key: "labels_verified", label: "Product labels verified" },
  { key: "temperature_verified", label: "Product temperature verified" },
  { key: "packaging_integrity", label: "Packaging integrity confirmed" },
  { key: "lot_traceability", label: "Lot traceability complete" },
]

type CheckState = Record<string, boolean | null>

export default function NewPreshipmentPage() {
  const router = useRouter()
  const supabase = createClient()
  const today = new Date().toISOString().split("T")[0]

  const [lots, setLots] = useState<any[]>([])
  const [form, setForm] = useState({
    review_date: today,
    lot_id: "",
    disposition: "",
    notes: "",
  })
  const [checks, setChecks] = useState<CheckState>(
    Object.fromEntries(CHECK_ITEMS.map((c) => [c.key, null]))
  )
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase
      .from("lots")
      .select("id, lot_number, products(name)")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => { if (data) setLots(data) })
  }, [])

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))
  const setCheck = (key: string, val: boolean) => setChecks((p) => ({ ...p, [key]: p[key] === val ? null : val }))

  const allChecksCompleted = Object.values(checks).every((v) => v !== null)
  const hasFailedChecks = Object.values(checks).some((v) => v === false)

  const handleSubmit = async (submitForVerification: boolean) => {
    if (!form.lot_id) { toast.error("Select a lot"); return }
    if (!form.disposition) { toast.error("Select a disposition"); return }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error("Not authenticated"); return }

    setLoading(true)
    const { data, error } = await supabase.from("preshipment_reviews").insert({
      review_date: form.review_date,
      lot_id: form.lot_id,
      disposition: form.disposition,
      notes: form.notes || null,
      checks: checks,
      status: submitForVerification ? "submitted" : "draft",
      created_by: user.id,
      submitted_at: submitForVerification ? new Date().toISOString() : null,
      submitted_by: submitForVerification ? user.id : null,
    }).select("id").single()

    setLoading(false)
    if (error) { toast.error(error.message); return }
    toast.success(submitForVerification ? "Review submitted for approval" : "Review saved as draft")
    router.push(`/preshipment/${data.id}`)
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Pre-Shipment Review</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">Final product review before release for shipment</p>
      </div>

      <div className="bg-white rounded-xl border border-[var(--border)] divide-y divide-[var(--border)]">
        {/* Header fields */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Review Date</Label>
              <Input type="date" value={form.review_date} onChange={(e) => set("review_date", e.target.value)} max={today} />
            </div>
            <div className="space-y-1.5">
              <Label>Lot <span className="text-red-500">*</span></Label>
              <Select value={form.lot_id} onValueChange={(v) => set("lot_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select lot..." /></SelectTrigger>
                <SelectContent>
                  {lots.map((lot: any) => (
                    <SelectItem key={lot.id} value={lot.id}>{lot.lot_number} — {lot.products?.name || "Unknown"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Checklist */}
        <div className="p-6 space-y-3">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-[var(--muted-foreground)]">Pre-Shipment Checklist</h2>
          {CHECK_ITEMS.map((item) => (
            <div key={item.key} className="flex items-center justify-between py-1">
              <span className="text-sm">{item.label}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCheck(item.key, true)}
                  className={cn("flex items-center gap-1 px-2.5 py-1 rounded border text-xs font-medium transition-colors", checks[item.key] === true ? "bg-emerald-100 text-emerald-700 border-emerald-400" : "border-[var(--border)] text-[var(--muted-foreground)] hover:bg-emerald-50")}
                >
                  <CheckCircle className="w-3.5 h-3.5" />Yes
                </button>
                <button
                  type="button"
                  onClick={() => setCheck(item.key, false)}
                  className={cn("flex items-center gap-1 px-2.5 py-1 rounded border text-xs font-medium transition-colors", checks[item.key] === false ? "bg-red-100 text-red-700 border-red-400" : "border-[var(--border)] text-[var(--muted-foreground)] hover:bg-red-50")}
                >
                  <XCircle className="w-3.5 h-3.5" />No
                </button>
              </div>
            </div>
          ))}
          {!allChecksCompleted && (
            <p className="text-xs text-[var(--muted-foreground)] italic">Complete all checklist items before submitting</p>
          )}
          {hasFailedChecks && (
            <div className="p-3 rounded-lg bg-orange-50 border border-orange-200 text-sm text-orange-700">
              One or more items did not pass. Document findings in the notes and select appropriate disposition.
            </div>
          )}
        </div>

        {/* Disposition */}
        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <Label>Disposition <span className="text-red-500">*</span></Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "approved_for_shipment", label: "Approved for Shipment", icon: CheckCircle, color: "emerald" },
                { value: "hold", label: "Hold — Pending Review", icon: Clock, color: "orange" },
                { value: "rejected", label: "Rejected / Destroy", icon: XCircle, color: "red" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set("disposition", opt.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-lg border text-xs font-medium transition-colors text-center",
                    form.disposition === opt.value
                      ? `bg-${opt.color}-50 border-${opt.color}-400 text-${opt.color}-700`
                      : "border-[var(--border)] hover:bg-[var(--muted)]"
                  )}
                >
                  <opt.icon className="w-5 h-5" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes / Justification</Label>
            <Textarea placeholder="Document any deviations, hold reasons, or release justification..." value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>

        <div className="p-6 flex items-center justify-between gap-3">
          <Button variant="outline" onClick={() => router.back()} type="button">Cancel</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleSubmit(false)} loading={loading} type="button">Save Draft</Button>
            <Button onClick={() => handleSubmit(true)} loading={loading} type="button">Submit Review</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
