"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  ShieldAlert, ChevronLeft, Save, AlertCircle, CheckCircle2,
  XCircle, FileText,
} from "lucide-react"

const CHECK_TYPES = [
  { value: "changeover",  label: "Cambio de línea", desc: "Entre productos diferentes"     },
  { value: "startup",     label: "Arranque",         desc: "Inicio de turno/producción"    },
  { value: "end_of_run",  label: "Fin de corrida",   desc: "Al terminar producción"        },
  { value: "scheduled",   label: "Programado",       desc: "Verificación de rutina"        },
  { value: "complaint",   label: "Por queja",        desc: "Respuesta a queja de cliente"  },
]

const ALLERGENS = [
  { key: "milk_present",      label: "Leche",    emoji: "🥛" },
  { key: "eggs_present",      label: "Huevo",    emoji: "🥚" },
  { key: "fish_present",      label: "Pescado",  emoji: "🐟" },
  { key: "shellfish_present", label: "Mariscos", emoji: "🦐" },
  { key: "tree_nuts_present", label: "Nueces",   emoji: "🌰" },
  { key: "peanuts_present",   label: "Cacahuate",emoji: "🥜" },
  { key: "wheat_present",     label: "Trigo",    emoji: "🌾" },
  { key: "soy_present",       label: "Soya",     emoji: "🫘" },
  { key: "sesame_present",    label: "Sésamo",   emoji: "🌱" },
]

const RINSATE = [
  { value: "pass",         label: "Pasa",         color: "border-green-300 bg-green-50 text-green-700 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300" },
  { value: "fail",         label: "Falla",        color: "border-red-300 bg-red-50 text-red-700 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300" },
  { value: "not_required", label: "No requerido", color: "border-slate-200 bg-slate-50 text-slate-600 dark:bg-slate-700/30 dark:border-slate-600 dark:text-slate-300" },
]

