"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  ChevronLeft, Save, AlertCircle, CheckCircle2,
  Heart, ShieldCheck, AlertTriangle,
} from "lucide-react"
import Link from "next/link"

const SHIFTS = [
  { value: "morning",   label: "Turno Mañana",   time: "5:00am – 1:00pm" },
  { value: "afternoon", label: "Turno Tarde",     time: "1:00pm – 9:00pm" },
  { value: "night",     label: "Turno Noche",     time: "9:00pm – 5:00am" },
  { value: "split",     label: "Partido",         time: "Horario especial" },
]

const SYMPTOMS = [
  {
    key:   "has_vomiting",
    label: "Vómito",
    desc:  "Episodios de vómito activo o en las últimas 24 horas",
    emoji: "🤢",
  },
  {
    key:   "has_diarrhea",
    label: "Diarrea",
    desc:  "Diarrea activa o en las últimas 24 horas",
    emoji: "🚽",
  },
  {
    key:   "has_jaundice",
    label: "Ictericia",
    desc:  "Coloración amarillenta de piel o ojos",
    emoji: "🟡",
  },
  {
    key:   "has_sore_throat_fever",
    label: "Dolor de garganta + fiebre",
    desc:  "Ambos síntomas presentes simultáneamente",
    emoji: "🌡️",
  },
  {
    key:   "has_infected_wound",
    label: "Herida infectada",
    desc:  "Lesión abierta, con pus o señales de infección expuesta",
    emoji: "🩹",
  },
]

