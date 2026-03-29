"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

async function generateOrderNumber(supabase: ReturnType<typeof createClient>): Promise<string> {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  const prefix = `PO-${y}-${m}-${day}`

  const { data } = await supabase
    .from("production_orders")
    .select("order_number")
    .ilike("order_number", `${prefix}%`)
    .order("order_number", { ascending: false })
    .limit(1)

  let seq = 1
  if (data && data.length > 0) {
    const last = data[0].order_number as string
    const parts = last.split("-")
    const lastSeq = parseInt(parts[parts.length - 1], 10)
    if (!isNaN(lastSeq)) seq = lastSeq + 1
  }

  return `${prefix}-${String(seq).padStart(3, "0")}`
}

export default function NewProductionOrderPage() {
  const router = useRouter()
  const supabase = createClient()
  const today = new Date().toISOString().split("T")[0]

  const [clients, setClients] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [recipes, setRecipes] = useState<any[]>([])
  const [lots, setLots] = useState<any[]>([])

  const [form, setForm] = useState({
    client_id: "",
    product_id: "",
    recipe_id: "",
    lot_id: "",
    quantity_lbs: "",
    order_date: today,
    scheduled_date: "",
    notes: "",
  })
  const [loading, setLoading] = useState(false)

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))

  // Load clients and products on mount
  useEffect(() => {
    supabase
      .from("clients")
      .select("id, company_name")
      .order("company_name")
      .then(({ data }) => {
        if (data) setClients(data)
      })

    supabase
      .from("products")
      .select("id, name, code")
      .order("name")
      .then(({ data }) => {
        if (data) setProducts(data)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // When client changes: reload recipes for that client (filtered further if product selected)
  useEffect(() => {
    if (!form.client_id) {
      setRecipes([])
      set("recipe_id", "")
      return
    }
    let query = supabase
      .from("recipes")
      .select("id, recipe_name, product_id")
      .eq("client_id", form.client_id)
      .order("recipe_name")

    if (form.product_id) {
      query = query.eq("product_id", form.product_id)
    }

    query.then(({ data }) => {
      setRecipes(data || [])
      set("recipe_id", "")
    })
  }, [form.client_id, form.product_id]) // eslint-disable-line react-hooks/exhaustive-deps

  // When product changes: reload lots for that product
  useEffect(() => {
    if (!form.product_id) {
      setLots([])
      set("lot_id", "")
      return
    }
    supabase
      .from("lots")
      .select("id, lot_number")
      .eq("product_id", form.product_id)
      .order("lot_number", { ascending: false })
      .then(({ data }) => {
        setLots(data || [])
        set("lot_id", "")
      })
  }, [form.product_id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async () => {
    if (!form.client_id) {
      toast.error("Select a client")
      return
    }
    if (!form.product_id) {
      toast.error("Select a product")
      return
    }
    if (!form.quantity_lbs || parseFloat(form.quantity_lbs) <= 0) {
      toast.error("Enter a valid quantity")
      return
    }

    setLoading(true)
    try {
      const orderNumber = await generateOrderNumber(supabase)

      const { data, error } = await supabase
        .from("production_orders")
        .insert({
          order_number: orderNumber,
          client_id: form.client_id,
          product_id: form.product_id,
          recipe_id: form.recipe_id || null,
          lot_id: form.lot_id || null,
          quantity_lbs: parseFloat(form.quantity_lbs),
          order_date: form.order_date || null,
          scheduled_date: form.scheduled_date || null,
          notes: form.notes || null,
          status: "planned",
        })
        .select("id")
        .single()

      if (error) {
        toast.error(error.message)
        return
      }

      toast.success(`Order ${orderNumber} created`)
      router.push(`/production/${data.id}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold">New Production Order</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
          Schedule a new production run for a client
        </p>
      </div>

      <div className="bg-white rounded-xl border border-[var(--border)] divide-y divide-[var(--border)]">
        <div className="p-6 space-y-4">
          {/* Client */}
          <div className="space-y-1.5">
            <Label>
              Client <span className="text-red-500">*</span>
            </Label>
            <Select
              value={form.client_id}
              onValueChange={(v) => set("client_id", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select client..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Product */}
          <div className="space-y-1.5">
            <Label>
              Product <span className="text-red-500">*</span>
            </Label>
            <Select
              value={form.product_id}
              onValueChange={(v) => set("product_id", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select product..." />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                    {p.code ? ` (${p.code})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Recipe (optional) */}
          <div className="space-y-1.5">
            <Label>Recipe</Label>
            <Select
              value={form.recipe_id}
              onValueChange={(v) => set("recipe_id", v)}
              disabled={!form.client_id}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    form.client_id
                      ? "Select recipe (optional)..."
                      : "Select a client first"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {recipes.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.recipe_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Raw Material Lot (optional) */}
          <div className="space-y-1.5">
            <Label>Raw Material Lot</Label>
            <Select
              value={form.lot_id}
              onValueChange={(v) => set("lot_id", v)}
              disabled={!form.product_id}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    form.product_id
                      ? "Select lot (optional)..."
                      : "Select a product first"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {lots.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.lot_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity */}
          <div className="space-y-1.5">
            <Label>
              Quantity (lbs) <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.quantity_lbs}
              onChange={(e) => set("quantity_lbs", e.target.value)}
              placeholder="0.00"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Order Date</Label>
              <Input
                type="date"
                value={form.order_date}
                onChange={(e) => set("order_date", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Scheduled Production Date</Label>
              <Input
                type="date"
                value={form.scheduled_date}
                onChange={(e) => set("scheduled_date", e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Any production notes or special instructions..."
              rows={3}
            />
          </div>
        </div>

        <div className="p-6 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => router.back()}
            type="button"
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Creating..." : "Create Order"}
          </Button>
        </div>
      </div>
    </div>
  )
}
