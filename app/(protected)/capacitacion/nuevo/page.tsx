"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  GraduationCap, Calendar, User, Award, FileText,
  ChevronLeft, CheckCircle2, XCircle, Clock, Save,
  AlertCircle, Hash, BookOpen,
} from "lucide-react"

/* ── Constants ──────────────────────────────────────────────── */
const TRAINING_TYPES = [
  { value: "HACCP Básico",          label: "HACCP Básico",          required: ["admin","supervisor","qa","operator"], hours: 8  },
  { value: "HACCP Avanzado",        label: "HACCP Avanzado",        required: ["admin","supervisor","qa"],            hours: 16 },
  { value: "SSOP",                  label: "SSOP — Sanit. Estándar",required: ["admin","supervisor","qa","operator"], hours: 4  },
  { value: "Listeria / RTE",        label: "Listeria / Control RTE",required: ["admin","supervisor","qa"],            hours: 6  },
  { value: "GMP Operaciones",       label: "GMP Operaciones",       required: ["admin","supervisor","qa","operator"], hours: 4  },
  { value: "Alergenos",             label: "Control de Alérgenos",  required: ["admin","supervisor","qa"],            hours: 4  },
  { value: "Primeros Auxilios",     label: "Primeros Auxilios",     required: [],                                     hours: 8  },
  { value: "Manejo de Químicos",    label: "Manejo de Químicos",    required: [],                                     hours: 4  },
  { value: "Seguridad Industrial",  label: "Seguridad Industrial",  required: [],                                     hours: 8  },
  { value: "FSMA / FSIS",           label: "FSMA / FSIS Update",    required: ["admin","qa"],                         hours: 4  },
  { value: "Otro",                  label: "Otro (especificar)",    required: [],                                     hours: 0  },
]

const RESULT_OPTIONS = [
  { value: "passed",  label: "Aprobado",   icon: CheckCircle2, color: "text-green-600",  bg: "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"  },
  { value: "failed",  label: "Reprobado",  icon: XCircle,      color: "text-red-600",    bg: "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"          },
  { value: "pending", label: "Pendiente",  icon: Clock,        color: "text-amber-600",  bg: "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800"  },
]

// Default expiry: most trainings expire after 1 year, HACCP Avanzado after 2
function defaultExpiry(trainingType: string, trainingDate: string): string {
  if (!trainingDate) return ""
  const d = new Date(trainingDate)
  const years = trainingType === "HACCP Avanzado" ? 2 : 1
  d.setFullYear(d.getFullYear() + years)
  return d.toISOString().split("T")[0]
}

/* ── Types ──────────────────────────────────────────────────── */
interface Employee { id: string; full_name: string; role: string; employee_id?: string }

