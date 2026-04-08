"use client"

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useState, useEffect, useRef } from "react"
import {
  Factory,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Package2,
  Scale,
  CalendarDays,
  Target,
  Layers,
  Rocket,
} from "lucide-react"
import { toast } from "sonner"

// ─── types ─────────────────────────────────────────────────────────────────

interface Step1 {
  client_name:     string
  product_name:    string
  production_line: string
}

interface Step2 {
  target_boxes:      string
  target_weight_lbs: string
  lot_reference:     string
  shift_date:        string
  notes:             string
}

// ─── constants ─────────────────────────────────────────────────────────────

const LINES = ["Sin especificar", "Línea A", "Línea B", "Línea C"]

const todayISO = () => new Date().toISOString().split("T")[0]

function fmtDateDisplay(iso: string) {
  if (!iso) return "—"
  return new Date(iso + "T12:00:00").toLocaleDateString("es-US", {
    weekday: "long",
    day:     "numeric",
    month:   "long",
    year:    "numeric",
  })
}

// ─── Step progress indicator ───────────────────────────────────────────────

function StepBar({ step }: { step: number }) {
  const steps = [
    { n: 1, label: "Producción" },
    { n: 2, label: "Metas" },
    { n: 3, label: "Confirmar" },
  ]
  return (
    <div className="flex items-center gap-0 w-full mb-8">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                step > s.n
                  ? "bg-emerald-600 text-white"
                  : step === s.n
                    ? "bg-emerald-600 text-white ring-4 ring-emerald-500/20"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
              }`}
            >
              {step > s.n ? <Check className="w-4 h-4" /> : s.n}
            </div>
            <span
              className={`text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap ${
                step === s.n
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-slate-400 dark:text-slate-500"
              }`}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className="flex-1 mx-2 mt-[-14px]">
              <div className="h-0.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500 ease-out"
                  style={{ width: step > s.n ? "100%" : "0%" }}
                />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Slide wrapper ─────────────────────────────────────────────────────────

function SlidePanel({
  active,
  children,
}: {
  active: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={`transition-all duration-300 ${
        active
          ? "opacity-100 translate-x-0 pointer-events-auto"
          : "opacity-0 translate-x-4 pointer-events-none absolute inset-0"
      }`}
    >
      {children}
    </div>
  )
}

// ─── Field components ──────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
      {children}
    </label>
  )
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  list,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  list?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      list={list}
      autoComplete="off"
      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
    />
  )
}

function SelectInput({
  value,
  onChange,
  children,
}: {
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all appearance-none"
    >
      {children}
    </select>
  )
}

// ─── Confirm row ───────────────────────────────────────────────────────────

function ConfirmRow({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
          accent
            ? "bg-emerald-100 dark:bg-emerald-900/40"
            : "bg-slate-100 dark:bg-slate-800"
        }`}
      >
        <Icon
          className={`w-4 h-4 ${
            accent ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"
          }`}
        />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-0.5 truncate">
          {value}
        </p>
      </div>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────

