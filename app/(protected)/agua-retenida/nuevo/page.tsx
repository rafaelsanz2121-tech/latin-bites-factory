"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  Droplets, ChevronLeft, Save, AlertCircle, CheckCircle2,
  XCircle, FlaskConical, FileText,
} from "lucide-react"

const PRODUCT_TYPES = [
  { value: "rte",           label: "RTE (Ready-to-Eat)",      limit: 0 },
  { value: "raw_intact",    label: "Crudo íntegro",           limit: 0 },
  { value: "raw_non_intact",label: "Crudo no íntegro",        limit: 0 },
  { value: "cooked",        label: "Cocido (poultry/pork)",   limit: 8 },
  { value: "other",         label: "Otro",                    limit: 8 },
]

const CHILLING_METHODS = [
  { value: "water_immersion", label: "Inmersión en agua", desc: "Tanques de enfriamiento con agua" },
  { value: "spray_chilling",  label: "Rociado (spray)",  desc: "Aspersión de agua sobre el producto" },
  { value: "air_chilling",    label: "Aire frío",        desc: "Corriente de aire frío sin agua" },
  { value: "combination",     label: "Combinado",        desc: "Combinación de métodos" },
]

// FSIS limits by species (simplified — user can override)
const SPECIES_LIMITS = [
  { label: "Pollo / Pavo (ave entera)", limit: "8.000" },
  { label: "Partes de ave",             limit: "8.000" },
  { label: "Cerdo (pork)",              limit: "0.000" },
  { label: "Res (beef)",                limit: "0.000" },
  { label: "Otro — especificar",        limit: "8.000" },
]

