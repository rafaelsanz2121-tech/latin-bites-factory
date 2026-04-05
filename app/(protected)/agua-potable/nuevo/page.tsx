"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  ChevronLeft, Save, AlertCircle, CheckCircle2,
  Droplets, FlaskConical, Thermometer, Activity,
} from "lucide-react"
import Link from "next/link"

const TEST_TYPES = [
  { value: "daily_chlorine",          label: "Cloro diario",               freq: "Diario" },
  { value: "monthly_bacteriological", label: "Bacteriológico mensual",      freq: "Mensual" },
  { value: "quarterly_chemical",      label: "Químico trimestral",          freq: "Trimestral" },
  { value: "annual_full",             label: "Análisis anual completo",     freq: "Anual" },
  { value: "complaint",               label: "Por queja / incidente",       freq: "Ad-hoc" },
]
const WATER_SOURCES = [
  { value: "municipal", label: "Municipal (red pública)" },
  { value: "well",      label: "Pozo" },
  { value: "surface",   label: "Superficial" },
  { value: "other",     label: "Otro" },
]
const SAMPLE_LOCATIONS = [
  "Entrada principal (backflow preventer)",
  "Cocina — pila de proceso",
  "Área de empaque",
  "Cuarto frío",
  "Sanitarios",
  "Lavamanos exterior",
  "Manguera proceso",
  "Tanque de almacenamiento",
  "Otro",
]

function clCheck(v: string) {
  const n = parseFloat(v)
  if (isNaN(n)) return null
  if (n < 0.2) return "bajo"
  if (n > 4.0) return "alto"
  return "ok"
}
function phCheck(v: string) {
  const n = parseFloat(v)
  if (isNaN(n)) return null
  if (n < 6.5 || n > 8.5) return "fuera"
  return "ok"
}

