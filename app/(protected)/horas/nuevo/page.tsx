"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import Link from "next/link"
import { ArrowLeft, Timer, Info } from "lucide-react"

const AREAS = ["Kitchen", "Packing Area", "Shipping/Receiving", "Walk-in Cooler 1", "Walk-in Cooler 2", "Walk-in Freezer 1", "Walk-in Freezer 2", "Dry Storage", "Sanitation"]

export default function NuevaHoraPage() {
  const router = useRouter()
  const supabase = createClient()
  const today = new Date().toISOString().split("T")[0]

  const [employees, setEmployees]       = useState<any[]>([])
  const [orders, setOrders]             = useState<any[]>([])
  const [employeeRate, setEmployeeRate] = useState<number | null>(null)
  const [saving, setSaving]             = useState(false)

  const [form, setForm] = useState({
    employee_id: "", production_order_id: "", work_date: today,
    hours_worked: "", hourly_rate: "", area: "", task_description: "", is_overtime: false,
  })
  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }))

  useEffect(() => {
    supabase.from("profiles").select("id, full_name, employee_id").eq("is_active", true).order("full_name")
      .then(({ data }) => { if (data) setEmployees(data) })
    supabase.from("production_orders")
      .select("id, order_number, products(name)")
      .in("status", ["planned", "in_production", "cooking", "chilling", "packaging", "refrigerating"])
      .order("order_number", { ascending: false })
      .then(({ data }) => { if (data) setOrders(data) })
  }, []) // eslint-disable-line

  /* Load employee rate when employee is selected */
  useEffect(() => {
    if (!form.employee_id) { setEmployeeRate(null); return }
    supabase.from("employee_rates")
      .select("hourly_rate")
      .eq("employee_id", form.employee_id)
      .lte("effective_from", today)
      .order("effective_from", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const rate = Number(data[0].hourly_rate)
          setEmployeeRate(rate)
          set("hourly_rate", String(rate))
        } else {
          setEmployeeRate(null)
        }
      })
  }, [form.employee_id]) // eslint-disable-line

  const totalPay = (() => {
    const h = parseFloat(form.hours_worked)
    const r = parseFloat(form.hourly_rate)
    if (isNaN(h) || isNaN(r)) return null
    return h * r
  })()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.employee_id) { toast.error("Selecciona un empleado"); return }
    if (!form.hours_worked || parseFloat(form.hours_worked) <= 0) { toast.error("Las horas deben ser mayores a 0"); return }
    if (!form.hourly_rate || parseFloat(form.hourly_rate) <= 0) { toast.error("La tasa horaria es requerida"); return }

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push("/login"); return }
    const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()

    const { error } = await supabase.from("labor_entries").insert({
      organization_id:     profile?.organization_id,
      employee_id:         form.employee_id,
      production_order_id: form.production_order_id || null,
      work_date:           form.work_date,
      hours_worked:        parseFloat(form.hours_worked),
      hourly_rate:         parseFloat(form.hourly_rate),
      area:                form.area || null,
      task_description:    form.task_description.trim() || null,
      is_overtime:         form.is_overtime,
      created_by:          user.id,
    })

    setSaving(false)
    if (error) { toast.error("Error: " + error.message); return }
    toast.success("Horas registradas correctamente")
    router.push("/horas")
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/horas" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 mb-3 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Volver a Control de Horas
        </Link>
        <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2 tracking-tight">
          <span className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
            <Timer className="w-4 h-4 text-green-600" />
          </span>
          Registrar Horas de Producción
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Asigna horas trabajadas a una orden de producción para calcular el costo MOD real del lote.</p>
      </div>

      {/* ADP notice */}
      <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
        <Info className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
        <p className="text-[12.5px] text-green-700">
          <strong>Nota importante:</strong> Este registro es solo para calcular el <strong>costo por lote</strong>.
          ADP o tu sistema de nómina sigue siendo el que procesa y paga las horas. No son redundantes — son cosas distintas.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-5">

        {/* Employee */}
        <div>
          <label className="block text-[11.5px] font-bold text-slate-600 uppercase tracking-wide mb-1.5">Empleado *</label>
          <select value={form.employee_id} onChange={(e) => set("employee_id", e.target.value)} required
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400">
            <option value="">Seleccionar empleado...</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.full_name}{emp.employee_id ? ` (${emp.employee_id})` : ""}
              </option>
            ))}
          </select>
          {employeeRate !== null && (
            <p className="text-[11px] text-green-600 mt-1 font-semibold">
              ✓ Tasa cargada automáticamente: ${employeeRate.toFixed(2)}/hr
            </p>
          )}
          {form.employee_id && employeeRate === null && (
            <p className="text-[11px] text-amber-600 mt-1">
              Sin tasa registrada — ingresa la tasa manualmente abajo
            </p>
          )}
        </div>

        {/* Order + Date */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[11.5px] font-bold text-slate-600 uppercase tracking-wide mb-1.5">Orden de Producción</label>
            <select value={form.production_order_id} onChange={(e) => set("production_order_id", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400">
              <option value="">Sin orden asignada</option>
              {orders.map((o: any) => (
                <option key={o.id} value={o.id}>{o.order_number} — {o.products?.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11.5px] font-bold text-slate-600 uppercase tracking-wide mb-1.5">Fecha de trabajo *</label>
            <input type="date" value={form.work_date} onChange={(e) => set("work_date", e.target.value)} required
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
        </div>

        {/* Hours + Rate */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[11.5px] font-bold text-slate-600 uppercase tracking-wide mb-1.5">Horas trabajadas *</label>
            <input type="number" min="0.25" max="24" step="0.25" value={form.hours_worked}
              onChange={(e) => set("hours_worked", e.target.value)} required placeholder="8.00"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div>
            <label className="block text-[11.5px] font-bold text-slate-600 uppercase tracking-wide mb-1.5">Tasa horaria ($/hr) *</label>
            <input type="number" min="0.01" step="0.01" value={form.hourly_rate}
              onChange={(e) => set("hourly_rate", e.target.value)} required placeholder="18.00"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
        </div>

        {/* Area + Overtime */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[11.5px] font-bold text-slate-600 uppercase tracking-wide mb-1.5">Área</label>
            <select value={form.area} onChange={(e) => set("area", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400">
              <option value="">Seleccionar área...</option>
              {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_overtime} onChange={(e) => set("is_overtime", e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400" />
              <span className="text-sm font-semibold text-slate-600">Overtime (tiempo extra)</span>
            </label>
          </div>
        </div>

        {/* Task description */}
        <div>
          <label className="block text-[11.5px] font-bold text-slate-600 uppercase tracking-wide mb-1.5">Descripción de tarea</label>
          <textarea value={form.task_description} onChange={(e) => set("task_description", e.target.value)} rows={2}
            placeholder="Ej: Empaque de Chicharrón — turno matutino"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none" />
        </div>

        {/* Total preview */}
        {totalPay !== null && (
          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <span className="text-sm font-semibold text-amber-800">Costo de este registro:</span>
            <span className="text-lg font-black text-amber-700">
              {totalPay.toLocaleString("en-US", { style: "currency", currency: "USD" })}
            </span>
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={saving}
            className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-60">
            {saving ? "Guardando..." : "Registrar horas"}
          </button>
          <Link href="/horas" className="px-4 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-700">Cancelar</Link>
        </div>
      </form>
    </div>
  )
}
