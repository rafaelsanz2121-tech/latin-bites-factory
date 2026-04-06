"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Bug, ChevronLeft, Save, AlertCircle, CheckCircle2, FileText } from "lucide-react"

const INSP_TYPES = [
  { value: "routine",        label: "Rutina",          desc: "Inspección regular programada"      },
  { value: "complaint",      label: "Por queja",        desc: "Respuesta a reporte/queja"          },
  { value: "post_treatment", label: "Post-tratamiento", desc: "Después de aplicar tratamiento"     },
  { value: "seasonal",       label: "Estacional",       desc: "Cambio de temporada"                },
  { value: "follow_up",      label: "Seguimiento",      desc: "Verificación de acción previa"      },
]

const FINDINGS_OPTIONS = [
  { value: "none",              label: "Sin hallazgos",   color: "border-green-300 bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100"     },
  { value: "evidence_only",     label: "Solo evidencia",  color: "border-amber-300 bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100"     },
  { value: "activity_observed", label: "Actividad vista", color: "border-orange-300 bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100" },
  { value: "infestation",       label: "Infestación",     color: "border-red-300 bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100"               },
]

const PEST_TYPES = [
  { value: "rodent",           label: "Roedor",          emoji: "🐀" },
  { value: "cockroach",        label: "Cucaracha",       emoji: "🪳" },
  { value: "fly",              label: "Mosca",           emoji: "🪰" },
  { value: "stored_product",   label: "Plaga almacén",   emoji: "🦗" },
  { value: "bird",             label: "Ave",             emoji: "🐦" },
  { value: "other",            label: "Otro",            emoji: "🐛" },
]

const AREAS = [
  "Cocina / Kitchen", "Empaque / Packing", "Almacén seco / Dry Storage",
  "Recepción / Receiving", "Congelador 1", "Congelador 2",
  "Cuarto frío 1", "Cuarto frío 2", "Comedor empleados", "Baños", "Exterior / Outside",
]