export default function NuevoAlergenos() {
  const router   = useRouter()
  const supabase = createClient()
  const [isPending, startTransition] = useTransition()

  const now   = new Date()
  const today = now.toISOString().split("T")[0]
  const hhmm  = now.toTimeString().slice(0, 5)

  const [form, setForm] = useState({
    check_date:      today,
    check_time:      hhmm,
    check_type:      "changeover",
    area:            "",
    product_before:  "",
    product_after:   "",
    equipment_cleaned:    false,
    label_reviewed:       false,
    rinsate_sample_taken: false,
    rinsate_result:  "",
    cleared_for_run: true,
    hold_reason:     "",
    corrective_action: "",
    notes:           "",
  })

  const [allergens, setAllergens] = useState<Record<string, boolean>>(
    Object.fromEntries(ALLERGENS.map((a) => [a.key, false]))
  )

  const [error,   setError]   = useState("")
  const [success, setSuccess] = useState(false)

  function setF(k: string, v: string | boolean) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  const anyAllergenPresent = Object.values(allergens).some(Boolean)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!form.area.trim()) return setError("Indica el área de producción.")
    if (!form.cleared_for_run && !form.hold_reason.trim())
      return setError("Indica el motivo de retención cuando la línea no está habilitada.")

    startTransition(async () => {
      const { error: dbErr } = await supabase.from("allergen_checks").insert({
        check_date:           form.check_date,
        check_time:           form.check_time,
        check_type:           form.check_type,
        area:                 form.area.trim(),
        product_before:       form.product_before || null,
        product_after:        form.product_after  || null,
        ...allergens,
        equipment_cleaned:    form.equipment_cleaned,
        label_reviewed:       form.label_reviewed,
        rinsate_sample_taken: form.rinsate_sample_taken,
        rinsate_result:       form.rinsate_sample_taken ? (form.rinsate_result || null) : null,
        cleared_for_run:      form.cleared_for_run,
        hold_reason:          !form.cleared_for_run ? form.hold_reason || null : null,
        corrective_action:    !form.cleared_for_run ? form.corrective_action || null : null,
        notes:                form.notes || null,
      })
      if (dbErr) { setError(dbErr.message); return }
      setSuccess(true)
      setTimeout(() => router.push("/alergenos"), 1000)
    })
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <p className="text-lg font-bold text-slate-800 dark:text-slate-100">Chequeo registrado</p>
        <p className="text-sm text-slate-600 dark:text-slate-300">Redirigiendo…</p>
      </div>
    )
  }

  const inputCls = "w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-400"
  const cardCls  = "bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden"

  return (
    <div className="max-w-[760px] space-y-6">

      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => router.back()} className="mt-0.5 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-orange-600" />
            </span>
            Nuevo Chequeo de Alérgenos
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">FALCPA 2004 · Sesame 2023</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Basic info */}
        <div className={cardCls}>
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Información del chequeo</span>
          </div>
          <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Fecha *</label>
              <input type="date" value={form.check_date} max={today} onChange={(e) => setF("check_date", e.target.value)} required className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Hora *</label>
              <input type="time" value={form.check_time} onChange={(e) => setF("check_time", e.target.value)} required className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Área *</label>
              <input type="text" value={form.area} onChange={(e) => setF("area", e.target.value)} required placeholder="Ej. Línea 1 — Empaque" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Producto anterior</label>
              <input type="text" value={form.product_before} onChange={(e) => setF("product_before", e.target.value)} placeholder="Producto previo" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Producto siguiente</label>
              <input type="text" value={form.product_after} onChange={(e) => setF("product_after", e.target.value)} placeholder="Producto a correr" className={inputCls} />
            </div>
          </div>
        </div>

        {/* Check type */}
        <div className={cardCls}>
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Tipo de chequeo</span>
          </div>
          <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CHECK_TYPES.map((ct) => (
              <button key={ct.value} type="button" onClick={() => setF("check_type", ct.value)}
                className={`text-left px-4 py-3 rounded-xl border-2 text-sm transition-all ${
                  form.check_type === ct.value
                    ? "border-orange-400 bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 font-semibold shadow-sm"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
                }`}>
                <span className="block font-medium">{ct.label}</span>
                <span className="text-[11px] opacity-70">{ct.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Allergen presence */}
        <div className={cardCls}>
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">¿Alérgenos presentes en el área?</span>
            {anyAllergenPresent && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                ⚠ {Object.values(allergens).filter(Boolean).length} presente{Object.values(allergens).filter(Boolean).length > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="p-5">
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">Marca los alérgenos que están o estuvieron presentes en el equipo/área antes de este chequeo.</p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {ALLERGENS.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => setAllergens((p) => ({ ...p, [a.key]: !p[a.key] }))}
                  className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl border-2 text-xs font-semibold transition-all ${
                    allergens[a.key]
                      ? "border-orange-400 bg-orange-100 dark:bg-orange-900/30 text-slate-900 dark:text-slate-100 shadow-sm"
                      : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  <span className="text-lg">{a.emoji}</span>
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Verification steps */}
        <div className={cardCls}>
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Pasos de verificación</span>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex flex-col gap-3">
              {[
                { key: "equipment_cleaned",    label: "Equipo y superficies limpiadas y sanitizadas" },
                { key: "label_reviewed",       label: "Etiquetas del producto revisadas para alérgenos" },
                { key: "rinsate_sample_taken", label: "Muestra de enjuague tomada (rinsate test)" },
              ].map((item) => (
                <label key={item.key} className="flex items-center gap-3 cursor-pointer group">
                  <div
                    onClick={() => setF(item.key, !form[item.key as keyof typeof form])}
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                      form[item.key as keyof typeof form]
                        ? "bg-green-500 border-green-500"
                        : "border-slate-300 dark:border-slate-600 group-hover:border-green-400"
                    }`}
                  >
                    {form[item.key as keyof typeof form] && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-sm text-slate-700 dark:text-slate-200">{item.label}</span>
                </label>
              ))}
            </div>

            {form.rinsate_sample_taken && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2 uppercase tracking-wide">Resultado de rinsate</label>
                <div className="flex gap-2 flex-wrap">
                  {RINSATE.map((r) => (
                    <button key={r.value} type="button" onClick={() => setF("rinsate_result", r.value)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-all ${
                        form.rinsate_result === r.value ? r.color : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Clearance decision */}
        <div className={`rounded-xl border-2 overflow-hidden transition-all ${
          form.cleared_for_run
            ? "border-green-200 dark:border-green-800 bg-white dark:bg-[#111827]"
            : "border-red-200 dark:border-red-800 bg-white dark:bg-[#111827]"
        }`}>
          <div className="px-5 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">¿Línea habilitada para correr?</p>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">Confirma que el área está libre de contaminación cruzada de alérgenos</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button type="button" onClick={() => setF("cleared_for_run", true)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                  form.cleared_for_run
                    ? "bg-green-500 border-green-500 text-white shadow-sm"
                    : "border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-green-400"
                }`}>
                <CheckCircle2 className="w-4 h-4" /> Sí
              </button>
              <button type="button" onClick={() => setF("cleared_for_run", false)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                  !form.cleared_for_run
                    ? "bg-red-500 border-red-500 text-white shadow-sm"
                    : "border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-red-400"
                }`}>
                <XCircle className="w-4 h-4" /> No — Retener
              </button>
            </div>
          </div>
          {!form.cleared_for_run && (
            <div className="px-5 pb-5 space-y-3 border-t border-red-200 dark:border-red-800 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1.5 uppercase tracking-wide">Motivo de retención *</label>
                <input type="text" value={form.hold_reason} onChange={(e) => setF("hold_reason", e.target.value)} required={!form.cleared_for_run} placeholder="Describe por qué no está habilitada la línea…" className="w-full border border-red-200 dark:border-red-700 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-400/40" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1.5 uppercase tracking-wide">Acción correctiva</label>
                <textarea value={form.corrective_action} onChange={(e) => setF("corrective_action", e.target.value)} rows={2} placeholder="Pasos tomados o a tomar…" className="w-full border border-red-200 dark:border-red-700 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-400/40 resize-none" />
              </div>
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
          <button type="submit" disabled={isPending} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold shadow-sm transition-all">
            {isPending
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando…</>
              : <><Save className="w-4 h-4" />Guardar chequeo</>
            }
          </button>
        </div>
      </form>
    </div>
  )
}