export default function NuevaAguaPotablePage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const today = new Date().toISOString().split("T")[0]
  const nowTime = new Date().toTimeString().slice(0, 5)

  const [form, setForm] = useState({
    test_date:              today,
    test_time:              nowTime,
    test_type:              "daily_chlorine",
    water_source:           "municipal",
    sample_location:        "",
    custom_location:        "",
    chlorine_residual_ppm:  "",
    water_pressure_psi:     "",
    water_temp_f:           "",
    ph:                     "",
    turbidity_ntu:          "",
    coliform_result:        "pending",
    e_coli_result:          "pending",
    result:                 "pending",
    corrective_action:      "",
    tested_by_name:         "",
    lab_name:               "",
    lab_report_url:         "",
    notes:                  "",
  })

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))

  const clStatus = clCheck(form.chlorine_residual_ppm)
  const phStatus = phCheck(form.ph)

  const isBact = ["monthly_bacteriological", "quarterly_chemical", "annual_full"].includes(form.test_type)

  const autoResult = (): "pass" | "fail" | "pending" => {
    if (form.coliform_result === "present" || form.e_coli_result === "present") return "fail"
    if (clStatus === "bajo" || clStatus === "alto") return "fail"
    if (phStatus === "fuera") return "fail"
    if (form.test_type === "daily_chlorine" && form.chlorine_residual_ppm === "") return "pending"
    if (isBact && (form.coliform_result === "pending" || form.e_coli_result === "pending")) return "pending"
    return "pass"
  }

  const computedResult = autoResult()
  const location = form.sample_location === "Otro" ? form.custom_location : form.sample_location

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.sample_location) { setError("Selecciona un punto de muestreo."); return }
    if (!location.trim()) { setError("Especifica el punto de muestreo."); return }
    setSaving(true)
    setError(null)
    try {
      const supabase = createClient()
      const payload: Record<string, any> = {
        test_date:        form.test_date,
        test_time:        form.test_time,
        test_type:        form.test_type,
        water_source:     form.water_source,
        sample_location:  location.trim(),
        result:           computedResult,
        notes:            form.notes || null,
      }
      if (form.chlorine_residual_ppm) payload.chlorine_residual_ppm = parseFloat(form.chlorine_residual_ppm)
      if (form.water_pressure_psi)    payload.water_pressure_psi    = parseFloat(form.water_pressure_psi)
      if (form.water_temp_f)          payload.water_temp_f          = parseFloat(form.water_temp_f)
      if (form.ph)                    payload.ph                    = parseFloat(form.ph)
      if (form.turbidity_ntu)         payload.turbidity_ntu         = parseFloat(form.turbidity_ntu)
      if (isBact) {
        payload.coliform_result = form.coliform_result
        payload.e_coli_result   = form.e_coli_result
      }
      if (computedResult === "fail" && form.corrective_action.trim()) {
        payload.corrective_action = form.corrective_action.trim()
      }
      if (form.lab_name)       payload.lab_name       = form.lab_name
      if (form.lab_report_url) payload.lab_report_url = form.lab_report_url

      const { error: err } = await supabase.from("water_testing_logs").insert(payload)
      if (err) throw err
      router.push("/agua-potable")
    } catch (e: any) {
      setError(e.message ?? "Error al guardar.")
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/agua-potable" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Droplets className="w-5 h-5 text-blue-600" />
            Nueva Prueba de Agua
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">9 CFR 416.4 · Potabilidad del agua de proceso</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Test type */}
        <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-blue-500" />
            Tipo de prueba
          </h2>
          <div className="grid grid-cols-1 gap-2">
            {TEST_TYPES.map((t) => (
              <label
                key={t.value}
                className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all ${
                  form.test_type === t.value
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-slate-100 dark:border-slate-700 hover:border-blue-200"
                }`}
              >
                <input type="radio" className="sr-only" value={t.value} checked={form.test_type === t.value} onChange={(e) => set("test_type", e.target.value)} />
                <span className={`text-sm font-semibold ${form.test_type === t.value ? "text-blue-700 dark:text-blue-300" : "text-slate-700 dark:text-slate-200"}`}>{t.label}</span>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">{t.freq}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Date / time / source / location */}
        <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">Información general</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Fecha *</label>
              <input type="date" required value={form.test_date} onChange={(e) => set("test_date", e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Hora *</label>
              <input type="time" required value={form.test_time} onChange={(e) => set("test_time", e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Fuente de agua *</label>
            <select value={form.water_source} onChange={(e) => set("water_source", e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none">
              {WATER_SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Punto de muestreo *</label>
            <select value={form.sample_location} onChange={(e) => set("sample_location", e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">Seleccionar...</option>
              {SAMPLE_LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          {form.sample_location === "Otro" && (
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Especificar ubicación *</label>
              <input type="text" value={form.custom_location} onChange={(e) => set("custom_location", e.target.value)}
                placeholder="Ej. Línea 3 — grifo de proceso"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          )}
        </div>

        {/* Physical measurements */}
        <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-blue-500" />
            Mediciones físico-químicas
          </h2>

          {/* Chlorine */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
              Cloro residual (ppm) {form.test_type === "daily_chlorine" && <span className="text-red-500">*</span>}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number" step="0.01" min="0" max="10"
                value={form.chlorine_residual_ppm}
                onChange={(e) => set("chlorine_residual_ppm", e.target.value)}
                placeholder="0.00"
                className={`flex-1 px-3 py-2 text-sm rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 ${
                  clStatus === "bajo" || clStatus === "alto"
                    ? "border-red-400 dark:border-red-500"
                    : clStatus === "ok"
                    ? "border-green-400 dark:border-green-500"
                    : "border-slate-200 dark:border-slate-600"
                }`}
              />
              {clStatus === "ok" && <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />}
              {(clStatus === "bajo" || clStatus === "alto") && (
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <span className="text-xs font-bold text-red-600">{clStatus === "bajo" ? "< 0.2 ppm — BAJO" : "> 4.0 ppm — ALTO"}</span>
                </div>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Rango potable: 0.2 – 4.0 ppm (EPA/FSIS)</p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* pH */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">pH</label>
              <input
                type="number" step="0.01" min="0" max="14"
                value={form.ph} onChange={(e) => set("ph", e.target.value)}
                placeholder="7.0"
                className={`w-full px-3 py-2 text-sm rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 ${
                  phStatus === "fuera" ? "border-red-400 dark:border-red-500" : phStatus === "ok" ? "border-green-400 dark:border-green-500" : "border-slate-200 dark:border-slate-600"
                }`}
              />
              <p className="text-[10px] text-slate-400 mt-1">6.5 – 8.5</p>
            </div>
            {/* Turbidity */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Turbidez (NTU)</label>
              <input type="number" step="0.001" min="0" value={form.turbidity_ntu} onChange={(e) => set("turbidity_ntu", e.target.value)}
                placeholder="0.000"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none" />
              <p className="text-[10px] text-slate-400 mt-1">{"< 0.3 NTU"}</p>
            </div>
            {/* Temp */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Temp (°F)</label>
              <input type="number" step="0.1" value={form.water_temp_f} onChange={(e) => set("water_temp_f", e.target.value)}
                placeholder="50.0"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>

          {/* Pressure */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Presión (PSI)</label>
            <input type="number" step="0.1" min="0" value={form.water_pressure_psi} onChange={(e) => set("water_pressure_psi", e.target.value)}
              placeholder="40.0"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none" />
            <p className="text-[10px] text-slate-400 mt-1">Mínimo recomendado: 20 PSI</p>
          </div>
        </div>

        {/* Bacteriological (conditional) */}
        {isBact && (
          <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-500" />
              Resultados bacteriológicos
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: "coliform_result", label: "Coliformes totales" },
                { key: "e_coli_result",   label: "E. coli" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">{label}</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { value: "absent",  label: "Ausente",   color: "green" },
                      { value: "present", label: "PRESENTE",  color: "red"   },
                      { value: "pending", label: "Pendiente", color: "amber" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => set(key, opt.value)}
                        className={`py-1.5 text-xs font-bold rounded-lg border-2 transition-all ${
                          (form as any)[key] === opt.value
                            ? opt.color === "green"
                              ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300"
                              : opt.color === "red"
                              ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300"
                              : "border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
                            : "border-slate-100 dark:border-slate-700 text-slate-500 hover:border-slate-300"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {(form.coliform_result === "present" || form.e_coli_result === "present") && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 dark:text-red-300 font-semibold">
                  Resultado positivo detectado. Notificar de inmediato al supervisor y detener el procesamiento hasta resolver. Documentar acción correctiva.
                </p>
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Laboratorio</label>
              <input type="text" value={form.lab_name} onChange={(e) => set("lab_name", e.target.value)}
                placeholder="Nombre del laboratorio acreditado"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">URL del informe de laboratorio</label>
              <input type="url" value={form.lab_report_url} onChange={(e) => set("lab_report_url", e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
        )}

        {/* Auto result */}
        <div className={`rounded-xl px-5 py-4 border-2 flex items-center gap-4 ${
          computedResult === "pass"
            ? "bg-green-50 dark:bg-green-900/20 border-green-400"
            : computedResult === "fail"
            ? "bg-red-50 dark:bg-red-900/20 border-red-400"
            : "bg-amber-50 dark:bg-amber-900/20 border-amber-300"
        }`}>
          {computedResult === "pass"
            ? <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
            : computedResult === "fail"
            ? <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
            : <Activity className="w-6 h-6 text-amber-500 flex-shrink-0" />}
          <div>
            <p className={`text-sm font-black ${
              computedResult === "pass" ? "text-green-700 dark:text-green-300"
              : computedResult === "fail" ? "text-red-700 dark:text-red-300"
              : "text-amber-700 dark:text-amber-300"
            }`}>
              {computedResult === "pass" ? "AGUA POTABLE — PASA"
               : computedResult === "fail" ? "FUERA DE RANGO — FALLA"
               : "RESULTADO PENDIENTE"}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {computedResult === "pending" ? "Resultado se actualizará al recibir resultados de laboratorio." : "Calculado automáticamente a partir de los parámetros ingresados."}
            </p>
          </div>
        </div>

        {/* Corrective action */}
        {computedResult === "fail" && (
          <div className="bg-white dark:bg-[#111827] rounded-xl border border-red-200 dark:border-red-800 p-5 space-y-3">
            <h2 className="text-sm font-bold text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Acción correctiva requerida
            </h2>
            <textarea
              rows={3}
              value={form.corrective_action}
              onChange={(e) => set("corrective_action", e.target.value)}
              placeholder="Describe las acciones tomadas: detención del proceso, retratamiento, notificación al supervisor, contacto con proveedor municipal, etc."
              className="w-full px-3 py-2 text-sm rounded-lg border border-red-200 dark:border-red-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-red-400 outline-none resize-none"
            />
          </div>
        )}

        {/* Sign-off + notes */}
        <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">Firma y observaciones</h2>
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Nombre del inspector</label>
            <input type="text" value={form.tested_by_name} onChange={(e) => set("tested_by_name", e.target.value)}
              placeholder="Nombre completo"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Observaciones</label>
            <textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)}
              placeholder="Condiciones del día, equipo usado, etc."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        <div className="flex gap-3 pb-8">
          <Link href="/agua-potable"
            className="flex-1 py-2.5 text-sm font-bold text-center text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors">
            Cancelar
          </Link>
          <button type="submit" disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-xl transition-colors">
            <Save className="w-4 h-4" />
            {saving ? "Guardando…" : "Guardar prueba"}
          </button>
        </div>
      </form>
    </div>
  )
}