export default function IniciarProduccionPage() {
  const router  = useRouter()
  const supabase = createClient()

  const [step,    setStep]    = useState(1)
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<{ id: string; company_name: string }[]>([])

  const [s1, setS1] = useState<Step1>({
    client_name:     "",
    product_name:    "",
    production_line: "Sin especificar",
  })

  const [s2, setS2] = useState<Step2>({
    target_boxes:      "",
    target_weight_lbs: "",
    lot_reference:     "",
    shift_date:        todayISO(),
    notes:             "",
  })

  const set1 = (k: keyof Step1, v: string) => setS1((p) => ({ ...p, [k]: v }))
  const set2 = (k: keyof Step2, v: string) => setS2((p) => ({ ...p, [k]: v }))

  // Load clients
  useEffect(() => {
    supabase
      .from("clients")
      .select("id, company_name")
      .eq("is_active", true)
      .order("company_name")
      .then(({ data }) => setClients(data || []))
  }, [])

  // ── Step 1 validation ──
  const step1Valid = s1.client_name.trim() !== "" && s1.product_name.trim() !== ""

  const goNext = () => {
    if (step === 1 && !step1Valid) {
      toast.error("Cliente y producto son obligatorios")
      return
    }
    setStep((p) => Math.min(p + 1, 3))
  }
  const goBack = () => setStep((p) => Math.max(p - 1, 1))

  // ── Submit ──
  const handleSubmit = async () => {
    if (!step1Valid) { toast.error("Faltan datos en el paso 1"); return }
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast.error("No autenticado"); setLoading(false); return }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, organization_id")
        .eq("id", user.id)
        .single()

      if (!profile) { toast.error("Perfil no encontrado"); setLoading(false); return }

      const { data, error } = await supabase
        .from("box_sessions")
        .insert({
          organization_id:   profile.organization_id,
          client_name:       s1.client_name.trim(),
          product_name:      s1.product_name.trim(),
          production_line:   s1.production_line !== "Sin especificar" ? s1.production_line : null,
          shift_date:        s2.shift_date,
          status:            "active",
          start_time:        new Date().toISOString(),
          target_boxes:      s2.target_boxes      ? parseInt(s2.target_boxes)         : null,
          target_weight_lbs: s2.target_weight_lbs ? parseFloat(s2.target_weight_lbs) : null,
          lot_reference:     s2.lot_reference.trim() || null,
          notes:             s2.notes.trim()         || null,
          supervisor_id:     profile.id,
        })
        .select("id")
        .single()

      if (error || !data) {
        toast.error("Error al iniciar sesión: " + (error?.message || ""))
        setLoading(false)
        return
      }

      toast.success("¡Sesión iniciada! Comienza a registrar cajas.")
      router.push(`/produccion/${data.id}`)
    } catch (err: any) {
      toast.error(err?.message || "Error inesperado")
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">

      {/* ── Back link + header ── */}
      <div>
        <Link
          href="/produccion"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors mb-5"
        >
          <ArrowLeft className="w-4 h-4" />
          Centro de Producción
        </Link>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <Factory className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white">
              Nueva Sesión de Producción
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Completa los 3 pasos para iniciar el turno
            </p>
          </div>
        </div>
      </div>

      {/* ── Wizard card ── */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] shadow-sm p-6">

        <StepBar step={step} />

        {/* ── relative container so absolute slides work ── */}
        <div className="relative overflow-hidden">

          {/* ══ STEP 1 ══ */}
          <SlidePanel active={step === 1}>
            <div className="space-y-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-0.5">
                  Paso 1 de 3
                </p>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  ¿Qué producimos?
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Define el cliente, producto y línea de producción para este turno.
                </p>
              </div>

              {/* Client */}
              <div>
                <FieldLabel>¿Para qué cliente?</FieldLabel>
                <TextInput
                  value={s1.client_name}
                  onChange={(v) => set1("client_name", v)}
                  placeholder="Ej. Carlys, Walmart, Sysco…"
                  list="clients-list"
                />
                <datalist id="clients-list">
                  {clients.map((c) => (
                    <option key={c.id} value={c.company_name} />
                  ))}
                </datalist>
              </div>

              {/* Product */}
              <div>
                <FieldLabel>¿Qué producto?</FieldLabel>
                <TextInput
                  value={s1.product_name}
                  onChange={(v) => set1("product_name", v)}
                  placeholder="Ej. Pork Belly, Buñuelos con Queso…"
                />
              </div>

              {/* Line */}
              <div>
                <FieldLabel>¿En qué línea?</FieldLabel>
                <SelectInput value={s1.production_line} onChange={(v) => set1("production_line", v)}>
                  {LINES.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </SelectInput>
              </div>
            </div>
          </SlidePanel>

          {/* ══ STEP 2 ══ */}
          <SlidePanel active={step === 2}>
            <div className="space-y-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-0.5">
                  Paso 2 de 3
                </p>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  ¿Cuánto esperamos producir?
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Todos los campos son opcionales. Las metas te ayudan a monitorear el avance.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Target boxes */}
                <div>
                  <FieldLabel>Meta de cajas</FieldLabel>
                  <TextInput
                    type="number"
                    value={s2.target_boxes}
                    onChange={(v) => set2("target_boxes", v)}
                    placeholder="140"
                  />
                </div>
                {/* Target weight */}
                <div>
                  <FieldLabel>Meta peso (lbs)</FieldLabel>
                  <TextInput
                    type="number"
                    value={s2.target_weight_lbs}
                    onChange={(v) => set2("target_weight_lbs", v)}
                    placeholder="6800"
                  />
                </div>
              </div>

              {/* Lot reference */}
              <div>
                <FieldLabel>N° lote de materia prima</FieldLabel>
                <TextInput
                  value={s2.lot_reference}
                  onChange={(v) => set2("lot_reference", v)}
                  placeholder="Ej. LOT-2026-001"
                />
              </div>

              {/* Date */}
              <div>
                <FieldLabel>Fecha del turno</FieldLabel>
                <TextInput
                  type="date"
                  value={s2.shift_date}
                  onChange={(v) => set2("shift_date", v)}
                />
              </div>

              {/* Notes */}
              <div>
                <FieldLabel>Notas adicionales</FieldLabel>
                <textarea
                  value={s2.notes}
                  onChange={(e) => set2("notes", e.target.value)}
                  placeholder="Observaciones, instrucciones especiales…"
                  rows={3}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all resize-none"
                />
              </div>
            </div>
          </SlidePanel>

          {/* ══ STEP 3 ══ */}
          <SlidePanel active={step === 3}>
            <div className="space-y-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-0.5">
                  Paso 3 de 3
                </p>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  ¿Listos para comenzar?
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Revisa el resumen antes de iniciar la sesión.
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-4 divide-y divide-slate-100 dark:divide-slate-800">
                <ConfirmRow
                  icon={Package2}
                  label="Cliente"
                  value={s1.client_name || "—"}
                  accent
                />
                <ConfirmRow
                  icon={Scale}
                  label="Producto"
                  value={s1.product_name || "—"}
                  accent
                />
                <ConfirmRow
                  icon={Layers}
                  label="Línea"
                  value={s1.production_line || "Sin especificar"}
                />
                <ConfirmRow
                  icon={CalendarDays}
                  label="Fecha"
                  value={fmtDateDisplay(s2.shift_date)}
                />
                {(s2.target_boxes || s2.target_weight_lbs) && (
                  <ConfirmRow
                    icon={Target}
                    label="Meta"
                    value={[
                      s2.target_boxes      ? `${s2.target_boxes} cajas`  : null,
                      s2.target_weight_lbs ? `${s2.target_weight_lbs} lbs` : null,
                    ]
                      .filter(Boolean)
                      .join(" / ")}
                  />
                )}
                {s2.lot_reference && (
                  <ConfirmRow
                    icon={ChevronRight}
                    label="Lote"
                    value={s2.lot_reference}
                  />
                )}
                {s2.notes && (
                  <ConfirmRow
                    icon={ChevronRight}
                    label="Notas"
                    value={s2.notes}
                  />
                )}
              </div>

              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/40 px-4 py-3">
                <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                  Al confirmar, se creará la sesión y el contador de producción comenzará ahora mismo.
                </p>
              </div>
            </div>
          </SlidePanel>

        </div>

        {/* ── Navigation buttons ── */}
        <div className="flex items-center justify-between mt-8 pt-5 border-t border-slate-100 dark:border-slate-800">
          {step > 1 ? (
            <button
              type="button"
              onClick={goBack}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Atrás
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={goNext}
              disabled={step === 1 && !step1Valid}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
            >
              Siguiente
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-colors shadow-sm shadow-emerald-500/20"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Iniciando…
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4" />
                  Iniciar Producción
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── Step hint ── */}
      <p className="text-center text-xs text-slate-400 dark:text-slate-600 pb-4">
        Paso {step} de 3 · Puedes modificar los datos en pasos anteriores
      </p>
    </div>
  )
}
