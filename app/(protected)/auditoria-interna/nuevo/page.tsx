"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  ChevronLeft, Save, AlertCircle, CheckCircle2,
  ClipboardCheck, AlertTriangle, Clock,
} from "lucide-react"
import Link from "next/link"

const AUDIT_TYPES = [
  { value: "haccp_plan_review", label: "Revisión del Plan HACCP",   desc: "Revisión completa del plan: CCPs, límites críticos, procedimientos" },
  { value: "ccp_monitoring",    label: "Monitoreo de CCPs",         desc: "Verificación del monitoreo en puntos de control crítico" },
  { value: "record_review",     label: "Revisión de Registros",     desc: "Auditoría de registros de cocción, refrigeración, calibración" },
  { value: "validation",        label: "Validación",                desc: "Validación de procesos y medidas de control" },
  { value: "pre_inspection",    label: "Pre-inspección USDA",       desc: "Preparación para visita del inspector FSIS" },
  { value: "full_system",       label: "Sistema completo",          desc: "Auditoría integral de todo el sistema HACCP" },
]

const AREAS = [
  "Cocina / Área de cocción",
  "Área de enfriamiento",
  "Empaque / Packaging",
  "Recepción de materia prima",
  "Almacén en seco",
  "Cuartos fríos",
  "Área de descongelado",
  "Detectores de metales",
  "Área de sanitación",
  "Documentación / Registros",
  "Calibración de equipos",
]

export default function NuevaAuditoriaInternaPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const today = new Date().toISOString().split("T")[0]

  const [form, setForm] = useState({
    audit_date:                   today,
    audit_type:                   "haccp_plan_review",
    auditor_name:                 "",
    auditor_role:                 "",
    areas_audited:                [] as string[],
    total_items_checked:          "",
    items_passed:                 "",
    items_failed:                 "",
    critical_findings:            "",
    major_findings:               "",
    minor_findings:               "",
    corrective_actions_required:  false,
    corrective_action_detail:     "",
    corrective_action_deadline:   "",
    follow_up_date:               "",
    overall_result:               "satisfactory" as "satisfactory" | "conditional" | "unsatisfactory",
    notes:                        "",
  })

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }))

  const toggleArea = (area: string) => {
    setForm((p) => ({
      ...p,
      areas_audited: p.areas_audited.includes(area)
        ? p.areas_audited.filter((a) => a !== area)
        : [...p.areas_audited, area],
    }))
  }

  // Auto-suggest result based on findings
  const suggestResult = () => {
    if (form.critical_findings.trim()) return "unsatisfactory"
    if (form.major_findings.trim()) return "conditional"
    return "satisfactory"
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.auditor_name.trim()) { setError("Nombre del auditor requerido."); return }
    if (form.corrective_actions_required && !form.corrective_action_detail.trim()) {
      setError("Describe las acciones correctivas requeridas."); return
    }
    setSaving(true)
    setError(null)
    try {
      const supabase = createClient()
      const payload: Record<string, any> = {
        audit_date:                 form.audit_date,
        audit_type:                 form.audit_type,
        auditor_name:               form.auditor_name.trim(),
        auditor_role:               form.auditor_role || null,
        areas_audited:              form.areas_audited.length > 0 ? form.areas_audited : null,
        total_items_checked:        parseInt(form.total_items_checked) || 0,
        items_passed:               parseInt(form.items_passed) || 0,
        items_failed:               parseInt(form.items_failed) || 0,
        critical_findings:          form.critical_findings.trim() || null,
        major_findings:             form.major_findings.trim() || null,
        minor_findings:             form.minor_findings.trim() || null,
        corrective_actions_required:form.corrective_actions_required,
        corrective_action_detail:   form.corrective_action_detail.trim() || null,
        corrective_action_deadline: form.corrective_action_deadline || null,
        follow_up_date:             form.follow_up_date || null,
        overall_result:             form.overall_result,
        notes:                      form.notes.trim() || null,
      }

      const { error: err } = await supabase.from("internal_audits").insert(payload)
      if (err) throw err
      router.push("/auditoria-interna")
    } catch (e: any) {
      setError(e.message ?? "Error al guardar.")
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/auditoria-interna" className="text-slate-600 dark:text-slate-300 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-indigo-600" />
            Nueva Auditoría Interna HACCP
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">9 CFR 417.8 · Registro de verificación del sistema</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Audit type */}
        <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-indigo-500" />
            Tipo de auditoría
          </h2>
          <div className="grid grid-cols-1 gap-2">
            {AUDIT_TYPES.map((t) => (
              <label
                key={t.value}
                className={`flex items-start gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all ${
                  form.audit_type === t.value
                    ? "border-indigo-500 bg-white dark:bg-[#111827]"
                    : "border-slate-100 dark:border-slate-700 hover:border-indigo-200"
                }`}
              >
                <input type="radio" className="sr-only" value={t.value} checked={form.audit_type === t.value} onChange={(e) => set("audit_type", e.target.value)} />
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${form.audit_type === t.value ? "text-slate-900 dark:text-slate-100" : "text-slate-700 dark:text-slate-200"}`}>{t.label}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{t.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* General info */}
        <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">Información general</h2>
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Fecha *</label>
            <input type="date" required value={form.audit_date} onChange={(e) => set("audit_date", e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Auditor *</label>
              <input type="text" required value={form.auditor_name} onChange={(e) => set("auditor_name", e.target.value)}
                placeholder="Nombre completo"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Cargo / Rol</label>
              <input type="text" value={form.auditor_role} onChange={(e) => set("auditor_role", e.target.value)}
                placeholder="Ej. Coordinador QA"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>
        </div>

        {/* Areas audited */}
        <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">Áreas auditadas</h2>
          <div className="flex flex-wrap gap-2">
            {AREAS.map((area) => (
              <button
                key={area}
                type="button"
                onClick={() => toggleArea(area)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full border-2 transition-all ${
                  form.areas_audited.includes(area)
                    ? "border-indigo-500 bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100"
                    : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-indigo-300"
                }`}
              >
                {form.areas_audited.includes(area) ? "✓ " : ""}{area}
              </button>
            ))}
          </div>
        </div>

        {/* Items summary */}
        <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">Resumen de ítems</h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { key: "total_items_checked", label: "Total revisados", color: "indigo" },
              { key: "items_passed",        label: "Conformes ✓",     color: "green"  },
              { key: "items_failed",        label: "No conformes ✗",  color: "red"    },
            ].map(({ key, label, color }) => (
              <div key={key}>
                <label className={`block text-xs font-bold mb-1.5 uppercase tracking-wide ${
                  color === "green" ? "text-green-600" : color === "red" ? "text-red-600" : "text-indigo-600"
                }`}>{label}</label>
                <input type="number" min="0" value={(form as any)[key]} onChange={(e) => set(key, e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none tabular-nums" />
              </div>
            ))}
          </div>
        </div>

        {/* Findings */}
        <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Hallazgos
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300">Documenta solo los hallazgos observados. Dejar en blanco si no aplica.</p>

          {[
            { key: "critical_findings", label: "Hallazgos críticos", color: "red",    desc: "Riesgo inmediato para la inocuidad alimentaria — acción inmediata requerida" },
            { key: "major_findings",    label: "Hallazgos mayores",  color: "amber",  desc: "Desviaciones significativas — acción en 24–48 horas" },
            { key: "minor_findings",    label: "Hallazgos menores",  color: "slate",  desc: "Oportunidades de mejora — acción dentro de 30 días" },
          ].map(({ key, label, color, desc }) => (
            <div key={key}>
              <label className={`block text-xs font-bold mb-1 uppercase tracking-wide ${
                color === "red" ? "text-red-600" : color === "amber" ? "text-amber-600" : "text-slate-600 dark:text-slate-300"
              }`}>{label}</label>
              <p className="text-[10px] text-slate-600 dark:text-slate-300 mb-1.5">{desc}</p>
              <textarea rows={2} value={(form as any)[key]} onChange={(e) => set(key, e.target.value)}
                placeholder="Describe el hallazgo..."
                className={`w-full px-3 py-2 text-sm rounded-lg border focus:ring-2 outline-none resize-none bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 ${
                  color === "red"
                    ? "border-red-200 dark:border-red-800 focus:ring-red-400"
                    : color === "amber"
                    ? "border-amber-200 dark:border-amber-800 focus:ring-amber-400"
                    : "border-slate-200 dark:border-slate-600 focus:ring-indigo-500"
                }`}
              />
            </div>
          ))}

          {/* Auto-suggest result */}
          {(form.critical_findings.trim() || form.major_findings.trim()) && (
            <div className={`rounded-lg px-4 py-3 flex items-center gap-2 ${
              form.critical_findings.trim()
                ? "bg-white dark:bg-[#111827] border border-red-200 dark:border-red-800"
                : "bg-white dark:bg-[#111827] border border-amber-200 dark:border-amber-800"
            }`}>
              <AlertCircle className={`w-4 h-4 flex-shrink-0 ${form.critical_findings.trim() ? "text-red-500" : "text-amber-500"}`} />
              <p className={`text-xs font-semibold ${form.critical_findings.trim() ? "text-slate-900 dark:text-slate-100" : "text-slate-900 dark:text-slate-100"}`}>
                Sugerencia: resultado{" "}
                <strong>{form.critical_findings.trim() ? "No Satisfactorio" : "Condicional"}</strong>{" "}
                basado en hallazgos. Puedes cambiar esto abajo.
              </p>
            </div>
          )}
        </div>

        {/* Corrective actions */}
        <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500" />
              Acciones correctivas
            </h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs text-slate-600 dark:text-slate-300">¿Se requieren?</span>
              <div
                onClick={() => set("corrective_actions_required", !form.corrective_actions_required)}
                className={`w-10 h-5 rounded-full transition-colors cursor-pointer ${form.corrective_actions_required ? "bg-indigo-500" : "bg-slate-200 dark:bg-slate-700"}`}
              >
                <div className={`w-4 h-4 mt-0.5 rounded-full bg-white shadow transition-transform ${form.corrective_actions_required ? "translate-x-5.5 ml-5" : "ml-0.5"}`} />
              </div>
            </label>
          </div>
          {form.corrective_actions_required && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Detalle de acciones *</label>
                <textarea rows={3} value={form.corrective_action_detail} onChange={(e) => set("corrective_action_detail", e.target.value)}
                  placeholder="Describe las acciones correctivas y responsables..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Fecha límite</label>
                  <input type="date" value={form.corrective_action_deadline} onChange={(e) => set("corrective_action_deadline", e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Fecha de seguimiento</label>
                  <input type="date" value={form.follow_up_date} onChange={(e) => set("follow_up_date", e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Overall result */}
        <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 p-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">Resultado general</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: "satisfactory",   label: "Satisfactorio",      icon: CheckCircle2, color: "green" },
              { value: "conditional",    label: "Condicional",         icon: AlertTriangle,color: "amber" },
              { value: "unsatisfactory", label: "No Satisfactorio",   icon: AlertCircle,  color: "red"   },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => set("overall_result", opt.value)}
                className={`flex flex-col items-center gap-2 py-4 rounded-xl border-2 font-bold text-xs transition-all ${
                  form.overall_result === opt.value
                    ? opt.color === "green"
                      ? "border-green-500 bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100"
                      : opt.color === "amber"
                      ? "border-amber-400 bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100"
                      : "border-red-500 bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100"
                    : "border-slate-100 dark:border-slate-700 text-slate-500 hover:border-slate-300"
                }`}
              >
                <opt.icon className="w-5 h-5" />
                {opt.label}
              </button>
            ))}
          </div>
          {suggestResult() !== form.overall_result && (
            <button
              type="button"
              onClick={() => set("overall_result", suggestResult())}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold underline"
            >
              Aplicar resultado sugerido ({suggestResult() === "satisfactory" ? "Satisfactorio" : suggestResult() === "conditional" ? "Condicional" : "No Satisfactorio"})
            </button>
          )}
        </div>

        {/* Notes */}
        <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 p-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">Observaciones adicionales</h2>
          <textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)}
            placeholder="Contexto adicional, condiciones de la auditoría, evidencias revisadas, etc."
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none resize-none" />
        </div>

        {error && (
          <div className="bg-white dark:bg-[#111827] border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-slate-900 dark:text-slate-100">{error}</p>
          </div>
        )}

        <div className="flex gap-3 pb-8">
          <Link href="/auditoria-interna"
            className="flex-1 py-2.5 text-sm font-bold text-center text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors">
            Cancelar
          </Link>
          <button type="submit" disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 rounded-xl transition-colors">
            <Save className="w-4 h-4" />
            {saving ? "Guardando…" : "Guardar auditoría"}
          </button>
        </div>
      </form>
    </div>
  )
}
