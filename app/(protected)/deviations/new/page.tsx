"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { AlertTriangle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

export default function NewDeviationPage() {
  const router = useRouter()
  const supabase = createClient()
  const today = new Date().toISOString().split("T")[0]

  const [form, setForm] = useState({
    date_identified: today,
    severity: "minor",
    description: "",
    immediate_action: "",
    usda_notified: false,
    usda_notification_date: "",
  })
  const [loading, setLoading] = useState(false)

  const set = (k: string, v: string | boolean) => setForm((p) => ({ ...p, [k]: v }))
  const isCritical = form.severity === "critical"

  const handleSubmit = async () => {
    if (!form.description.trim()) { toast.error("Description required"); return }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error("Not authenticated"); return }

    setLoading(true)
    const { data, error } = await supabase.from("deviations").insert({
      severity: form.severity,
      status: "open",
      date_identified: form.date_identified,
      identified_by: user.id,
      description: form.description,
      immediate_action: form.immediate_action || null,
      usda_notified: form.usda_notified,
      usda_notification_date: form.usda_notified && form.usda_notification_date ? form.usda_notification_date : null,
    }).select("id").single()

    setLoading(false)
    if (error) { toast.error(error.message); return }
    toast.success("Deviation flagged")
    router.push(`/deviations/${data.id}`)
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Flag Deviation</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">Document a food safety or operational deviation requiring corrective action</p>
      </div>

      <div className="bg-white rounded-xl border border-[var(--border)] divide-y divide-[var(--border)]">
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Date Identified</Label>
              <Input type="date" value={form.date_identified} onChange={(e) => set("date_identified", e.target.value)} max={today} />
            </div>
            <div className="space-y-1.5">
              <Label>Severity <span className="text-red-500">*</span></Label>
              <Select value={form.severity} onValueChange={(v) => set("severity", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">🔴 Critical</SelectItem>
                  <SelectItem value="major">🟠 Major</SelectItem>
                  <SelectItem value="minor">🟡 Minor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isCritical && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Critical Deviation</p>
                <p>This may require USDA notification. Document all details and immediate actions taken.</p>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <Label>Description <span className="text-red-500">*</span></Label>
            <Textarea
              placeholder="Describe what happened, where, what product or area was affected..."
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Immediate Action Taken</Label>
            <Textarea
              placeholder="What was done immediately to contain the issue?"
              value={form.immediate_action}
              onChange={(e) => set("immediate_action", e.target.value)}
            />
          </div>
        </div>

        {isCritical && (
          <div className="p-6 space-y-4">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-[var(--muted-foreground)]">USDA Notification</h2>
            <div className="flex items-center gap-3">
              <input
                type="checkbox" id="usda"
                checked={form.usda_notified}
                onChange={(e) => set("usda_notified", e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <Label htmlFor="usda">USDA has been notified of this critical deviation</Label>
            </div>
            {form.usda_notified && (
              <div className="space-y-1.5">
                <Label>USDA Notification Date</Label>
                <Input type="date" value={form.usda_notification_date} onChange={(e) => set("usda_notification_date", e.target.value)} />
              </div>
            )}
          </div>
        )}

        <div className="p-6 flex items-center justify-between gap-3">
          <Button variant="outline" onClick={() => router.back()} type="button">Cancel</Button>
          <Button variant="destructive" onClick={handleSubmit} loading={loading} type="button">
            <AlertTriangle className="w-4 h-4" />Flag Deviation
          </Button>
        </div>
      </div>
    </div>
  )
}