export default function NuevoAguaRetenida() {
  const router   = useRouter()
  const supabase = createClient()
  const [isPending, startTransition] = useTransition()

  const today = new Date().toISOString().split("T")[0]

  const [form, setForm] = useState({
    test_date:           today,
    product_name:        "",
    product_type:        "rte",
    lot_number:          "",
    raw_weight_g:        "",
    processed_weight_g:  "",
    chilling_method:     "water_immersion",
    chiller_temp_f:      "",
    chiller_time_min:    "",
    regulatory_limit_pct:"8.000",
    result:              "pending" as "pass"|"fail"|"pending",
    corrective_action:   "",
    product_on_hold:     false,
    disposition:         "",
    notes:               "",
  })

  const [error,   setError]   = useState("")
  const [success, setSuccess] = useState(false)

  function setF(k: string, v: string | boolean) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  // Live calculation
  const rawG  = Number(form.raw_weight_g)
  const procG = Number(form.processed_weight_g)
  const waterAbsorbed = (rawG > 0 && procG > 0) ? procG - rawG : null
  const waterPct = (rawG > 0 && waterAbsorbed !== null) ? (waterAbsorbed / rawG * 100) : null
  const limit = Number(form.regulatory_limit_pct)
  const autoResult: "pass"|"fail"|"pending" = waterPct !== null
    ? (waterPct <= limit ? "pass" : "fail")
    : "pending"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!form.product_name.trim())    return setError("Ingresa el nombre del producto.")
    if (!form.raw_weight_g)           return setError("Ingresa el peso crudo.")
    if (!form.processed_weight_g)     return setError("Ingresa el peso procesado.")
    if (autoResult === "fail" && !form.corrective_action.trim())
      return setError("Se requiere acción correctiva cuando el resultado es FALLA.")

    startTransition(async () => {
      const { error: dbErr } = await supabase.from("retained_water_logs").insert({
        test_date:           form.test_date,
        product_name:        form.product_name.trim(),
        product_type:        form.product_type,
        lot_number:          form.lot_number     || null,
        raw_weight_g:        rawG,
        processed_weight_g:  procG,
        chilling_method:     form.chilling_method,
        chiller_temp_f:      form.chiller_temp_f ? Number(form.chiller_temp_f) : null,
        chiller_time_min:    form.chiller_time_min ? Number(form.chiller_time_min) : null,
        regulatory_limit_pct:limit,
        result:              autoResult,
        corrective_action:   form.corrective_action || null,
        product_on_hold:     form.product_on_hold,
        disposition:         form.product_on_hold ? form.disposition || null : null,
        notes:               form.notes || null,
      })
      if (dbErr) { setError(dbErr.message); return }
      setSuccess(true)
      setTimeout(() => router.push("/agua-retenida"), 1000)
    })
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <p className="text-lg font-bold text-slate-800 dark:text-slate-100">Prueba registrada</p>
        <p className="text-sm text-slate-600 dark:text-slate-300">Redirigiendo…</p>
      </div>
    )
  }

  const inputCls = "w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-400"
  const cardCls  = "bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden"

  return (
    <div className="max-w-[760px] space-y-6">

      <div className="flex items-start gap-4">
        <button onClick={() => router.back()} className="mt-0.5 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center">
              <Droplets className="w-4 h-4 text-cyan-600" />
            </span>
            Nueva Prueba — Agua Retenida
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">9 CFR 441 · Protocolo de agua retenida</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Product info */}
        <div className={cardCls}>
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Información del producto</span>
          </div>
          <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Fecha *</label>
              <input type="date" value={form.test_date} max={today} onChange={(e) => setF("test_date", e.target.value)} required className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Nombre del producto *</label>
              <input type="text" value={form.product_name} onChange={(e) => setF("product_name", e.target.value)} required placeholder="Ej. Pork Belly" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Tipo de producto</label>
              <select value={form.product_type} onChange={(e) => setF("product_type", e.target.value)} className={inputCls}>
                {PRODUCT_TYPES.map((pt) => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">No. de lote</label>
              <input type="text" value={form.lot_number} onChange={(e) => setF("lot_number", e.target.value)} placeholder="Lote" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Límite regulatorio (%)</label>
              <div className="space-y-1">
                <input type="number" step="0.001" min={0} value={form.regulatory_limit_pct} onChange={(e) => setF("regulatory_limit_pct", e.target.value)} className={inputCls} />
                <div className="flex flex-wrap gap-1">
                  {SPECIES_LIMITS.map((s) => (
                    <button key={s.limit + s.label} type="button" onClick={() => setF("regulatory_limit_pct", s.limit)}
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-900/30 text-slate-900 dark:text-slate-100 hover:bg-cyan-200 transition-colors">
                      {s.label.split(" ")[0]}: {s.limit}%
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chilling method */}
        <div className={cardCls}>
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Método de enfriamiento</span>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CHILLING_METHODS.map((cm) => (
                <button key={cm.value} type="button" onClick={() => setF("chilling_method", cm.value)}
                  className={`text-left px-3 py-3 rounded-xl border-2 text-xs transition-all ${
                    form.chilling_method === cm.value
                      ? "border-cyan-400 bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 font-semibold shadow-sm"
                      : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300"
                  }`}>
                  <span className="block font-semibold">{cm.label}</span>
                  <span className="opacity-70 text-[10px]">{cm.desc}</span>
                </button>
              ))}
            </div>
            {form.chilling_method !== "air_chilling" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Temperatura del chiller (°F)</label>
                  <input type="number" step="0.1" value={form.chiller_temp_f} onChange={(e) => setF("chiller_temp_f", e.target.value)} placeholder="28–34°F" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Tiempo en chiller (min)</label>
                  <input type="number" min={0} value={form.chiller_time_min} onChange={(e) => setF("chiller_time_min", e.target.value)} placeholder="Minutos" className={inputCls} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Weight measurements */}
        <div className={cardCls}>
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Mediciones de peso</span>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Peso ANTES del proceso (g) *</label>
                <input type="number" step="0.01" min={0} value={form.raw_weight_g} onChange={(e) => setF("raw_weight_g", e.target.value)} required placeholder="gramos" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Peso DESPUÉS del proceso (g) *</label>
                <input type="number" step="0.01" min={0} value={form.processed_weight_g} onChange={(e) => setF("processed_weight_g", e.target.value)} required placeholder="gramos" className={inputCls} />
              </div>
            </div>

            {/* Live result */}
            {waterPct !== null && (
              <div className={`rounded-xl p-4 border-2 ${
                autoResult === "fail"
                  ? "border-red-300 bg-white dark:bg-[#111827] dark:border-red-700"
                  : "border-green-300 bg-white dark:bg-[#111827] dark:border-green-700"
              }`}>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide mb-1">Agua retenida calculada</p>
                    <p className={`text-3xl font-black tabular-nums ${autoResult === "fail" ? "text-red-600" : "text-green-600"}`}>
                      {waterPct.toFixed(3)}%
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {waterAbsorbed! >= 0 ? `+${waterAbsorbed!.toFixed(1)}g absorbida` : `${waterAbsorbed!.toFixed(1)}g perdida`} · Límite: {limit}%
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {autoResult === "fail"
                      ? <><XCircle className="w-7 h-7 text-red-500" /><span className="text-lg font-black text-red-600">FALLA</span></>
                      : <><CheckCircle2 className="w-7 h-7 text-green-500" /><span className="text-lg font-black text-green-600">PASA</span></>
                    }
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Corrective action (conditional) */}
        {autoResult === "fail" && (
          <div className="bg-white dark:bg-[#111827] border-2 border-red-200 dark:border-red-800 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-red-200 dark:border-red-800">
              <span className="text-sm font-bold text-red-800 dark:text-red-200">Acción Correctiva — Requerida</span>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1.5 uppercase tracking-wide">Acción tomada *</label>
                <textarea value={form.corrective_action} onChange={(e) => setF("corrective_action", e.target.value)} rows={3} required placeholder="Describe la acción correctiva tomada inmediatamente…" className="w-full border border-red-200 dark:border-red-700 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-400/40 resize-none" />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.product_on_hold} onChange={(e) => setF("product_on_hold", e.target.checked)} className="w-4 h-4 accent-red-600" />
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Producto retenido / en cuarentena</span>
              </label>
              {form.product_on_hold && (
                <div>
                  <label className="block text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1.5 uppercase tracking-wide">Disposición</label>
                  <div className="flex gap-2 flex-wrap">
                    {["release","rework","destroy","pending"].map((d) => (
                      <button key={d} type="button" onClick={() => setF("disposition", d)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
                          form.disposition === d
                            ? d === "destroy" ? "bg-red-600 border-red-600 text-white"
                              : d === "release" ? "bg-green-600 border-green-600 text-white"
                              : "bg-amber-500 border-amber-500 text-white"
                            : "border-red-200 dark:border-red-700 text-slate-900 dark:text-slate-100 hover:bg-red-100"
                        }`}>
                        {d === "release" ? "Liberar" : d === "rework" ? "Re-proceso" : d === "destroy" ? "Destruir" : "Pendiente"}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

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
          <button type="button" onClick={() => router.back()} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancelar</button>
          <button type="submit" disabled={isPending} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white text-sm font-bold shadow-sm transition-all">
            {isPending ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando…</> : <><Save className="w-4 h-4" />Guardar prueba</>}
          </button>
        </div>
      </form>
    </div>
  )
}