export default function NuevoPlagas() {
  const router   = useRouter()
  const supabase = createClient()
  const [isPending, startTransition] = useTransition()

  const today = new Date().toISOString().split("T")[0]
  const in30  = new Date(); in30.setDate(in30.getDate() + 30)
  const in30s = in30.toISOString().split("T")[0]

  const [form, setForm] = useState({
    inspection_date:     today,
    inspection_type:     "routine",
    inspector_type:      "external" as "internal" | "external",
    exterminator_name:   "",
    exterminator_cert:   "",
    traps_checked:       "0",
    traps_with_activity: "0",
    findings:            "none",
    activity_locations:  "",
    treatment_performed: false,
    treatment_type:      "",
    chemicals_used:      "",
    corrective_action:   "",
    next_inspection_date: in30s,
    notes:               "",
  })

  const [selectedAreas, setSelectedAreas]     = useState<string[]>([])
  const [selectedPests, setSelectedPests]     = useState<string[]>([])
  const [error,   setError]   = useState("")
  const [success, setSuccess] = useState(false)

  function setF(k: string, v: string | boolean) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  const hasFindings = form.findings !== "none"

  function toggleArea(a: string) {
    setSelectedAreas((p) => p.includes(a) ? p.filter((x) => x !== a) : [...p, a])
  }
  function togglePest(p: string) {
    setSelectedPests((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (hasFindings && selectedPests.length === 0)
      return setError("Selecciona el tipo de plaga cuando hay hallazgos.")

    startTransition(async () => {
      const { error: dbErr } = await supabase.from("pest_control_logs").insert({
        inspection_date:      form.inspection_date,
        inspection_type:      form.inspection_type,
        inspector_type:       form.inspector_type,
        exterminator_name:    form.exterminator_name || null,
        exterminator_cert:    form.exterminator_cert || null,
        areas_inspected:      selectedAreas.length > 0 ? selectedAreas : null,
        traps_checked:        Number(form.traps_checked) || 0,
        traps_with_activity:  Number(form.traps_with_activity) || 0,
        findings:             form.findings,
        pest_types:           selectedPests.length > 0 ? selectedPests : null,
        activity_locations:   form.activity_locations || null,
        treatment_performed:  form.treatment_performed,
        treatment_type:       form.treatment_performed ? form.treatment_type || null : null,
        chemicals_used:       form.treatment_performed ? form.chemicals_used || null : null,
        corrective_action:    hasFindings ? form.corrective_action || null : null,
        next_inspection_date: form.next_inspection_date || null,
        notes:                form.notes || null,
      })
      if (dbErr) { setError(dbErr.message); return }
      setSuccess(true)
      setTimeout(() => router.push("/plagas"), 1000)
    })
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <p className="text-lg font-bold text-slate-800 dark:text-slate-100">Inspección registrada</p>
        <p className="text-sm text-slate-600 dark:text-slate-300">Redirigiendo…</p>
      </div>
    )
  }

  const inputCls = "w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-500/40 focus:border-lime-400"
  const cardCls  = "bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden"

  return (
    <div className="max-w-[760px] space-y-6">

      <div className="flex items-start gap-4">
        <button onClick={() => router.back()} className="mt-0.5 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-lime-50 dark:bg-lime-900/30 flex items-center justify-center">
              <Bug className="w-4 h-4 text-lime-600" />
            </span>
            Nueva Inspección de Plagas
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">9 CFR 416.2(a)</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Basic */}
        <div className={cardCls}>
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Información de la inspección</span>
          </div>
          <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Fecha *</label>
              <input type="date" value={form.inspection_date} max={today} onChange={(e) => setF("inspection_date", e.target.value)} required className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Tipo de inspector</label>
              <div className="flex gap-2">
                {["internal", "external"].map((t) => (
                  <button key={t} type="button" onClick={() => setF("inspector_type", t)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition-all ${
                      form.inspector_type === t
                        ? "border-lime-400 bg-lime-50 dark:bg-lime-900/20 text-lime-700 dark:text-lime-300"
                        : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300"
                    }`}>
                    {t === "internal" ? "Interno" : "Externo"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Inspector / Empresa</label>
              <input type="text" value={form.exterminator_name} onChange={(e) => setF("exterminator_name", e.target.value)} placeholder="Nombre" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">No. de certificación</label>
              <input type="text" value={form.exterminator_cert} onChange={(e) => setF("exterminator_cert", e.target.value)} placeholder="Cert. de fumigación" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Trampas revisadas</label>
              <input type="number" min={0} value={form.traps_checked} onChange={(e) => setF("traps_checked", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Trampas con actividad</label>
              <input type="number" min={0} value={form.traps_with_activity} onChange={(e) => setF("traps_with_activity", e.target.value)} className={inputCls} />
            </div>
          </div>
        </div>

        {/* Inspection type */}
        <div className={cardCls}>
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Tipo de inspección</span>
          </div>
          <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {INSP_TYPES.map((it) => (
              <button key={it.value} type="button" onClick={() => setF("inspection_type", it.value)}
                className={`text-left px-4 py-3 rounded-xl border-2 text-sm transition-all ${
                  form.inspection_type === it.value
                    ? "border-lime-400 bg-lime-50 dark:bg-lime-900/20 text-lime-700 dark:text-lime-300 font-semibold shadow-sm"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
                }`}>
                <span className="block font-medium">{it.label}</span>
                <span className="text-[11px] opacity-70">{it.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Areas */}
        <div className={cardCls}>
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Áreas inspeccionadas</span>
          </div>
          <div className="p-5 flex flex-wrap gap-2">
            {AREAS.map((a) => (
              <button key={a} type="button" onClick={() => toggleArea(a)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  selectedAreas.includes(a)
                    ? "border-lime-400 bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-300"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300"
                }`}>
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Findings */}
        <div className={cardCls}>
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Hallazgos</span>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {FINDINGS_OPTIONS.map((f) => (
                <button key={f.value} type="button" onClick={() => setF("findings", f.value)}
                  className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                    form.findings === f.value ? f.color + " shadow-sm" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}>
                  {f.label}
                </button>
              ))}
            </div>

            {hasFindings && (
              <>
                <div>
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2 uppercase tracking-wide">Tipo de plaga *</p>
                  <div className="flex flex-wrap gap-2">
                    {PEST_TYPES.map((pt) => (
                      <button key={pt.value} type="button" onClick={() => togglePest(pt.value)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-xs font-semibold transition-all ${
                          selectedPests.includes(pt.value)
                            ? "border-orange-400 bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100"
                            : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300"
                        }`}>
                        <span>{pt.emoji}</span> {pt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Ubicación de la actividad</label>
                  <textarea value={form.activity_locations} onChange={(e) => setF("activity_locations", e.target.value)} rows={2} placeholder="Describe dónde se encontró la actividad…" className={inputCls + " resize-none"} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Acción correctiva</label>
                  <textarea value={form.corrective_action} onChange={(e) => setF("corrective_action", e.target.value)} rows={2} placeholder="Acciones tomadas inmediatamente…" className={inputCls + " resize-none"} />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Treatment */}
        <div className={cardCls}>
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.treatment_performed} onChange={(e) => setF("treatment_performed", e.target.checked)} className="w-4 h-4 accent-lime-600" />
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Tratamiento aplicado en esta inspección</span>
            </label>
          </div>
          {form.treatment_performed && (
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Tipo de tratamiento</label>
                <input type="text" value={form.treatment_type} onChange={(e) => setF("treatment_type", e.target.value)} placeholder="Ej. cebo, aspersión, trampa…" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Productos/Químicos usados</label>
                <input type="text" value={form.chemicals_used} onChange={(e) => setF("chemicals_used", e.target.value)} placeholder="Nombre del producto" className={inputCls} />
              </div>
            </div>
          )}
        </div>

        {/* Next inspection */}
        <div className={cardCls}>
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Próxima inspección programada</span>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <input type="date" value={form.next_inspection_date} min={today} onChange={(e) => setF("next_inspection_date", e.target.value)} className={inputCls} />
            </div>
          </div>
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
          <button type="submit" disabled={isPending} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-lime-600 hover:bg-lime-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold shadow-sm transition-all">
            {isPending
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando…</>
              : <><Save className="w-4 h-4" />Guardar inspección</>
            }
          </button>
        </div>
      </form>
    </div>
  )
}
