"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { AlertTriangle, CheckCircle2, FlaskConical } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

export default function NewCalibrationPage() {
  const router = useRouter()
  const supabase = createClient()
  const today = new Date().toISOString().split("T")[0]

  const [form, setForm] = useState({
    date: today,
    thermometer_id: "",
    thermometer_type: "probe",
    ice_water_reading_f: "",
    corrective_action_taken: "",
    notes: "",
  })
  const [loading, setLoading] = useState(false)

  const reading = parseFloat(form.ice_water_reading_f)
  const isInTolerance = !isNaN(reading) && Math.abs(reading - 32) <= 2
  const outOfRange = !isNaN(reading) && Math.abs(reading - 32) > 2

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))

  const handleSave = async (status: "draft" | "submitted") => {
    if (!form.thermometer_id) { toast.error("Thermometer ID required"); return }
    if (!form.ice_water_reading_f) { toast.error("Reading required"); return }
    if (outOfRange && !form.corrective_action_taken && status === "submitted") {
      toast.error("Corrective action is required when reading is out of tolerance")
      return
    }

    setLoading(true)
    const supabaseClient = createClient()
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) { toast.error("Not authenticated"); setLoading(false); return }

    const { data, error } = await supabase
      .from("calibration_logs")
      .insert({
        date: form.date,
        thermometer_id: form.thermometer_id,
        thermometer_type: form.thermometer_type || null,
        ice_water_reading_f: parseFloat(form.ice_water_reading_f),
        corrective_action_taken: form.corrective_action_taken || null,
        notes: form.notes || null,
        created_by: user.id,
        status,
        submitted_at: status === "submitted" ? new Date().toISOString() : null,
      })
      .select("id")
      .single()

    setLoading(false)
    if (error) { toast.error(error.message); return }
    toast.success(status === "submitted" ? "Submitted" : "Draft saved")
    router.push(`/calibration/${data.id}`)
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold">New Thermometer Calibration</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">Ice water method · Reference 32°F ± 2°F tolerance</p>
      </div>

      <div className="bg-white rounded-xl border border-[var(--border)] divide-y divide-[var(--border)]">
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} max={today} />
            </div>
            <div className="space-y-1.5">
              <Label>Thermometer Type</Label>
              <Select value={form.thermometer_type} onValueChange={(v) => set("thermometer_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="probe">Probe</SelectItem>
                  <SelectItem value="infrared">Infrared</SelectItem>
                  <SelectItem value="digital">Digital</SelectItem>
                  <SelectItem value="analog">Analog</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Thermometer ID <span className="text-red-500">*</span></Label>
            <Input placeholder="e.g. THERM-001, Unit #3" value={form.thermometer_id} onChange={(e) => set("thermometer_id", e.target.value)} />
          </div>
        </div>

        <div className="p-6 space-y-4">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-[var(--muted-foreground)]">Ice Water Test</h2>
          <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 flex items-start gap-2">
            <FlaskConical className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Ice Water Method:</p>
              <p>Fill cup with ice and water. Insert thermometer. Wait 30 seconds. Reading must be 32°F ± 2°F (30–34°F).</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Thermometer Reading (°F) <span className="text-red-500">*</span></Label>
            <Input
              type="number" step="0.1" placeholder="Should be 30–34°F"
              value={form.ice_water_reading_f}
              onChange={(e) => set("ice_water_reading_f", e.target.value)}
              className={outOfRange ? "border-red-400" : isInTolerance ? "border-emerald-400" : ""}
            />
          </div>

          {!isNaN(reading) && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${isInTolerance ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
              {isInTolerance ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {isInTolerance
                ? `✓ Reading ${reading}°F is within tolerance (30–34°F)`
                : `✗ Reading ${reading}°F is OUT OF TOLERANCE — corrective action required`}
            </div>
          )}
        </div>

        {outOfRange && (
          <div className="p-6 space-y-2">
            <Label className="text-red-600">Corrective Action Taken <span className="text-red-500">*</span></Label>
            <Textarea
              placeholder="Describe what was done to correct or remove this thermometer from service..."
              value={form.corrective_action_taken}
              onChange={(e) => set("corrective_action_taken", e.target.value)}
              className="border-red-300"
            />
          </div>
        )}

        <div className="p-6 space-y-2">
          <Label>Notes</Label>
          <Textarea placeholder="Additional observations..." value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </div>

        <div className="p-6 flex items-center justify-between gap-3">
          <Button variant="outline" onClick={() => router.back()} type="button">Cancel</Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => handleSave("draft")} loading={loading} type="button">Save Draft</Button>
            <Button onClick={() => handleSave("submitted")} loading={loading} type="button">Submit</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
