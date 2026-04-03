"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import Link from "next/link"
import { ArrowLeft, Boxes } from "lucide-react"

const CATEGORIES = [
  { value: "raw_material",  label: "Materia Prima" },
  { value: "packaging",     label: "Empaque" },
  { value: "finished_good", label: "Producto Terminado" },
  { value: "supply",        label: "Insumos Generales" },
  { value: "chemical",      label: "Químicos / Sanitizantes" },
]

const UNITS = ["lbs", "kg", "oz", "gal", "L", "units", "boxes", "bags", "rolls", "cases"]

const LOCATIONS = ["Dry Storage", "Walk-in Cooler 1", "Walk-in Cooler 2", "Walk-in Freezer 1", "Walk-in Freezer 2", "Packing Area", "Kitchen", "Shipping/Receiving"]

export default function NuevoInventarioPage() {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: "", sku: "", category: "raw_material", unit: "lbs",
    current_stock: "", min_stock: "", max_stock: "",
    cost_per_unit: "", supplier: "", location: "", notes: "",
  })

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error("El nombre es requerido"); return }

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push("/login"); return }
    const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()

    const { error } = await supabase.from("inventory_items").insert({
      organization_id: profile?.organization_id,
      name:          form.name.trim(),
      sku:           form.sku.trim() || null,
      category:      form.category,
      unit:          form.unit,
      current_stock: parseFloat(form.current_stock) || 0,
      min_stock:     parseFloat(form.min_stock) || 0,
      max_stock:     form.max_stock ? parseFloat(form.max_stock) : null,
      cost_per_unit: form.cost_per_unit ? parseFloat(form.cost_per_unit) : null,
      supplier:      form.supplier.trim() || null,
      location:      form.location || null,
      notes:         form.notes.trim() || null,
    })

    setSaving(false)
    if (error) { toast.error("Error: " + error.message); return }
    toast.success("Artículo creado correctamente")
    router.push("/inventario")
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/inventario" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 mb-3 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Volver a Inventario
        </Link>
        <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2 tracking-tight">
          <span className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <Boxes className="w-4 h-4 text-blue-600" />
          </span>
          Nuevo Artículo de Inventario
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-5">

        {/* Name + SKU */}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-[11.5px] font-bold text-slate-600 uppercase tracking-wide mb-1.5">Nombre *</label>
            <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)}
              placeholder="Ej: Pork Belly 80/20" required
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label className="block text-[11.5px] font-bold text-slate-600 uppercase tracking-wide mb-1.5">SKU / Código</label>
            <input type="text" value={form.sku} onChange={(e) => set("sku", e.target.value)}
              placeholder="PB-8020"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
        </div>

        {/* Category + Unit */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[11.5px] font-bold text-slate-600 uppercase tracking-wide mb-1.5">Categoría *</label>
            <select value={form.category} onChange={(e) => set("category", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11.5px] font-bold text-slate-600 uppercase tracking-wide mb-1.5">Unidad *</label>
            <select value={form.unit} onChange={(e) => set("unit", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        {/* Stock levels */}
        <div>
          <p className="text-[11.5px] font-bold text-slate-600 uppercase tracking-wide mb-2">Niveles de Stock</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { k: "current_stock", label: "Stock Actual",  placeholder: "0" },
              { k: "min_stock",     label: "Mínimo (alerta)", placeholder: "0" },
              { k: "max_stock",     label: "Máximo (opcional)", placeholder: "—" },
            ].map((f) => (
              <div key={f.k}>
                <label className="block text-[10.5px] font-semibold text-slate-500 mb-1">{f.label}</label>
                <input type="number" min="0" step="0.001" value={(form as any)[f.k]}
                  onChange={(e) => set(f.k, e.target.value)} placeholder={f.placeholder}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            ))}
          </div>
        </div>

        {/* Cost + Supplier + Location */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11.5px] font-bold text-slate-600 uppercase tracking-wide mb-1.5">Costo por {form.unit} ($)</label>
            <input type="number" min="0" step="0.0001" value={form.cost_per_unit}
              onChange={(e) => set("cost_per_unit", e.target.value)} placeholder="0.0000"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label className="block text-[11.5px] font-bold text-slate-600 uppercase tracking-wide mb-1.5">Proveedor</label>
            <input type="text" value={form.supplier} onChange={(e) => set("supplier", e.target.value)}
              placeholder="Nombre del proveedor"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label className="block text-[11.5px] font-bold text-slate-600 uppercase tracking-wide mb-1.5">Ubicación en planta</label>
            <select value={form.location} onChange={(e) => set("location", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="">Seleccionar...</option>
              {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-[11.5px] font-bold text-slate-600 uppercase tracking-wide mb-1.5">Notas</label>
          <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2}
            placeholder="Información adicional sobre el artículo..."
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={saving}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-60">
            {saving ? "Guardando..." : "Crear artículo"}
          </button>
          <Link href="/inventario" className="px-4 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-700">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
