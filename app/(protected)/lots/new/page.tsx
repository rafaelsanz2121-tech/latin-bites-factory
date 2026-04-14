"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import Link from "next/link"
import { ArrowLeft, Package, Save } from "lucide-react"

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
  const [saving, setSaving] = useState(false)
  const [lotLoading, setLotLoading] = useState(true)

  // Auto-generate lot number
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

  // Fetch products
  useEffect(() => {
    supabase
      .from("products")
      .select("id, name, code")
      .eq("is_active", true)
      .order("name")
      .then(({ data }) => { if (data) setProducts(data) })
  }, [])

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!form.lot_number.trim()) { toast.error("El número de lote es requerido"); return }
    if (!form.product_id) { toast.error("Selecciona un producto"); return }

    setSaving(true)
    const { data, error } = await supabase.from("lots").insert({
      lot_number: form.lot_number.trim(),
      product_id: form.product_id,
      received_date: form.received_date || null,
      quantity_lbs: form.quantity_lbs ? parseFloat(form.quantity_lbs) : null,
      supplier: form.supplier.trim() || null,
      notes: form.notes.trim() || null,
    }).select("id").single()

    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success(`Lote "${form.lot_number}" registrado`)
    router.push(`/lots/${data.id}`)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/lots"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mb-4 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Volver a Lotes
        </Link>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Nuevo Lote de Materia Prima</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">9 CFR 320 — Registro de trazabilidad desde el proveedor</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] shadow-sm overflow-hidden">
        <div className="p-6 space-y-5">
          {/* Lot number + Product */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Número de Lote <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.lot_number}
                onChange={(e) => set("lot_number", e.target.value)}
                placeholder={lotLoading ? "Generando…" : "LOT-2026-04-11-001"}
                disabled={lotLoading}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0f172a] text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-colors font-mono disabled:opacity-50"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Auto-generado — edita si necesitas</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Producto <span className="text-red-500">*</span>
              </label>
              <select
                value={form.product_id}
                onChange={(e) => set("product_id", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0f172a] text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-colors"
              >
                <option value="">Seleccionar producto...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code ? `[${p.code}] ` : ""}{p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date + Quantity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Fecha de Recibo
              </label>
              <input
                type="date"
                value={form.received_date}
                onChange={(e) => set("received_date", e.target.value)}
                max={today}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0f172a] text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Cantidad (lbs)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.quantity_lbs}
                onChange={(e) => set("quantity_lbs", e.target.value)}
                placeholder="Ej. 500"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0f172a] text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-colors tabular-nums"
              />
            </div>
          </div>

          {/* Supplier */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Proveedor
            </label>
            <input
              type="text"
              value={form.supplier}
              onChange={(e) => set("supplier", e.target.value)}
              placeholder="Nombre del proveedor"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0f172a] text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-colors"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Notas
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Observaciones sobre el lote recibido..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0f172a] text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-colors resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 flex items-center justify-end gap-3">
          <Link
            href="/lots"
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            Cancelar
          </Link>
          <button
            onClick={handleSave}
            disabled={saving || lotLoading}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
          >
            <Save className="w-4 h-4" />
            {saving ? "Guardando…" : "Registrar Lote"}
          </button>
        </div>
      </div>
    </div>
  )
}
