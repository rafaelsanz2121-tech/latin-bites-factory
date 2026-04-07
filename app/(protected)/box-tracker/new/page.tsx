"use client"

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useState, useEffect } from "react"
import { Scale, ArrowLeft, Play } from "lucide-react"
import { toast } from "sonner"

export default function NewBoxSessionPage() {
  const router = useRouter()
  const supabase = createClient()

  const [clients, setClients] = useState<any[]>([])
  const [orders,  setOrders]  = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    client_name:         "",
    product_name:        "",
    shift_date:          new Date().toISOString().split("T")[0],
    production_order_id: "",
    target_boxes:        "",
    target_weight_lbs:   "",
    notes:               "",
  })

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))

  useEffect(() => {
    Promise.all([
      supabase.from("clients").select("id, company_name").eq("is_active", true).order("company_name"),
      supabase.from("production_orders").select("id, order_number, status, clients(company_name), products(name)").in("status", ["planned", "in_production"]).order("created_at", { ascending: false }),
    ]).then(([{ data: c }, { data: o }]) => {
      setClients(c || [])
      setOrders(o || [])
    })
  }, [])

  // When an order is selected, auto-fill client and product
  const handleOrderSelect = (orderId: string) => {
    set("production_order_id", orderId)
    if (!orderId) return
    const order = orders.find((o) => o.id === orderId)
    if (!order) return
    if (order.clients?.company_name) set("client_name", order.clients.company_name)
    if (order.products?.name)        set("product_name", order.products.name)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.client_name.trim() || !form.product_name.trim()) {
      toast.error("Cliente y producto son obligatorios")
      return
    }
    setLoading(true)

    const { data: profile } = await supabase.from("profiles").select("id, organization_id").eq("id", (await supabase.auth.getUser()).data.user!.id).single()
    if (!profile) { toast.error("Error al obtener perfil"); setLoading(false); return }

    const { data, error } = await supabase.from("box_sessions").insert({
      organization_id:      profile.organization_id,
      production_order_id:  form.production_order_id || null,
      client_name:          form.client_name.trim(),
      product_name:         form.product_name.trim(),
      shift_date:           form.shift_date,
      started_by:           profile.id,
      status:               "active",
      target_boxes:         form.target_boxes     ? parseInt(form.target_boxes)        : null,
      target_weight_lbs:    form.target_weight_lbs ? parseFloat(form.target_weight_lbs) : null,
      notes:                form.notes.trim() || null,
    }).select("id").single()

    if (error || !data) {
      toast.error("Error al iniciar sesión: " + (error?.message || ""))
      setLoading(false)
      return
    }

    toast.success("¡Sesión iniciada! Puedes comenzar a registrar cajas.")
    router.push(`/box-tracker/${data.id}`)
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <Link href="/box-tracker" className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Link>
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Scale className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white">Iniciar Producción</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Nuevo turno de pesaje de cajas</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] shadow-sm overflow-hidden">

        {/* Vincular a orden (opcional) */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Vincular Orden (opcional)</p>
          <select
            value={form.production_order_id}
            onChange={(e) => handleOrderSelect(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">— Seleccionar orden activa —</option>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.order_number} · {o.clients?.company_name} · {o.products?.name}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">Si seleccionas una orden, el cliente y producto se rellenan solos.</p>
        </div>

        {/* Datos principales */}
        <div className="px-5 py-4 space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Información del Turno</p>

          <div className="grid grid-cols-1 gap-4">
            {/* Cliente */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Cliente <span className="text-red-500">*</span>
              </label>
              <input
                list="clients-list"
                value={form.client_name}
                onChange={(e) => set("client_name", e.target.value)}
                placeholder="Ej: Carlys, Locos x Grill..."
                required
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <datalist id="clients-list">
                {clients.map((c) => <option key={c.id} value={c.company_name} />)}
              </datalist>
            </div>

            {/* Producto */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Producto <span className="text-red-500">*</span>
              </label>
              <input
                value={form.product_name}
                onChange={(e) => set("product_name", e.target.value)}
                placeholder="Ej: Pork Belly, Buñuelos con Queso..."
                required
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Fecha */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Fecha del Turno</label>
              <input
                type="date"
                value={form.shift_date}
                onChange={(e) => set("shift_date", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Metas opcionales */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Metas del Turno (opcional)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Meta de Cajas</label>
                <input
                  type="number"
                  min="1"
                  value={form.target_boxes}
                  onChange={(e) => set("target_boxes", e.target.value)}
                  placeholder="Ej: 140"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Meta de Peso (lbs)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.target_weight_lbs}
                  onChange={(e) => set("target_weight_lbs", e.target.value)}
                  placeholder="Ej: 5600"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Notas</label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={2}
              placeholder="Observaciones del turno..."
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end gap-3">
          <Link
            href="/box-tracker"
            className="px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-bold rounded-lg transition-colors shadow-sm"
          >
            <Play className="w-4 h-4 fill-white" />
            {loading ? "Iniciando..." : "Iniciar Producción"}
          </button>
        </div>
      </form>
    </div>
  )
}
