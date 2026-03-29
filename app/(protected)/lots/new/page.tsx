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

export default function NewLotPage() {
  const router = useRouter()
  const supabase = createClient()
  const today = new Date().toISOString().split("T")[0]

  const [products, setProducts] = useState<any[]>([])
  const [form, setForm] = useState({
    lot_number: "",
    product_id: "",
    received_date: today,
    quantity_lbs: "",
    supplier: "",
    notes: "",
  })
  const [loading, setLoading] = useState(false)
  const [lotLoading, setLotLoading] = useState(true)

  useEffect(() => {
    const d = new Date()
    const prefix = `LOT-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}-`
    supabase
      .from("lots")
      .select("lot_number")
      .like("lot_number", `${prefix}%`)
      .order("lot_number", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        let seq = 1
        if (data && data.length > 0) {
          const last = data[0].lot_number as string
          const parts = last.split("-")
          const lastSeq = parseInt(parts[parts.length - 1], 10)
          if (!isNaN(lastSeq)) seq = lastSeq + 1
        }
        setForm((prev) => ({ ...prev, lot_number: `${prefix}${String(seq).padStart(3, "0")}` }))
        setLotLoading(false)
      })
  }, [])

  useEffect(() => {
    supabase.from("products").select("id, name, code").eq("is_active", true).then(({ data }) => {
      if (data) setProducts(data)
    })
  }, [])

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))

  const handleSubmit = async () => {
    if (!form.lot_number.trim()) { toast.error("Lot number is required"); return }
    if (!form.product_id) { toast.error("Select a product"); return }

    setLoading(true)
    const { data, error } = await supabase.from("lots").insert({
      lot_number: form.lot_number.trim(),
      product_id: form.product_id,
      received_date: form.received_date || null,
      quantity_lbs: form.quantity_lbs ? parseFloat(form.quantity_lbs) : null,
      supplier: form.supplier || null,
      notes: form.notes || null,
    }).select("id").single()

    setLoading(false)
    if (error) { toast.error(error.message); return }
    toast.success(`Lot ${form.lot_number} created`)
    router.push(`/lots/${data.id}`)
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold">New Raw Material Lot</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">Register an incoming raw material batch for traceability</p>
      </div>

      <div className="bg-white rounded-xl border border-[var(--border)] divide-y divide-[var(--border)]">
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2">
              <Label>Lot Number <span className="text-red-500">*</span></Label>
              <Input
                value={form.lot_number}
                onChange={(e) => set("lot_number", e.target.value)}
                placeholder={lotLoading ? "Generating…" : "LOT-2026-03-28-001"}
                className="font-mono"
                disabled={lotLoading}
              />
              <p className="text-xs text-[var(--muted-foreground)]">Auto-generated — edit if needed</p>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Product <span className="text-red-500">*</span></Label>
              <Select value={form.product_id} onValueChange={(v) => set("product_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select product..." /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Received Date</Label>
              <Input type="date" value={form.received_date} onChange={(e) => set("received_date", e.target.value)} max={today} />
            </div>
            <div className="space-y-1.5">
              <Label>Quantity (lbs)</Label>
              <Input type="number" step="0.01" min="0" value={form.quantity_lbs} onChange={(e) => set("quantity_lbs", e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Supplier / Vendor</Label>
              <Input value={form.supplier} onChange={(e) => set("supplier", e.target.value)} placeholder="Supplier name" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Any additional notes about this lot..." rows={3} />
            </div>
          </div>
        </div>

        <div className="p-6 flex items-center justify-between gap-3">
          <Button variant="outline" onClick={() => router.back()} type="button">Cancel</Button>
          <Button onClick={handleSubmit} loading={loading} disabled={lotLoading}>Create Lot</Button>
        </div>
      </div>
    </div>
  )
}