export default function NuevaSaludPersonalPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const today = new Date().toISOString().split("T")[0]
  const nowTime = new Date().toTimeString().slice(0, 5)

  const [form, setForm] = useState({
    declaration_date:     today,
    declaration_time:     nowTime,
    shift:                "morning",
    symptom_free:         true,
    has_vomiting:         false,
    has_diarrhea:         false,
    has_jaundice:         false,
    has_sore_throat_fever:false,
    has_infected_wound:   false,
    cleared_to_work:      true,
    restriction_note:     "",
    notes:                "",
  })

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }))

  const hasAnySymptom = form.has_vomiting || form.has_diarrhea || form.has_jaundice ||
    form.has_sore_throat_fever || form.has_infected_wound

  const toggleSymptom = (key: string) => {
    const next = !(form as any)[key]
    const newForm = { ...form, [key]: next }
    // If any symptom is active, mark symptom_free = false and auto-suggest exclusion
    const anyActive = newForm.has_vomiting || newForm.has_diarrhea || newForm.has_jaundice ||
      newForm.has_sore_throat_fever || newForm.has_infected_wound
    setForm({
      ...newForm,
      symptom_free:    !anyActive,
      cleared_to_work: !anyActive,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.symptom_free && form.cleared_to_work && !form.restriction_note.trim()) {
      setError("Si el empleado tiene síntomas pero se habilita con restricción, especifica la restricción."); return
    }
    setSaving(true)
    setError(null)
    try {
      const supabase = createClient()
      const payload: Record<string, any> = {
        declaration_date:      form.declaration_date,
        declaration_time:      form.declaration_time,
        shift:                 form.shift,
        symptom_free:          form.symptom_free,
        has_vomiting:          form.has_vomiting,
        has_diarrhea:          form.has_diarrhea,
        has_jaundice:          form.has_jaundice,
        has_sore_throat_fever: form.has_sore_throat_fever,
        has_infected_wound:    form.has_infected_wound,
        cleared_to_work:       form.cleared_to_work,
        restriction_note:      form.restriction_note.trim() || null,
        notes:                 form.notes.trim() || null,
      }

      const { error: err } = await supabase.from("health_declarations").insert(payload)
      if (err) throw err
      router.push("/salud-personal")
    } catch (e: any) {
      setError(e.message ?? "Error al guardar.")
      setSaving(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/salud-personal" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-600" />
            Declaración de Salud
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">9 CFR 416.8 · Verificación antes de ingresar al área de proceso</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Date / time / shift */}
        <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">Información del turno</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Fecha *</label>
              <input type="date" required value={form.declaration_date} onChange={(e) => set("declaration_date", e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-rose-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Hora *</label>
              <input type="time" required value={form.declaration_time} onChange={(e) => set("declaration_time", e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-rose-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Turno *</label>
            <div className="grid grid-cols-2 gap-2">
              {SHIFTS.map((s) => (
                <label
                  key={s.value}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 cursor-pointer transition-all ${
                    form.shift === s.value
                      ? "border-rose-500 bg-rose-50 dark:bg-rose-900/20"
                      : "border-slate-100 dark:border-slate-700 hover:border-rose-200"
                  }`}
                >
                  <input type="radio" className="sr-only" value={s.value} checked={form.shift === s.value} onChange={(e) => set("shift", e.target.value)} />
                  <span className={`text-sm font-semibold ${form.shift === s.value ? "text-rose-700 dark:text-rose-300" : "text-slate-700 dark:text-slate-200"}`}>{s.label}</span>
                  <span className="text-[10px] text-slate-400">{s.time}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Health screening */}
        <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-rose-500" />
              Verificación de síntomas
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Marca cualquier síntoma presente. La presencia de <strong>cualquiera</strong> de estos síntomas requiere exclusión del área de proceso (9 CFR 416.8).
            </p>
          </div>

          <div className="space-y-2">
            {SYMPTOMS.map((sym) => {
              const active = (form as any)[sym.key] as boolean
              return (
                <button
                  key={sym.key}
                  type="button"
                  onClick={() => toggleSymptom(sym.key)}
                  className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border-2 transition-all text-left ${
                    active
                      ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                      : "border-slate-100 dark:border-slate-700 hover:border-rose-200 hover:bg-rose-50/50 dark:hover:bg-rose-900/10"
                  }`}
                >
                  <span className="text-2xl leading-none flex-shrink-0">{sym.emoji}</span>
                  <div className="flex-1">
                    <p className={`text-sm font-bold ${active ? "text-red-700 dark:text-red-300" : "text-slate-700 dark:text-slate-200"}`}>{sym.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{sym.desc}</p>
                  </div>
                  <div className={`w-6 h-6 rounded-full flex-shrink-0 border-2 flex items-center justify-center transition-all ${
                    active ? "border-red-500 bg-red-500" : "border-slate-200 dark:border-slate-600"
                  }`}>
                    {active && <span className="text-white text-xs font-black">✓</span>}
                  </div>
                </button>
              )
            })}
          </div>

          {/* No symptoms button */}
          {!hasAnySymptom && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
              <p className="text-sm font-semibold text-green-700 dark:text-green-300">
                Sin síntomas reportados — empleado libre de los 5 síntomas de exclusión.
              </p>
            </div>
          )}
        </div>

        {/* Clearance decision */}
        {hasAnySymptom && (
          <div className="bg-white dark:bg-[#111827] rounded-xl border border-red-200 dark:border-red-800 p-5 space-y-4">
            <h2 className="text-sm font-bold text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Decisión de supervisión
            </h2>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
              <p className="text-xs text-red-700 dark:text-red-300 font-semibold">
                ⚠ Los síntomas reportados requieren evaluación supervisora. La exclusión del área de proceso es la acción estándar bajo 9 CFR 416.8.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, cleared_to_work: false }))}
                className={`flex flex-col items-center gap-2 py-4 rounded-xl border-2 font-bold text-sm transition-all ${
                  !form.cleared_to_work
                    ? "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
                    : "border-slate-100 dark:border-slate-700 text-slate-500 hover:border-red-200"
                }`}
              >
                <AlertCircle className="w-5 h-5" />
                Excluir del área de proceso
              </button>
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, cleared_to_work: true }))}
                className={`flex flex-col items-center gap-2 py-4 rounded-xl border-2 font-bold text-sm transition-all ${
                  form.cleared_to_work
                    ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300"
                    : "border-slate-100 dark:border-slate-700 text-slate-500 hover:border-amber-200"
                }`}
              >
                <ShieldCheck className="w-5 h-5" />
                Habilitar con restricción
              </button>
            </div>
            {form.cleared_to_work && (
              <div>
                <label className="block text-xs font-bold text-amber-600 mb-1.5 uppercase tracking-wide">Especificar restricción *</label>
                <textarea
                  rows={2}
                  value={form.restriction_note}
                  onChange={(e) => set("restriction_note", e.target.value)}
                  placeholder="Ej. Solo áreas no contacto con alimentos — tareas de mantenimiento / limpieza de exteriores"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-amber-200 dark:border-amber-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-400 outline-none resize-none"
                />
              </div>
            )}
          </div>
        )}

        {/* Result summary */}
        <div className={`rounded-xl px-5 py-4 border-2 flex items-center gap-4 ${
          !hasAnySymptom
            ? "bg-green-50 dark:bg-green-900/20 border-green-400"
            : !form.cleared_to_work
            ? "bg-red-50 dark:bg-red-900/20 border-red-400"
            : "bg-amber-50 dark:bg-amber-900/20 border-amber-300"
        }`}>
          {!hasAnySymptom
            ? <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
            : !form.cleared_to_work
            ? <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
            : <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0" />}
          <div>
            <p className={`text-sm font-black ${
              !hasAnySymptom ? "text-green-700 dark:text-green-300"
              : !form.cleared_to_work ? "text-red-700 dark:text-red-300"
              : "text-amber-700 dark:text-amber-300"
            }`}>
              {!hasAnySymptom
                ? "HABILITADO — Sin síntomas de exclusión"
                : !form.cleared_to_work
                ? "EXCLUIDO — No puede ingresar al área de proceso"
                : "HABILITADO CON RESTRICCIÓN — Solo áreas no-contacto"}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {!hasAnySymptom
                ? "El empleado puede ingresar al área de proceso normalmente."
                : !form.cleared_to_work
                ? "Documentar y notificar al supervisor. El empleado no puede manipular alimentos."
                : "Asegúrate de que la restricción sea específica y supervisada."}
            </p>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 p-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">Observaciones adicionales</h2>
          <textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)}
            placeholder="Notas adicionales del supervisor, médico de planta, etc."
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-rose-500 outline-none resize-none" />
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        <div className="flex gap-3 pb-8">
          <Link href="/salud-personal"
            className="flex-1 py-2.5 text-sm font-bold text-center text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors">
            Cancelar
          </Link>
          <button type="submit" disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-60 rounded-xl transition-colors">
            <Save className="w-4 h-4" />
            {saving ? "Guardando…" : "Registrar declaración"}
          </button>
        </div>
      </form>
    </div>
  )
}
