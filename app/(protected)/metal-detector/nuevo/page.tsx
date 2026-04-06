"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  Zap, ChevronLeft, Save, AlertCircle, CheckCircle2, XCircle,
  Package, Wrench, FileText,
} from "lucide-react"

const CHECK_TYPES = [
  { value: "pre_op",           label: "Pre-Op",          desc: "Antes de iniciar producción",     color: "border-purple-300 bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100" },
  { value: "hourly",           label: "Por hora",         desc: "Verificación periódica",          color: "border-blue-300 bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100" },
  { value: "product_change",   label: "Cambio producto",  desc: "Al cambiar tipo de producto",     color: "border-amber-300 bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100" },
  { value: "post_maintenance", label: "Post-mant.",       desc: "Después de mantenimiento",        color: "border-orange-300 bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100" },
  { value: "end_of_day",       label: "Fin de día",       desc: "Cierre de turno",                 color: "border-slate-300 bg-slate-50 dark:bg-slate-700/30 text-slate-600 dark:text-slate-300" },
]

const DISPOSITIONS = [
  { value: "rework",  label: "Re-proceso"  },
  { value: "destroy", label: "Destruido"   },
  { value: "release", label: "Liberado"    },
  { value: "pending", label: "Pendiente"   },
]

interface TestRow {
  pass: boolean
  mm: string
}

