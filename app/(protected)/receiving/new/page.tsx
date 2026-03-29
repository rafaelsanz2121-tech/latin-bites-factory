"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { AlertTriangle, CheckCircle2, Package, Thermometer } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"

export default function NewReceivingPage() {
  const router = useRouter()
  const supabase = createClient()
  const today = new Date().toISOString().split("T")[0]
  const now = new Date().toTimeString().slice(0, 5)

  const [products, setProducts] = useState<any[]>([])
  const [form, setForm] = useState({
    date: today,
    time_received: now,
    product_id: "",
    supplier: "",
    quantity_lbs: "",
    lot_batch_number: "",
    internal_temp_f: "",
    vehicle_temp_f: "",
    packaging_condition: "acceptable",
    labeling_ok: true,
    notes: "",
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from("products").select("id, name").eq("is_active", true).order("name").then(({ data }) => {
      if (data) setProducts(data)
    })
  }, [])

  const tempAlert = form.internal_temp_f && parseFloat(form.internal_temp_f) > 40
  const set = (k: string, v: string | boolean) => setForm((p) => ({ ...p, [k]: v }))

  const handleSave = async (status: "draft" | "submitted") => {
    if (!form.supplier.trim()) { toast.error("Supplier name required"); return }

    const supabaseClient = createClient()
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) { toast.error("Not authenticated"); return }

    setLoading(true)

    // Auto-create deviation if temp > 40°F
    const { data, error } = await supabase.from("receiving_logs").insert({
      date: form.date,
      time_received: form.time_received + ":00",
      product_id: form.product_id || null,
      supplier: form.supplier,
      quantity_lbs: form.quantity_lbs ? parseFloat(form.quantity_lbs) : null,
      internal_temp_f: form.internal_temp_f ? parseFloat(form.internal_temp_f) : null,
      vehicle_temp_f: form.vehicle_temp_f ? parseFloat(form.vehicle_temp_f) : null,
      packaging_condition: form.packaging_condition || null,
      labeling_ok: form.labeling_ok,
      notes: form.notes || null,
      created_by: user.id,
      status,
      submitted_at: status === "submitted" ? new Date().toISOString() : null,
    }).select("id").single()

    if (error) { toast.error(error.message); setLoading(false); return }

    // Auto-flag deviation for temperature violation
    if (status === "submitted" && form.internal_temp_f && parseFloat(form.internal_temp_f) > 40) {
      await supabase.from("deviations").insert({
        severity: parseFloat(form.internal_temp_f) > 50 ? "critical" : "major",
        status: "open",
        date_identified: form.date,
        identified_by: user.id,
        source_log_type: "receiving_logs",
        source_log_id: data.id,
        description: `Receiving temperature out of range: ${form.internal_temp_f}°F (limit: ≤40°F) — Supplier: ${form.supplier}`,
        immediate_action: "Product quarantined pending supervisor review",
      })
      toast.warning("Temperature deviation automatically flagged for review")
    }

    // Auto-flag deviation for packaging deficiency
    if (status === "submitted" && form.packaging_condition === "deficient") {
      await supabase.from("deviations").insert({
        severity: "minor",
        status: "open",
        date_identified: form.date,
        identified_by: user.id,
        source_log_type: "receiving_logs",
        source_log_id: data.id,
        description: `Packaging deficiency noted on receiving — Supplier: ${form.supplier}`,
      })
    }

    setLoading(false)
    toast.success(status === "submitted" ? "Receiving log submitted" : "Draft saved")
    router.push(`/receiving/${data.id}`)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold">New Receiving Log</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">Incoming product inspection · Establishment M/P2643</p>
      </div>

      <div className="bg-white rounded-xl border border-[var(--border)] divide-y divide-[var(--border)]">
        <div className="p-6 space-y-4">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-[var(--muted-foreground)]">Shipment Info</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} max={today} />
            </div>
            <div className="space-y-1.5">
              <Label>Time Received</Label>
              <Input type="time" value={form.time_received} onChange={(e) => set("time_received", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Supplier <span className="text-red-500">*</span></Label>
            <Input placeholder="Supplier or vendor name" value={form.supplier} onChange={(e) => set("supplier", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Product</Label>
              <Select value={form.product_id} onValueChange={(v) => set("product_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Quantity (lbs)</Label>
              <Input type="number" step="0.01" placeholder="e.g. 250.00" value={form.quantity_lbs} onChange={(e) => set("quantity_lbs", e.target.value)} />
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-[var(--muted-foreground)]">Temperature Check</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>
                <Thermometer className="w-3.5 h-3.5 inline mr-1" />
                Internal Product Temp (°F)
              </Label>
              <Input
                type="number" step="0.1" placeholder="≤40°F for refrigerated"
                value={form.internal_temp_f}
                onChange={(e) => set("internal_temp_f", e.target.value)}
                className={tempAlert ? "border-red-400" : ""}
              />
              {tempAlert && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Temperature exceeds 40°F — deviation will be flagged
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Vehicle/Transport Temp (°F)</Label>
              <Input type="number" step="0.1" placeholder="Transport temperature" value={form.vehicle_temp_f} onChange={(e) => set("vehicle_temp_f", e.target.value)} />
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-[var(--muted-foreground)]">Condition Check</h2>
          <div className="space-y-3">
            <div>
              <Label>Packaging Condition</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {[
                  { value: "acceptable", label: "Acceptable", icon: CheckCircle2, color: "border-emerald-400 bg-emerald-50" },
                  { value: "deficient", label: "Deficient", icon: AlertTriangle, color: "border-red-400 bg-red-50" },
                ].map((opt) => (
                  <button
                    key={opt.value} type="button"
                    onClick={() => set("packaging_condition", opt.value)}
                    className={`flex items-center gap-2 p-3 rounded-lg border-2 text-sm font-medium transition-colors ${form.packaging_condition === opt.value ? opt.color : "border-[var(--border)] hover:border-slate-300"}`}
                  >
                    <opt.icon className="w-4 h-4" />{opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox" id="labeling"
                checked={form.labeling_ok}
                onChange={(e) => set("labeling_ok", e.target.checked)}
                className="w-4 h-4 rounded border-[var(--border)]"
              />
              <Label htmlFor="labeling">Labeling and identification acceptable</Label>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-2">
          <Label>Notes</Label>
          <Textarea placeholder="Observations, issues, corrective actions..." value={form.notes} onChange={(e) => set("notes", e.target.value)} />
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
