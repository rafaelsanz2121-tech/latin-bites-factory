"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Plus, DollarSign } from "lucide-react"

const COST_TYPES = [
  { value: "raw_material", label: "Materia Prima" },
  { value: "labor",        label: "Mano de Obra (horas de ADP)" },
  { value: "packaging",    label: "Empaque" },
  { value: "overhead",     label: "Gastos Generales" },
  { value: "other",        label: "Otros" },
]

export function AddCostItemForm({ orderId }: { orderId: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    cost_type: "raw_material",
    description: "",
    quantity: "1",
    unit_cost: "",
  })

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))

  const total = (() => {
    const q = parseFloat(form.quantity)
    const u = parseFloat(form.unit_cost)
    if (isNaN(q) || isNaN(u)) return null
    return q * u
  })()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.description.trim()) { toast.error("La descripción es requerida"); return }
    if (!form.unit_cost || parseFloat(form.unit_cost) <= 0) { toast.error("El costo unitario debe ser mayor a 0"); return }

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user!.id).single()

    const { error } = await supabase.from("cost_items").insert({
      production_order_id: orderId,
      organization_id: profile?.organization_id,
      cost_type: form.cost_type,
      description: form.description.trim(),
      quantity: parseFloat(form.quantity) || 1,
      unit_cost: parseFloat(form.unit_cost),
      created_by: user!.id,
    })

    setSaving(false)
    if (error) { toast.error("Error al guardar: " + error.message); return }
    toast.success("Costo agregado correctamente")
    setForm({ cost_type: "raw_material", description: "", quantity: "1", unit_cost: "" })
    setOpen(false)
    router.refresh()
  }

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
            <Plus className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <span className="text-sm font-bold text-slate-700">Agregar partida de costo</span>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full transition-colors ${open ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
          {open ? "Cerrar" : "Abrir"}
        </span>
      </button>

      {open && (
        <div className="border-t border-slate-100 p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Cost type */}
              <div>
                <label className="block text-[11.5px] font-bold text-slate-600 uppercase tracking-wide mb-1.5">
                  Tipo de costo
                </label>
                <select
                  value={form.cost_type}
                  onChange={(e) => set("cost_type", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                >
                  {COST_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11.5px] font-bold text-slate-600 uppercase tracking-wide mb-1.5">
                  Descripción
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Ej: Pork Belly 80/20 — Proveedor X"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-[11.5px] font-bold text-slate-600 uppercase tracking-wide mb-1.5">
                  Cantidad / Horas / Unidades
                </label>
                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={form.quantity}
                  onChange={(e) => set("quantity", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              {/* Unit cost */}
              <div>
                <label className="block text-[11.5px] font-bold text-slate-600 uppercase tracking-wide mb-1.5">
                  Costo Unitario ($)
                </label>
                <input
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  value={form.unit_cost}
                  onChange={(e) => set("unit_cost", e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>

            {/* Total preview */}
            {total !== null && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                <DollarSign className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-semibold text-amber-800">
                  Total de esta partida:{" "}
                  <span className="text-amber-700 font-black text-base">
                    {total.toLocaleString("en-US", { style: "currency", currency: "USD" })}
                  </span>
                </span>
              </div>
            )}

            {/* Note for labor */}
            {form.cost_type === "labor" && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2.5">
                <p className="text-[12px] text-green-700 font-medium">
                  💡 Para mano de obra: usa <strong>Cantidad</strong> = horas trabajadas y <strong>Costo Unitario</strong> = tasa horaria del empleado.
                  ADP sigue procesando el pago — aquí solo asignamos las horas a esta orden para el cálculo de costo del lote.
                </p>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-60"
              >
                <Plus className="w-4 h-4" />
                {saving ? "Guardando..." : "Agregar costo"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
