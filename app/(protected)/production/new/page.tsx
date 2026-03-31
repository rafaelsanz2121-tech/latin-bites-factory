"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { TermTip } from "@/components/ui/TermTip"
import { toast } from "sonner"
import { Building2, ChevronDown, ChevronUp, Flame, Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"

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

const EMPTY_CLIENT = { company_name: "", contact_name: "", phone: "", email: "", address: "" }

export default function NewProductionOrderPage() {
  const router = useRouter()
  const supabase = createClient()
  const today = new Date().toISOString().split("T")[0]

  const [clients, setClients]   = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [recipes, setRecipes]   = useState<any[]>([])
  const [lots, setLots]         = useState<any[]>([])
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null)

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

  // New client inline form
  const [showNewClient, setShowNewClient] = useState(false)
  const [clientForm, setClientForm] = useState(EMPTY_CLIENT)
  const [savingClient, setSavingClient] = useState(false)

  const [loading, setLoading] = useState(false)

  const set    = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))
  const setC   = (k: string, v: string) => setClientForm((p) => ({ ...p, [k]: v }))

  // Load clients and products
  useEffect(() => {
    supabase.from("clients").select("id, company_name").order("company_name")
      .then(({ data }) => { if (data) setClients(data) })
    supabase.from("products").select("id, name, code").order("name")
      .then(({ data }) => { if (data) setProducts(data) })
  }, []) // eslint-disable-line

  // Load recipes when client or product changes
  useEffect(() => {
    if (!form.client_id) { setRecipes([]); set("recipe_id", ""); setSelectedRecipe(null); return }
    let query = supabase.from("recipes")
      .select("id, recipe_name, product_id, oven_temp_f, oven_duration_minutes, cooking_notes, seasoning_notes")
      .eq("client_id", form.client_id)
      .eq("is_active", true)
      .order("recipe_name")
    if (form.product_id) query = query.eq("product_id", form.product_id)
    query.then(({ data }) => { setRecipes(data || []); set("recipe_id", ""); setSelectedRecipe(null) })
  }, [form.client_id, form.product_id]) // eslint-disable-line

  // Load lots when product changes
  useEffect(() => {
    if (!form.product_id) { setLots([]); set("lot_id", ""); return }
    supabase.from("lots").select("id, lot_number").eq("product_id", form.product_id)
      .order("lot_number", { ascending: false })
      .then(({ data }) => { setLots(data || []); set("lot_id", "") })
  }, [form.product_id]) // eslint-disable-line

  // When recipe selected, show its oven config
  const handleRecipeChange = (id: string) => {
    set("recipe_id", id)
    const r = recipes.find((r) => r.id === id)
    setSelectedRecipe(r || null)
  }

  // Save new client inline
  const handleSaveClient = async () => {
    if (!clientForm.company_name.trim()) { toast.error("El nombre de la empresa es requerido"); return }
    setSavingClient(true)
    const { data, error } = await supabase
      .from("clients")
      .insert({
        company_name: clientForm.company_name.trim(),
        contact_name: clientForm.contact_name || null,
        phone: clientForm.phone || null,
        email: clientForm.email || null,
        address: clientForm.address || null,
        is_active: true,
      })
      .select("id, company_name")
      .single()
    setSavingClient(false)
    if (error) { toast.error(error.message); return }

    toast.success(`Cliente "${data.company_name}" creado ✓`)
    setClients((prev) => [...prev, data].sort((a, b) => a.company_name.localeCompare(b.company_name)))
    set("client_id", data.id)
    setClientForm(EMPTY_CLIENT)
    setShowNewClient(false)
  }

  const handleSubmit = async () => {
    if (!form.client_id)  { toast.error("Selecciona un cliente"); return }
    if (!form.product_id) { toast.error("Selecciona un producto"); return }
    if (!form.quantity_lbs || parseFloat(form.quantity_lbs) <= 0) { toast.error("Ingresa una cantidad válida"); return }

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

      if (error) { toast.error(error.message); return }
      toast.success(`Orden ${orderNumber} creada ✓`)
      router.push(`/production/${data.id}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Nueva Orden de Producción</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5 flex items-center gap-1">
          Programa una nueva corrida de producción para un cliente
          <TermTip term="production_order" />
        </p>
      </div>

      <div className="bg-white rounded-xl border border-[var(--border)] divide-y divide-[var(--border)]">
        <div className="p-6 space-y-4">

          {/* ── Cliente ── */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1">
                Cliente <span className="text-red-500">*</span>
                <TermTip term="recipe" side="right" />
              </Label>
              <button
                type="button"
                onClick={() => setShowNewClient((p) => !p)}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                {showNewClient ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                {showNewClient ? "Cancelar" : "Nuevo cliente"}
              </button>
            </div>

            <Select value={form.client_id} onValueChange={(v) => set("client_id", v)} disabled={showNewClient}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar cliente..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <Building2 className="w-3.5 h-3.5 inline mr-1.5 text-[var(--muted-foreground)]" />
                    {c.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Inline new client form */}
            {showNewClient && (
              <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3 space-y-3 mt-1">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Nuevo Cliente</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1 col-span-2">
                    <Label className="text-xs">Nombre de la empresa <span className="text-red-500">*</span></Label>
                    <Input
                      value={clientForm.company_name}
                      onChange={(e) => setC("company_name", e.target.value)}
                      placeholder="Ej. Latino Foods Co."
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Contacto</Label>
                    <Input value={clientForm.contact_name} onChange={(e) => setC("contact_name", e.target.value)} placeholder="Nombre" className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Teléfono</Label>
                    <Input value={clientForm.phone} onChange={(e) => setC("phone", e.target.value)} placeholder="(555) 000-0000" className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Email</Label>
                    <Input type="email" value={clientForm.email} onChange={(e) => setC("email", e.target.value)} placeholder="correo@empresa.com" className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Dirección</Label>
                    <Input value={clientForm.address} onChange={(e) => setC("address", e.target.value)} placeholder="Ciudad, Estado" className="h-8 text-sm" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setClientForm(EMPTY_CLIENT); setShowNewClient(false) }}>
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleSaveClient} disabled={savingClient}>
                    {savingClient ? "Guardando…" : "Crear cliente"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* ── Producto ── */}
          <div className="space-y-1.5">
            <Label>Producto <span className="text-red-500">*</span></Label>
            <Select value={form.product_id} onValueChange={(v) => set("product_id", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar producto..." />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}{p.code ? ` (${p.code})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ── Receta ── */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1">
              Receta del Cliente
              <TermTip term="recipe" />
            </Label>
            <Select value={form.recipe_id} onValueChange={handleRecipeChange} disabled={!form.client_id}>
              <SelectTrigger>
                <SelectValue placeholder={form.client_id ? "Seleccionar receta (opcional)..." : "Selecciona un cliente primero"} />
              </SelectTrigger>
              <SelectContent>
                {recipes.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.recipe_name}
                    {r.oven_temp_f ? ` — 🌡 ${r.oven_temp_f}°F` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Recipe oven config preview */}
            {selectedRecipe && (selectedRecipe.oven_temp_f || selectedRecipe.oven_duration_minutes || selectedRecipe.cooking_notes) && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-1.5">
                <p className="text-xs font-semibold text-orange-700 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5" /> Configuración del horno para esta receta
                </p>
                <div className="flex gap-5">
                  {selectedRecipe.oven_temp_f && (
                    <div>
                      <p className="text-xs text-orange-500">Temperatura</p>
                      <p className="text-xl font-bold text-orange-800">{selectedRecipe.oven_temp_f}°F</p>
                    </div>
                  )}
                  {selectedRecipe.oven_duration_minutes && (
                    <div>
                      <p className="text-xs text-orange-500">Tiempo</p>
                      <p className="text-xl font-bold text-orange-800">
                        {selectedRecipe.oven_duration_minutes >= 60
                          ? `${Math.floor(selectedRecipe.oven_duration_minutes / 60)}h ${selectedRecipe.oven_duration_minutes % 60}min`
                          : `${selectedRecipe.oven_duration_minutes} min`}
                      </p>
                    </div>
                  )}
                </div>
                {selectedRecipe.cooking_notes && (
                  <p className="text-xs text-orange-700 italic">{selectedRecipe.cooking_notes}</p>
                )}
                {selectedRecipe.seasoning_notes && (
                  <p className="text-xs text-slate-600">🧂 {selectedRecipe.seasoning_notes}</p>
                )}
              </div>
            )}

            {form.client_id && recipes.length === 0 && (
              <p className="text-xs text-[var(--muted-foreground)]">
                Este cliente no tiene recetas —{" "}
                <a href={`/clients`} className="text-blue-600 underline">ir a Clientes</a> para agregar una
              </p>
            )}
          </div>

          {/* ── Lote de materia prima ── */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1">
              Lote de Materia Prima
              <TermTip term="lot_number" />
            </Label>
            <Select value={form.lot_id} onValueChange={(v) => set("lot_id", v)} disabled={!form.product_id}>
              <SelectTrigger>
                <SelectValue placeholder={form.product_id ? "Seleccionar lote (opcional)..." : "Selecciona un producto primero"} />
              </SelectTrigger>
              <SelectContent>
                {lots.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.lot_number}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ── Cantidad ── */}
          <div className="space-y-1.5">
            <Label>Cantidad (lbs) <span className="text-red-500">*</span></Label>
            <Input
              type="number" step="0.01" min="0"
              value={form.quantity_lbs}
              onChange={(e) => set("quantity_lbs", e.target.value)}
              placeholder="0.00"
            />
          </div>

          {/* ── Fechas ── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Fecha de Orden</Label>
              <Input type="date" value={form.order_date} onChange={(e) => set("order_date", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha de Producción</Label>
              <Input type="date" value={form.scheduled_date} onChange={(e) => set("scheduled_date", e.target.value)} />
            </div>
          </div>

          {/* ── Notas ── */}
          <div className="space-y-1.5">
            <Label>Notas / Instrucciones Especiales</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Instrucciones adicionales para esta orden..."
              rows={3}
            />
          </div>
        </div>

        <div className="p-6 flex items-center justify-between gap-3">
          <Button variant="outline" onClick={() => router.back()} type="button">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Creando…" : "Crear Orden"}
          </Button>
        </div>
      </div>
    </div>
  )
}
