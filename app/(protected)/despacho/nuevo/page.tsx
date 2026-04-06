"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  Truck, ChevronLeft, Save, AlertCircle, CheckCircle2,
  Package, Thermometer, User, FileText, MapPin,
} from "lucide-react"

const UNITS = ["lbs", "kg", "units", "cases"]

const STATUS_OPTIONS = [
  { value: "dispatched", label: "Despachado" },
  { value: "draft",      label: "Borrador"   },
]

export default function NuevoDespachoPage() {
  const router   = useRouter()
  const supabase = createClient()
  const [isPending, startTransition] = useTransition()

  const now   = new Date()
  const today = now.toISOString().split("T")[0]
  const hhmm  = now.toTimeString().slice(0, 5)

  const [form, setForm] = useState({
    dispatch_date:          today,
    dispatch_time:          hhmm,
    bill_of_lading:         "",
    status:                 "dispatched",
    product_name:           "",
    lot_numbers:            "",
    quantity:               "",
    unit:                   "lbs",
    destination_name:       "",
    destination_address:    "",
    carrier_name:           "",
    truck_plate:            "",
    driver_name:            "",
    driver_license:         "",
    seal_number:            "",
    temp_at_loading_f:      "",
    temp_acceptable:        "" as "" | "true" | "false",
    usda_inspector_present: false,
    inspector_name:         "",
    notes:                  "",
  })

  const [error,   setError]   = useState("")
  const [success, setSuccess] = useState(false)

  function setF(k: string, v: string | boolean) {
    setForm((p) => {
      const next = { ...p, [k]: v }
      // Auto-evaluate temp when changed
      if (k === "temp_at_loading_f") {
        const t = Number(v)
        if (v !== "" && !isNaN(t)) {
          next.temp_acceptable = t <= 41 ? "true" : "false"
        } else {
          next.temp_acceptable = ""
        }
      }
      return next
    })
  }

  const tempNum = Number(form.temp_at_loading_f)
  const tempTooHigh = form.temp_at_loading_f !== "" && !isNaN(tempNum) && tempNum > 41

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!form.product_name.trim())     return setError("Ingresa el nombre del producto.")
    if (!form.destination_name.trim()) return setError("Ingresa el destino.")
    if (!form.quantity || isNaN(Number(form.quantity))) return setError("Ingresa una cantidad válida.")

    startTransition(async () => {
      const { error: dbErr } = await supabase.from("dispatch_logs").insert({
        dispatch_date:          form.dispatch_date,
        dispatch_time:          form.dispatch_time,
        bill_of_lading:         form.bill_of_lading      || null,
        status:                 form.status,
        product_name:           form.product_name.trim(),
        lot_numbers:            form.lot_numbers          || null,
        quantity:               Number(form.quantity),
        unit:                   form.unit,
        destination_name:       form.destination_name.trim(),
        destination_address:    form.destination_address || null,
        carrier_name:           form.carrier_name        || null,
        truck_plate:            form.truck_plate         || null,
        driver_name:            form.driver_name         || null,
        driver_license:         form.driver_license      || null,
        seal_number:            form.seal_number         || null,
        temp_at_loading_f:      form.temp_at_loading_f !== "" ? Number(form.temp_at_loading_f) : null,
        temp_acceptable:        form.temp_acceptable === "true"  ? true  :
                                form.temp_acceptable === "false" ? false : null,
        usda_inspector_present: form.usda_inspector_present,
        inspector_name:         form.usda_inspector_present ? form.inspector_name || null : null,
        notes:                  form.notes || null,
      })
      if (dbErr) { setError(dbErr.message); return }
      setSuccess(true)
      setTimeout(() => router.push("/despacho"), 1000)
    })
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <p className="text-lg font-bold text-slate-800 dark:text-slate-100">Despacho registrado</p>
        <p className="text-sm text-slate-600 dark:text-slate-300">Redirigiendo…</p>
      </div>
    )
  }

  const inputCls = "w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400"
  const cardCls  = "bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden"

  return (
    <div className="max-w-[760px] space-y-6">

      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => router.back()} className="mt-0.5 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-600 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center">
              <Truck className="w-4 h-4 text-sky-600" />
            </span>
            Nuevo Despacho
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">9 CFR 320 · Registro de envío</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Despacho */}
        <div className={cardCls}>
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <Truck className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Información del despacho</span>
          </div>
          <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Fecha *</label>
              <input type="date" value={form.dispatch_date} max={today} onChange={(e) => setF("dispatch_date", e.target.value)} required className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Hora</label>
              <input type="time" value={form.dispatch_time} onChange={(e) => setF("dispatch_time", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Bill of Lading</label>
              <input type="text" value={form.bill_of_lading} onChange={(e) => setF("bill_of_lading", e.target.value)} placeholder="No. de conocimiento" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Estado</label>
              <select value={form.status} onChange={(e) => setF("status", e.target.value)} className={inputCls}>
                {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Producto */}
        <div className={cardCls}>
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <Package className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Producto</span>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Nombre del producto *</label>
              <input type="text" value={form.product_name} onChange={(e) => setF("product_name", e.target.value)} required placeholder="Ej. Pork Belly, Chicharrón…" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">No(s). de lote</label>
              <input type="text" value={form.lot_numbers} onChange={(e) => setF("lot_numbers", e.target.value)} placeholder="L001, L002…" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Cantidad *</label>
              <input type="number" min={0} step="0.01" value={form.quantity} onChange={(e) => setF("quantity", e.target.value)} required placeholder="0.00" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Unidad</label>
              <select value={form.unit} onChange={(e) => setF("unit", e.target.value)} className={inputCls}>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Destino */}
        <div className={cardCls}>
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Destino</span>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Nombre del destino *</label>
              <input type="text" value={form.destination_name} onChange={(e) => setF("destination_name", e.target.value)} required placeholder="Empresa o restaurante" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Dirección</label>
              <input type="text" value={form.destination_address} onChange={(e) => setF("destination_address", e.target.value)} placeholder="Ciudad, Estado" className={inputCls} />
            </div>
          </div>
        </div>

        {/* Transportista */}
        <div className={cardCls}>
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <User className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Transportista</span>
          </div>
          <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Empresa transportista</label>
              <input type="text" value={form.carrier_name} onChange={(e) => setF("carrier_name", e.target.value)} placeholder="Nombre de la empresa" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Placa del camión</label>
              <input type="text" value={form.truck_plate} onChange={(e) => setF("truck_plate", e.target.value)} placeholder="ABC-1234" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">No. de sello</label>
              <input type="text" value={form.seal_number} onChange={(e) => setF("seal_number", e.target.value)} placeholder="Sello de seguridad" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Nombre del conductor</label>
              <input type="text" value={form.driver_name} onChange={(e) => setF("driver_name", e.target.value)} placeholder="Nombre completo" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Licencia de conducir</label>
              <input type="text" value={form.driver_license} onChange={(e) => setF("driver_license", e.target.value)} placeholder="No. de licencia" className={inputCls} />
            </div>
          </div>
        </div>

        {/* Temperatura */}
        <div className={cardCls}>
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Temperatura al despachar</span>
          </div>
          <div className="p-5 space-y-3">
            <div className="flex items-start gap-4">
              <div className="w-48">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Temperatura (°F)</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.temp_at_loading_f}
                  onChange={(e) => setF("temp_at_loading_f", e.target.value)}
                  placeholder="°F"
                  className={inputCls}
                />
              </div>
              {form.temp_at_loading_f !== "" && (
                <div className="mt-6 flex items-center gap-2">
                  {form.temp_acceptable === "true"
                    ? <span className="flex items-center gap-1.5 text-sm font-bold text-green-600 bg-white dark:bg-[#111827] px-3 py-1.5 rounded-lg"><CheckCircle2 className="w-4 h-4" /> Dentro del rango</span>
                    : <span className="flex items-center gap-1.5 text-sm font-bold text-red-600 bg-white dark:bg-[#111827] px-3 py-1.5 rounded-lg"><AlertCircle className="w-4 h-4" /> FUERA DE RANGO</span>
                  }
                </div>
              )}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">USDA requiere ≤41°F para productos RTE al momento del despacho.</p>
            {tempTooHigh && (
              <div className="flex items-start gap-2 bg-white dark:bg-[#111827] border border-red-200 dark:border-red-800 rounded-lg px-3 py-2.5 text-xs text-slate-900 dark:text-slate-100">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-red-500" />
                <span>
                  <strong>{form.temp_at_loading_f}°F supera el límite de 41°F.</strong> Este despacho quedará marcado como violación de temperatura y generará una alerta de cumplimiento.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* USDA Inspector */}
        <div className={cardCls}>
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.usda_inspector_present}
                onChange={(e) => setF("usda_inspector_present", e.target.checked)}
                className="w-4 h-4 accent-sky-600"
              />
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Inspector USDA presente al despachar</span>
            </label>
          </div>
          {form.usda_inspector_present && (
            <div className="p-5">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Nombre del inspector</label>
              <input type="text" value={form.inspector_name} onChange={(e) => setF("inspector_name", e.target.value)} placeholder="Nombre del inspector USDA" className={inputCls} />
            </div>
          )}
        </div>

        {/* Notes */}
        <div className={cardCls}>
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Notas</span>
          </div>
          <div className="p-5">
            <textarea value={form.notes} onChange={(e) => setF("notes", e.target.value)} rows={2} placeholder="Observaciones adicionales…" className={inputCls + " resize-none"} />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 bg-white dark:bg-[#111827] border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-slate-900 dark:text-slate-100">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-between gap-4 pb-8">
          <button type="button" onClick={() => router.back()} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={isPending} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold shadow-sm transition-all">
            {isPending
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando…</>
              : <><Save className="w-4 h-4" />Guardar despacho</>
            }
          </button>
        </div>
      </form>
    </div>
  )
}
