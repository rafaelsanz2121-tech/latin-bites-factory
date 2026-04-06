"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import Link from "next/link"
import { ArrowLeft, Microscope, Loader2, AlertTriangle } from "lucide-react"

const ZONES = [
  { value: 1, label: "Zona 1 — Contacto directo con producto (mensual)", color: "border-red-400 bg-red-50 dark:bg-red-900/20" },
  { value: 2, label: "Zona 2 — Superficies adyacentes (semanal)",        color: "border-orange-400 bg-orange-50 dark:bg-orange-900/20" },
  { value: 3, label: "Zona 3 — Ambiente cercano a la línea (semanal)",   color: "border-amber-400 bg-amber-50 dark:bg-amber-900/20" },
  { value: 4, label: "Zona 4 — Áreas remotas / desagües (mensual)",      color: "border-blue-400 bg-blue-50 dark:bg-blue-900/20" },
]

const SURFACE_TYPES = [
  { value: "food_contact",     label: "Contacto directo con alimento" },
  { value: "non_food_contact", label: "Sin contacto directo" },
  { value: "drain",            label: "Desagüe / Drenaje" },
  { value: "air",              label: "Aire / Ambiente" },
  { value: "utensil",          label: "Utensilio / Herramienta" },
  { value: "hand_contact",     label: "Contacto manual (guantes, etc.)" },
]

const TEST_METHODS = [
  "3M Petrifilm",
  "PCR (Polymerase Chain Reaction)",
  "ELISA",
  "BAX System",
  "RapidChek",
  "Neogen Soleris",
  "Cultivo en placa (tradicional)",
  "Otro",
]

const COMMON_LOCATIONS = [
  "Banda transportadora principal",
  "Mesa de empaque #1",
  "Mesa de empaque #2",
  "Cuchillo / Rebanadora",
  "Molde de producto",
  "Guantes de operador",
  "Piso área de producción",
  "Desagüe línea principal",
  "Desagüe área de refrigeración",
  "Pared área de empaque",
  "Refrigerador principal",
  "Cuarto frío",
  "Área de recepción MP",
  "Otro (especificar en notas)",
]

export default function NuevaListeriaMuestraPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    sample_date:  new Date().toISOString().split("T")[0],
    zone:         1,
    location:     "",
    surface_type: "food_contact",
    test_method:  "3M Petrifilm",
    result:       "pending" as "negative" | "positive" | "pending",
    action_taken: "",
    area_sanitized: false,
    product_on_hold: false,
    lot_on_hold:  "",
    retest_required: false,
    retest_date:  "",
    notes:        "",
  })

  function set(field: string, value: any) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  const isPositive = form.result === "positive"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.location.trim()) { toast.error("Especifica la ubicación"); return }
    if (isPositive && !form.action_taken.trim()) {
      toast.error("Un resultado positivo requiere documentar la acción correctiva tomada")
      return
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from("listeria_samples").insert({
        sample_date:     form.sample_date,
        zone:            form.zone,
        location:        form.location.trim(),
        surface_type:    form.surface_type,
        test_method:     form.test_method,
        result:          form.result,
        action_taken:    form.action_taken.trim() || null,
        area_sanitized:  form.area_sanitized,
        product_on_hold: form.product_on_hold,
        lot_on_hold:     form.lot_on_hold.trim() || null,
        retest_required: form.retest_required,
        retest_date:     form.retest_date || null,
        notes:           form.notes.trim() || null,
        collected_by:    user?.id,
      })
      if (error) throw error
      toast.success(isPositive
        ? "⚠️ Muestra positiva registrada — acción correctiva documentada"
        : "Muestra registrada correctamente"
      )
      router.push("/listeria")
    } catch (err: any) {
      toast.error(err.message ?? "Error al guardar")
    } finally {
      setLoading(false)
    }
  }

  const selectedZone = ZONES.find((z) => z.value === form.zone)!

  return (
    <div className="max-w-[720px] space-y-5">
      <div>
        <Link href="/listeria" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 mb-3 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Volver
        </Link>
        <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
            <Microscope className="w-4 h-4 text-purple-600" />
          </span>
          Registrar Muestra Ambiental
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-300 mt-1">9 CFR 430.4 — Listeria monocytogenes Environmental Monitoring</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Zone selector */}
        <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Zona de muestreo *</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ZONES.map((z) => (
              <button
                key={z.value}
                type="button"
                onClick={() => set("zone", z.value)}
                className={`text-left px-4 py-3 rounded-xl border-2 transition-all ${
                  form.zone === z.value ? z.color + " border-current" : "border-slate-100 dark:border-slate-700 hover:border-slate-300"
                }`}
              >
                <span className="text-[12.5px] font-bold text-slate-700 dark:text-slate-200">{z.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Date + Location + Surface */}
        <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm space-y-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Detalles de la muestra</p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Fecha de muestreo *
              </label>
              <input
                type="date"
                value={form.sample_date}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => set("sample_date", e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-purple-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Método de prueba *
              </label>
              <select
                value={form.test_method}
                onChange={(e) => set("test_method", e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-purple-400 transition-colors"
              >
                {TEST_METHODS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Ubicación específica *
            </label>
            <select
              value={COMMON_LOCATIONS.includes(form.location) ? form.location : "custom"}
              onChange={(e) => {
                if (e.target.value !== "custom") set("location", e.target.value)
              }}
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-purple-400 transition-colors mb-2"
            >
              <option value="custom">— Escribe la ubicación —</option>
              {COMMON_LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <input
              type="text"
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="Ej: Banda transportadora #2, mesa de corte izquierda..."
              required
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-300 focus:outline-none focus:border-purple-400 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Tipo de superficie *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SURFACE_TYPES.map((st) => (
                <button
                  key={st.value}
                  type="button"
                  onClick={() => set("surface_type", st.value)}
                  className={`px-3 py-2 rounded-lg border text-[11.5px] font-semibold transition-all text-left ${
                    form.surface_type === st.value
                      ? "border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                      : "border-slate-200 dark:border-slate-600 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Result */}
        <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm space-y-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Resultado de laboratorio</p>

          <div className="grid grid-cols-3 gap-3">
            {[
              { value: "negative", label: "Negativo ✓", color: "border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300" },
              { value: "positive", label: "⚠ Positivo", color: "border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300" },
              { value: "pending",  label: "Pendiente",  color: "border-amber-400 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" },
            ].map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => set("result", r.value)}
                className={`py-3 rounded-xl border-2 font-bold text-sm transition-all ${
                  form.result === r.value ? r.color : "border-slate-200 dark:border-slate-600 text-slate-400 hover:border-slate-300"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Corrective action — shown only when positive */}
        {isPositive && (
          <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <p className="text-sm font-black text-red-800 dark:text-red-200">
                Acción Correctiva Obligatoria — 9 CFR 430.4
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-red-700 dark:text-red-300 uppercase tracking-wider mb-1.5">
                Acción correctiva tomada *
              </label>
              <textarea
                value={form.action_taken}
                onChange={(e) => set("action_taken", e.target.value)}
                rows={3}
                required={isPositive}
                placeholder="Describe la acción: limpieza intensiva, sanitización, retiro del producto, re-muestreo programado..."
                className="w-full px-3 py-2.5 border border-red-300 dark:border-red-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-300 focus:outline-none focus:border-red-500 resize-none transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800/60 rounded-lg border border-red-200 cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                <input
                  type="checkbox"
                  checked={form.area_sanitized}
                  onChange={(e) => set("area_sanitized", e.target.checked)}
                  className="w-4 h-4 rounded accent-red-600"
                />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Área sanitizada</span>
              </label>
              <label className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800/60 rounded-lg border border-red-200 cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                <input
                  type="checkbox"
                  checked={form.product_on_hold}
                  onChange={(e) => set("product_on_hold", e.target.checked)}
                  className="w-4 h-4 rounded accent-red-600"
                />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Producto en HOLD</span>
              </label>
            </div>

            {form.product_on_hold && (
              <div>
                <label className="block text-xs font-bold text-red-700 dark:text-red-300 uppercase tracking-wider mb-1.5">
                  Lote(s) en retención
                </label>
                <input
                  type="text"
                  value={form.lot_on_hold}
                  onChange={(e) => set("lot_on_hold", e.target.value)}
                  placeholder="Ej: LOT-2026-042, LOT-2026-043"
                  className="w-full px-3 py-2.5 border border-red-300 dark:border-red-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-300 focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800/60 rounded-lg border border-red-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.retest_required}
                  onChange={(e) => set("retest_required", e.target.checked)}
                  className="w-4 h-4 rounded accent-red-600"
                />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Re-muestreo requerido</span>
              </label>
              {form.retest_required && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Fecha de re-muestreo</label>
                  <input
                    type="date"
                    value={form.retest_date}
                    onChange={(e) => set("retest_date", e.target.value)}
                    className="w-full px-3 py-2.5 border border-red-300 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Notas adicionales
          </label>
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={2}
            placeholder="Condiciones del área, observaciones visuales, hora de muestreo..."
            className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-300 focus:outline-none focus:border-purple-400 transition-colors resize-none"
          />
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <Link href="/listeria" className="px-5 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors">
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-60 shadow-sm"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando…</>
              : <><Microscope className="w-4 h-4" /> {isPositive ? "Guardar + Documentar Acción" : "Guardar Muestra"}</>
            }
          </button>
        </div>
      </form>
    </div>
  )
}
