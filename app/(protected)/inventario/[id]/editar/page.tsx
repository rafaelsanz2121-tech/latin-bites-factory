"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import Link from "next/link"
import { ArrowLeft, Boxes, Loader2, Trash2 } from "lucide-react"

const CATEGORIES = [
  { value: "raw_material",  label: "Materia Prima / Ingredientes (carne, aceite, azúcar, harina…)" },
  { value: "packaging",     label: "Empaque (cajas, bolsas, etiquetas…)" },
  { value: "finished_good", label: "Producto Terminado" },
  { value: "supply",        label: "Insumos Generales (guantes, utensilios…)" },
  { value: "chemical",      label: "Químicos / Sanitizantes" },
]

const UNITS = ["lbs", "kg", "oz", "gal", "L", "units", "boxes", "bags", "rolls", "cases"]

// Suggestions only — the field accepts any location typed by the user
const LOCATIONS = ["Dry Storage", "Walk-in Cooler 1", "Walk-in Cooler 2", "Walk-in Freezer 1", "Walk-in Freezer 2", "Packing Area", "Kitchen", "Área de Fritura", "Shipping/Receiving"]

export default function EditarInventarioPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [form, setForm] = useState({
    name: "", sku: "", category: "raw_material", unit: "lbs",
    min_stock: "", max_stock: "",
    cost_per_unit: "", supplier: "", location: "", notes: "",
  })

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))

  useEffect(() => {
    async function load() {
      const { data: item, error } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("id", id)
        .single()

      if (error || !item) {
        toast.error("No se encontró el artículo")
        router.push("/inventario")
        return
      }

      setForm({
        name:          item.name ?? "",
        sku:           item.sku ?? "",
        category:      item.category ?? "raw_material",
        unit:          item.unit ?? "lbs",
        min_stock:     item.min_stock != null ? String(item.min_stock) : "",
        max_stock:     item.max_stock != null ? String(item.max_stock) : "",
        cost_per_unit: item.cost_per_unit != null ? String(item.cost_per_unit) : "",
        supplier:      item.supplier ?? "",
        location:      item.location ?? "",
        notes:         item.notes ?? "",
      })
      setIsActive(item.is_active)
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error("El nombre es requerido"); return }

    setSaving(true)
    const { error } = await supabase
      .from("inventory_items")
      .update({
        name:          form.name.trim(),
        sku:           form.sku.trim() || null,
        category:      form.category,
        unit:          form.unit,
        min_stock:     parseFloat(form.min_stock) || 0,
        max_stock:     form.max_stock ? parseFloat(form.max_stock) : null,
        cost_per_unit: form.cost_per_unit ? parseFloat(form.cost_per_unit) : null,
        supplier:      form.supplier.trim() || null,
        location:      form.location || null,
        notes:         form.notes.trim() || null,
        is_active:     isActive,
        updated_at:    new Date().toISOString(),
      })
      .eq("id", id)

    setSaving(false)
    if (error) { toast.error("Error: " + error.message); return }
    toast.success("Artículo actualizado")
    router.push(`/inventario/${id}`)
    router.refresh()
  }

  const handleDelete = async () => {
    setDeleting(true)
    // .select() lets us detect an RLS-blocked delete (returns 0 rows, no error)
    const { data, error } = await supabase
      .from("inventory_items")
      .delete()
      .eq("id", id)
      .select("id")

    setDeleting(false)
    if (error) { toast.error("Error: " + error.message); return }
    if (!data || data.length === 0) {
      toast.error("No se pudo eliminar. Ejecuta la migración 020_inventory_delete_policy.sql en Supabase.")
      return
    }
    toast.success("Artículo eliminado junto con su historial")
    router.push("/inventario")
    router.refresh()
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 py-12">
        <Loader2 className="w-4 h-4 animate-spin" /> Cargando artículo…
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href={`/inventario/${id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-600 mb-3 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Volver al artículo
        </Link>
        <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 tracking-tight">
          <span className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
            <Boxes className="w-4 h-4 text-blue-600" />
          </span>
          Editar Artículo
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          El stock actual se modifica registrando movimientos, no desde aquí.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm p-6 space-y-5">

        {/* Name + SKU */}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-[11.5px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5">Nombre *</label>
            <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)}
              placeholder="Ej: Aceite vegetal, Azúcar, Pork Belly 80/20…" required
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label className="block text-[11.5px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5">SKU / Código</label>
            <input type="text" value={form.sku} onChange={(e) => set("sku", e.target.value)}
              placeholder="PB-8020"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
        </div>

        {/* Category + Unit */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[11.5px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5">Categoría *</label>
            <select value={form.category} onChange={(e) => set("category", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11.5px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5">Unidad *</label>
            <select value={form.unit} onChange={(e) => set("unit", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        {/* Stock thresholds */}
        <div>
          <p className="text-[11.5px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2">Niveles de Alerta</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { k: "min_stock", label: "Mínimo (alerta)",   placeholder: "0" },
              { k: "max_stock", label: "Máximo (opcional)", placeholder: "—" },
            ].map((f) => (
              <div key={f.k}>
                <label className="block text-[10.5px] font-semibold text-slate-600 dark:text-slate-400 mb-1">{f.label}</label>
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
            <label className="block text-[11.5px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5">Costo por {form.unit} ($)</label>
            <input type="number" min="0" step="0.0001" value={form.cost_per_unit}
              onChange={(e) => set("cost_per_unit", e.target.value)} placeholder="0.0000"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label className="block text-[11.5px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5">Proveedor</label>
            <input type="text" value={form.supplier} onChange={(e) => set("supplier", e.target.value)}
              placeholder="Nombre del proveedor"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label className="block text-[11.5px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5">Ubicación en planta</label>
            <input type="text" list="locations-list-edit" value={form.location} onChange={(e) => set("location", e.target.value)}
              placeholder="Escribe o elige…"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <datalist id="locations-list-edit">
              {LOCATIONS.map((l) => <option key={l} value={l} />)}
            </datalist>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-[11.5px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5">Notas</label>
          <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2}
            placeholder="Información adicional sobre el artículo..."
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
        </div>

        {/* Active toggle */}
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4 accent-blue-600"
          />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Artículo activo</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">(los inactivos no aparecen en el listado de inventario)</span>
        </label>

        {/* Submit */}
        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={saving}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-60">
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
          <Link href={`/inventario/${id}`} className="px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-700">
            Cancelar
          </Link>
        </div>
      </form>

      {/* Danger zone */}
      <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 p-5">
        <h3 className="text-sm font-bold text-red-700 dark:text-red-400 flex items-center gap-2 mb-1">
          <Trash2 className="w-4 h-4" /> Eliminar artículo
        </h3>
        <p className="text-xs text-red-600/80 dark:text-red-400/70 mb-4">
          Se borra el artículo <strong>y todo su historial de movimientos</strong> de forma permanente.
          Si solo quieres ocultarlo del inventario, usa &quot;Artículo activo&quot; arriba.
        </p>
        {confirmDelete ? (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-60"
            >
              {deleting
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Eliminando…</>
                : <><Trash2 className="w-3.5 h-3.5" /> Sí, eliminar definitivamente</>
              }
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] rounded-lg transition-colors"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="px-4 py-2 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-semibold rounded-lg hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors"
          >
            Eliminar artículo…
          </button>
        )}
      </div>
    </div>
  )
}