export default function NuevoMetalDetectorPage() {
  const router   = useRouter()
  const supabase = createClient()
  const [isPending, startTransition] = useTransition()

  const now   = new Date()
  const today = now.toISOString().split("T")[0]
  const hhmm  = now.toTimeString().slice(0, 5)

  const [form, setForm] = useState({
    check_date:     today,
    check_time:     hhmm,
    check_type:     "pre_op",
    product_name:   "",
    lot_number:     "",
    equipment_id:   "",
    units_inspected:"",
    units_rejected: "0",
    corrective_action: "",
    product_on_hold:   false,
    product_disposition: "" as string,
    notes: "",
  })

  const [tests, setTests] = useState<Record<string, TestRow>>({
    ferrous:     { pass: true, mm: "" },
    non_ferrous: { pass: true, mm: "" },
    stainless:   { pass: true, mm: "" },
  })

  const [error,   setError]   = useState("")
  const [success, setSuccess] = useState(false)

  const anyFail        = Object.values(tests).some((t) => !t.pass)
  const hasRejections  = Number(form.units_rejected) > 0
  const needsCorrectiveAction = anyFail || hasRejections

  function setField(k: string, v: string | boolean) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  function setTest(key: string, field: "pass" | "mm", value: boolean | string) {
    setTests((p) => ({ ...p, [key]: { ...p[key], [field]: value } }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!form.check_date) return setError("Indica la fecha del chequeo.")
    if (needsCorrectiveAction && !form.corrective_action.trim())
      return setError("Se requiere acción correctiva cuando hay falla o unidades rechazadas.")

    startTransition(async () => {
      const { error: dbErr } = await supabase.from("metal_detector_logs").insert({
        check_date:          form.check_date,
        check_time:          form.check_time,
        check_type:          form.check_type,
        product_name:        form.product_name || null,
        lot_number:          form.lot_number   || null,
        equipment_id:        form.equipment_id || null,
        ferrous_mm:          tests.ferrous.mm     ? Number(tests.ferrous.mm)     : null,
        non_ferrous_mm:      tests.non_ferrous.mm ? Number(tests.non_ferrous.mm) : null,
        stainless_mm:        tests.stainless.mm   ? Number(tests.stainless.mm)   : null,
        ferrous_pass:        tests.ferrous.pass,
        non_ferrous_pass:    tests.non_ferrous.pass,
        stainless_pass:      tests.stainless.pass,
        units_inspected:     form.units_inspected ? Number(form.units_inspected) : null,
        units_rejected:      Number(form.units_rejected) || 0,
        corrective_action:   form.corrective_action || null,
        product_on_hold:     form.product_on_hold,
        product_disposition: form.product_disposition || null,
        notes:               form.notes || null,
      })
      if (dbErr) { setError(dbErr.message); return }
      setSuccess(true)
      setTimeout(() => router.push("/metal-detector"), 1000)
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

  const inputCls = "w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400"
  const cardCls  = "bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden"

  return (
    <div className="max-w-[760px] space-y-6">

      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => router.back()}
          className="mt-0.5 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center">
              <Zap className="w-4 h-4 text-violet-600" />
            </span>
            Nuevo Chequeo — Detector de Metales
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">CCP · 9 CFR 417.3</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── Date / Time / Equipment ── */}
        <div className={cardCls}>
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Información del chequeo</span>
          </div>
          <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Fecha *</label>
              <input type="date" value={form.check_date} max={today} onChange={(e) => setField("check_date", e.target.value)} required className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Hora *</label>
              <input type="time" value={form.check_time} onChange={(e) => setField("check_time", e.target.value)} required className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Equipo ID</label>
              <input type="text" value={form.equipment_id} onChange={(e) => setField("equipment_id", e.target.value)} placeholder="Ej. MD-01" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Producto</label>
              <input type="text" value={form.product_name} onChange={(e) => setField("product_name", e.target.value)} placeholder="Nombre del producto" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">No. de lote</label>
              <input type="text" value={form.lot_number} onChange={(e) => setField("lot_number", e.target.value)} placeholder="Lote" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Unidades inspeccionadas</label>
              <input type="number" min={0} value={form.units_inspected} onChange={(e) => setField("units_inspected", e.target.value)} placeholder="0" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Unidades rechazadas</label>
              <input type="number" min={0} value={form.units_rejected} onChange={(e) => setField("units_rejected", e.target.value)} placeholder="0" className={inputCls} />
            </div>
          </div>
        </div>

        {/* ── Check type ── */}
        <div className={cardCls}>
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Tipo de chequeo</span>
          </div>
          <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CHECK_TYPES.map((ct) => (
              <button
                key={ct.value}
                type="button"
                onClick={() => setField("check_type", ct.value)}
                className={`text-left px-4 py-3 rounded-xl border-2 text-sm transition-all ${
                  form.check_type === ct.value
                    ? ct.color + " font-semibold shadow-sm"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                <span className="block font-medium">{ct.label}</span>
                <span className="text-[11px] opacity-70">{ct.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Test pieces ── */}
        <div className={cardCls}>
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <Zap className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Piezas de prueba de sensibilidad</span>
          </div>
          <div className="p-5 space-y-3">
            {[
              { key: "ferrous",     label: "Ferroso (Fe)" },
              { key: "non_ferrous", label: "No-ferroso (No-Fe)" },
              { key: "stainless",   label: "Inoxidable (SS)" },
            ].map((row) => {
              const t = tests[row.key]
              return (
                <div key={row.key} className={`flex items-center gap-4 px-4 py-3 rounded-xl border-2 transition-colors ${
                  !t.pass ? "border-red-200 bg-red-50/50 dark:bg-red-900/10 dark:border-red-800" : "border-transparent bg-slate-100 dark:bg-slate-800/40"
                }`}>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 w-36 flex-shrink-0">{row.label}</span>
                  <input
                    type="number"
                    value={t.mm}
                    onChange={(e) => setTest(row.key, "mm", e.target.value)}
                    placeholder="mm"
                    step="0.1"
                    min={0}
                    className="w-24 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                  />
                  <div className="flex gap-2 ml-2">
                    <button
                      type="button"
                      onClick={() => setTest(row.key, "pass", true)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        t.pass
                          ? "bg-green-100 border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300"
                          : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> PASA
                    </button>
                    <button
                      type="button"
                      onClick={() => setTest(row.key, "pass", false)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        !t.pass
                          ? "bg-red-100 border-red-300 text-red-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300"
                          : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <XCircle className="w-3.5 h-3.5" /> FALLA
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Corrective action (conditional) ── */}
        {needsCorrectiveAction && (
          <div className="bg-white dark:bg-[#111827] border-2 border-red-200 dark:border-red-800 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-red-200 dark:border-red-800 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-red-500" />
              <span className="text-sm font-bold text-red-800 dark:text-red-200">Acción Correctiva — Requerida</span>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1.5 uppercase tracking-wide">
                  Acción tomada *
                </label>
                <textarea
                  value={form.corrective_action}
                  onChange={(e) => setField("corrective_action", e.target.value)}
                  rows={3}
                  required={needsCorrectiveAction}
                  placeholder="Describe la acción correctiva tomada inmediatamente…"
                  className="w-full border border-red-200 dark:border-red-700 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-400/40 resize-none"
                />
              </div>
              <div className="flex flex-wrap items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.product_on_hold}
                    onChange={(e) => setField("product_on_hold", e.target.checked)}
                    className="w-4 h-4 accent-red-600"
                  />
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Producto en cuarentena</span>
                </label>
              </div>
              {form.product_on_hold && (
                <div>
                  <label className="block text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1.5 uppercase tracking-wide">
                    Disposición del producto
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {DISPOSITIONS.map((d) => (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => setField("product_disposition", d.value)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
                          form.product_disposition === d.value
                            ? "bg-red-600 border-red-600 text-white"
                            : "border-red-200 dark:border-red-700 text-slate-900 dark:text-slate-100 hover:bg-red-100 dark:hover:bg-red-900/20"
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Notes ── */}
        <div className={cardCls}>
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Notas</span>
          </div>
          <div className="p-5">
            <textarea
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              rows={2}
              placeholder="Observaciones adicionales…"
              className={inputCls + " resize-none"}
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
        <div className="flex items-center justify-between gap-4 pb-8">
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
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold shadow-sm transition-all"
          >
            {isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Guardando…
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Guardar chequeo
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