/* ── Main Component ─────────────────────────────────────────── */
export default function NuevoRegistroCapacitacion() {
  const router = useRouter()
  const supabase = createClient()
  const [isPending, startTransition] = useTransition()

  /* ── Employees ── */
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loadingEmps, setLoadingEmps] = useState(false)
  const [empsLoaded, setEmpsLoaded] = useState(false)

  async function loadEmployees() {
    if (empsLoaded) return
    setLoadingEmps(true)
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, role, employee_id")
      .eq("is_active", true)
      .order("full_name")
    setEmployees(data || [])
    setEmpsLoaded(true)
    setLoadingEmps(false)
  }

  /* ── Form state ── */
  const today = new Date().toISOString().split("T")[0]

  const [form, setForm] = useState({
    employee_id:    "",
    training_type:  "",
    custom_type:    "",
    training_date:  today,
    expiry_date:    "",
    trainer_name:   "",
    trainer_cert_no:"",
    score:          "",
    result:         "passed" as "passed" | "failed" | "pending",
    certificate_url:"",
    notes:          "",
  })
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  function set(field: string, value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value }
      // Auto-fill expiry when training type or date changes
      if ((field === "training_type" || field === "training_date") && next.training_date) {
        const type = field === "training_type" ? value : next.training_type
        next.expiry_date = defaultExpiry(type, next.training_date)
      }
      return next
    })
  }

  const selectedTraining = TRAINING_TYPES.find((t) => t.value === form.training_type)
  const trainingLabel = form.training_type === "Otro" ? form.custom_type : form.training_type

  /* ── Submit ── */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!form.employee_id)   return setError("Selecciona un empleado.")
    if (!form.training_type) return setError("Selecciona el tipo de capacitación.")
    if (form.training_type === "Otro" && !form.custom_type.trim())
      return setError("Especifica el nombre de la capacitación.")
    if (!form.training_date) return setError("Indica la fecha de la capacitación.")
    if (form.score && (Number(form.score) < 0 || Number(form.score) > 100))
      return setError("El puntaje debe estar entre 0 y 100.")

    startTransition(async () => {
      const { error: dbErr } = await supabase.from("training_records").insert({
        employee_id:    form.employee_id,
        training_type:  trainingLabel || form.training_type,
        training_date:  form.training_date,
        expiry_date:    form.expiry_date || null,
        trainer_name:   form.trainer_name || null,
        trainer_cert_no:form.trainer_cert_no || null,
        score:          form.score ? Number(form.score) : null,
        result:         form.result,
        certificate_url:form.certificate_url || null,
        notes:          form.notes || null,
      })
      if (dbErr) {
        setError(dbErr.message)
        return
      }
      setSuccess(true)
      setTimeout(() => router.push("/capacitacion"), 1200)
    })
  }

  /* ── Success state ── */
  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <p className="text-lg font-bold text-slate-800 dark:text-slate-100">Capacitación registrada</p>
        <p className="text-sm text-slate-600 dark:text-slate-300">Redirigiendo…</p>
      </div>
    )
  }

  return (
    <div className="max-w-[760px] space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => router.back()}
          className="mt-0.5 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-indigo-600" />
            </span>
            Nuevo Registro de Capacitación
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">9 CFR 417.7 — Documentación de entrenamiento HACCP</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── Employee ── */}
        <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <User className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Empleado</span>
          </div>
          <div className="p-5">
            <select
              value={form.employee_id}
              onFocus={loadEmployees}
              onChange={(e) => set("employee_id", e.target.value)}
              required
              className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400"
            >
              <option value="">{loadingEmps ? "Cargando…" : "Seleccionar empleado…"}</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name}
                  {emp.employee_id ? ` — ${emp.employee_id}` : ""}
                  {" "}({emp.role})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Training Type ── */}
        <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Tipo de Capacitación</span>
          </div>
          <div className="p-5 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TRAINING_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => set("training_type", t.value)}
                  className={`text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                    form.training_type === t.value
                      ? "border-indigo-400 bg-white dark:bg-[#111827] dark:border-indigo-600 text-slate-900 dark:text-slate-100 font-semibold shadow-sm"
                      : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <span className="block font-medium">{t.label}</span>
                  {t.hours > 0 && (
                    <span className="text-[11px] text-slate-600 dark:text-slate-300">{t.hours}h recomendadas</span>
                  )}
                </button>
              ))}
            </div>

            {/* Custom type input */}
            {form.training_type === "Otro" && (
              <input
                type="text"
                value={form.custom_type}
                onChange={(e) => set("custom_type", e.target.value)}
                placeholder="Nombre de la capacitación…"
                className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400"
              />
            )}

            {/* Info banner */}
            {selectedTraining && selectedTraining.required.length > 0 && (
              <div className="flex items-start gap-2 bg-white dark:bg-[#111827] border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2.5 text-xs text-slate-900 dark:text-slate-100">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-blue-500" />
                <span>
                  <strong>Obligatoria</strong> para roles:{" "}
                  {selectedTraining.required.join(", ")}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Dates + Score ── */}
        <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Fechas y Puntaje</span>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">
                Fecha de capacitación *
              </label>
              <input
                type="date"
                value={form.training_date}
                onChange={(e) => set("training_date", e.target.value)}
                required
                max={today}
                className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">
                Fecha de vencimiento
              </label>
              <input
                type="date"
                value={form.expiry_date}
                onChange={(e) => set("expiry_date", e.target.value)}
                min={form.training_date}
                className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400"
              />
              <p className="text-[10.5px] text-slate-600 dark:text-slate-300 mt-1">Auto-calculado al seleccionar tipo</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">
                Puntaje (0–100)
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                <input
                  type="number"
                  value={form.score}
                  onChange={(e) => set("score", e.target.value)}
                  min={0}
                  max={100}
                  placeholder="—"
                  className="w-full pl-8 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Result ── */}
        <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <Award className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Resultado</span>
          </div>
          <div className="p-5 flex flex-wrap gap-3">
            {RESULT_OPTIONS.map((r) => {
              const Icon = r.icon
              const selected = form.result === r.value
              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => set("result", r.value)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    selected ? `${r.bg} ${r.color} shadow-sm` : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${selected ? r.color : "text-slate-400"}`} />
                  {r.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Trainer info ── */}
        <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <User className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Información del Instructor</span>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">
                Nombre del instructor
              </label>
              <input
                type="text"
                value={form.trainer_name}
                onChange={(e) => set("trainer_name", e.target.value)}
                placeholder="Ej. Maria González"
                className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">
                No. de certificación
              </label>
              <input
                type="text"
                value={form.trainer_cert_no}
                onChange={(e) => set("trainer_cert_no", e.target.value)}
                placeholder="Ej. HACCP-2024-0123"
                className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">
                URL del certificado
              </label>
              <input
                type="url"
                value={form.certificate_url}
                onChange={(e) => set("certificate_url", e.target.value)}
                placeholder="https://… (opcional)"
                className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400"
              />
            </div>
          </div>
        </div>

        {/* ── Notes ── */}
        <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Notas</span>
          </div>
          <div className="p-5">
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              placeholder="Observaciones adicionales, temas cubiertos, materiales entregados…"
              className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 resize-none"
            />
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="flex items-center gap-2.5 bg-white dark:bg-[#111827] border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-slate-900 dark:text-slate-100">{error}</p>
          </div>
        )}

        {/* ── Submit ── */}
        <div className="flex items-center justify-between gap-4 pt-1 pb-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold shadow-sm transition-all"
          >
            {isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Guardando…
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Guardar registro
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
