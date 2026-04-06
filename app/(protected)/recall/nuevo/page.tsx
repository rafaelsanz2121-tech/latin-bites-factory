"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  RotateCcw, ChevronLeft, Save, AlertCircle, CheckCircle2,
  Package, Clock, FileText, Target, TrendingUp,
} from "lucide-react"

const TRIGGER_REASONS = [
  { value: "allergen",           label: "Alérgeno no declarado"  },
  { value: "contamination",      label: "Contaminación biológica/química" },
  { value: "labeling",           label: "Error de etiquetado"    },
  { value: "foreign_material",   label: "Material extraño"       },
  { value: "temperature_abuse",  label: "Abuso de temperatura"   },
  { value: "supplier_alert",     label: "Alerta de proveedor"    },
  { value: "customer_complaint", label: "Queja de cliente"       },
  { value: "other",              label: "Otro"                   },
]

const OUTCOMES = [
  { value: "completed",   label: "Completado",   color: "border-green-300 bg-green-50 text-green-700 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300" },
  { value: "in_progress", label: "En proceso",   color: "border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-300" },
  { value: "cancelled",   label: "Cancelado",    color: "border-slate-300 bg-slate-50 text-slate-600 dark:bg-slate-700/30 dark:border-slate-600 dark:text-slate-300" },
]

export default function NuevoRecall() {
  const router   = useRouter()
  const supabase = createClient()
  const [isPending, startTransition] = useTransition()

  const today = new Date().toISOString().split("T")[0]

  const [form, setForm] = useState({
    recall_date:           today,
    recall_type:           "mock" as "mock" | "actual",
    trigger_reason:        "allergen",
    trigger_detail:        "",
    product_name:          "",
    lot_numbers:           "",
    production_date_start: "",
    production_date_end:   "",
    total_units_produced:  "",
    units_at_facility:     "0",
    units_dispatched:      "0",
    units_recovered:       "0",
    customers_notified:    "0",
    time_to_identify_min:  "",
    time_to_notify_min:    "",
    usda_notified:         false,
    usda_notified_at:      "",
    outcome:               "completed",
    root_cause:            "",
    corrective_action:     "",
    system_gaps_identified:"",
    notes:                 "",
  })

  const [error,   setError]   = useState("")
  const [success, setSuccess] = useState(false)

  function setF(k: string, v: string | boolean) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  const dispatchedNum = Number(form.units_dispatched) || 0
  const recoveredNum  = Number(form.units_recovered) || 0
  const recoveryPct   = dispatchedNum > 0 ? ((recoveredNum / dispatchedNum) * 100).toFixed(1) : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!form.product_name.trim()) return setError("Ingresa el nombre del producto.")
    if (!form.lot_numbers.trim()) return setError("Ingresa el/los número(s) de lote.")

    startTransition(async () => {
      const { error: dbErr } = await supabase.from("mock_recalls").insert({
        recall_date:           form.recall_date,
        recall_type:           form.recall_type,
        trigger_reason:        form.trigger_reason,
        trigger_detail:        form.trigger_detail         || null,
        product_name:          form.product_name.trim(),
        lot_numbers:           form.lot_numbers.trim(),
        production_date_start: form.production_date_start || null,
        production_date_end:   form.production_date_end   || null,
        total_units_produced:  form.total_units_produced ? Number(form.total_units_produced) : null,
        units_at_facility:     Number(form.units_at_facility) || 0,
        units_dispatched:      Number(form.units_dispatched)  || 0,
        units_recovered:       Number(form.units_recovered)   || 0,
        customers_notified:    Number(form.customers_notified) || 0,
        time_to_identify_min:  form.time_to_identify_min ? Number(form.time_to_identify_min) : null,
        time_to_notify_min:    form.time_to_notify_min   ? Number(form.time_to_notify_min)   : null,
        usda_notified:         form.usda_notified,
        usda_notified_at:      form.usda_notified && form.usda_notified_at ? new Date(form.usda_notified_at).toISOString() : null,
        outcome:               form.outcome,
        root_cause:            form.root_cause             || null,
        corrective_action:     form.corrective_action      || null,
        system_gaps_identified:form.system_gaps_identified || null,
        notes:                 form.notes                  || null,
      })
      if (dbErr) { setError(dbErr.message); return }
      setSuccess(true)
      setTimeout(() => router.push("/recall"), 1000)
    })
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
          {form.recall_type === "mock" ? "Simulacro registrado" : "Retiro registrado"}
        </p>
        <p className="text-sm text-slate-400">Redirigiendo…</p>
      </div>
    )
  }

  const inputCls = "w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/40 focus:border-rose-400"
  const cardCls  = "bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden"

  return (
    <div className="max-w-[760px] space-y-6">

      <div className="flex items-start gap-4">
        <button onClick={() => router.back()} className="mt-0.5 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center">
              <RotateCcw className="w-4 h-4 text-rose-600" />
            </span>
            Nuevo Recall / Simulacro
          </h1>
          <p className="text-sm text-slate-400 mt-1">FSMA · 9 CFR 320 · Trazabilidad de producto</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Type + date */}
        <div className={cardCls}>
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <Target className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Tipo de evento</span>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex gap-3">
              {[
                { value: "mock",   label: "🎯 Simulacro",  desc: "Ejercicio de práctica anual",     color: "border-rose-300 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300" },
                { value: "actual", label: "🚨 Retiro real", desc: "Retiro efectivo de mercado",      color: "border-red-400 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300" },
              ].map((t) => (
                <button key={t.value} type="button" onClick={() => setF("recall_type", t.value)}
                  className={`flex-1 text-left px-4 py-3 rounded-xl border-2 text-sm transition-all ${
                    form.recall_type === t.value ? t.color + " font-semibold shadow-sm" : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}>
                  <span className="block font-bold">{t.label}</span>
                  <span className="text-[11px] opacity-70">{t.desc}</span>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Fecha del evento *</label>
                <input type="date" value={form.recall_date} max={today} onChange={(e) => setF("recall_date", e.target.value)} required className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Motivo del trigger *</label>
                <select value={form.trigger_reason} onChange={(e) => setF("trigger_reason", e.target.value)} className={inputCls}>
                  {TRIGGER_REASONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Detalle del escenario</label>
                <input type="text" value={form.trigger_detail} onChange={(e) => setF("trigger_detail", e.target.value)} placeholder="Describe el escenario del simulacro o motivo del retiro…" className={inputCls} />
              </div>
            </div>
          </div>
        </div>

        {/* Product scope */}
        <div className={cardCls}>
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <Package className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Alcance del producto</span>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Nombre del producto *</label>
              <input type="text" value={form.product_name} onChange={(e) => setF("product_name", e.target.value)} required placeholder="Ej. Pork Belly 5lb" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Número(s) de lote *</label>
              <input type="text" value={form.lot_numbers} onChange={(e) => setF("lot_numbers", e.target.value)} required placeholder="L2024-001, L2024-002…" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Unidades producidas</label>
              <input type="number" min={0} value={form.total_units_produced} onChange={(e) => setF("total_units_produced", e.target.value)} placeholder="Total producido" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Fecha producción — inicio</label>
              <input type="date" value={form.production_date_start} onChange={(e) => setF("production_date_start", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Fecha producción — fin</label>
              <input type="date" value={form.production_date_end} onChange={(e) => setF("production_date_end", e.target.value)} className={inputCls} />
            </div>
          </div>
        </div>

        {/* Traceability metrics */}
        <div className={cardCls}>
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Métricas de trazabilidad</span>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">En planta</label>
                <input type="number" min={0} value={form.units_at_facility} onChange={(e) => setF("units_at_facility", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Despachados</label>
                <input type="number" min={0} value={form.units_dispatched} onChange={(e) => setF("units_dispatched", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Recuperados</label>
                <input type="number" min={0} value={form.units_recovered} onChange={(e) => setF("units_recovered", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Clientes notif.</label>
                <input type="number" min={0} value={form.customers_notified} onChange={(e) => setF("customers_notified", e.target.value)} className={inputCls} />
              </div>
            </div>

            {/* Recovery indicator */}
            {recoveryPct !== null && (
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
                Number(recoveryPct) >= 90
                  ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                  : "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
              }`}>
                {Number(recoveryPct) >= 90
                  ? <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  : <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                }
                <div>
                  <p className={`font-black text-lg tabular-nums ${Number(recoveryPct) >= 90 ? "text-green-700 dark:text-green-300" : "text-amber-700 dark:text-amber-300"}`}>
                    {recoveryPct}% recuperado
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {Number(recoveryPct) >= 90 ? "Trazabilidad efectiva (≥90%)" : "Por debajo del umbral recomendado de 90%"}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Tiempo identificar lote (min)</label>
                <input type="number" min={0} value={form.time_to_identify_min} onChange={(e) => setF("time_to_identify_min", e.target.value)} placeholder="Minutos" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Tiempo notificar clientes (min)</label>
                <input type="number" min={0} value={form.time_to_notify_min} onChange={(e) => setF("time_to_notify_min", e.target.value)} placeholder="Minutos" className={inputCls} />
              </div>
            </div>
          </div>
        </div>

        {/* USDA notification (actual recalls only) */}
        {form.recall_type === "actual" && (
          <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-red-200 dark:border-red-800">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.usda_notified} onChange={(e) => setF("usda_notified", e.target.checked)} className="w-4 h-4 accent-red-600" />
                <span className="text-sm font-bold text-red-800 dark:text-red-200">USDA/FSIS notificado (requerido en retiros reales)</span>
              </label>
            </div>
            {form.usda_notified && (
              <div className="p-5">
                <label className="block text-xs font-semibold text-red-700 dark:text-red-300 mb-1.5 uppercase tracking-wide">Fecha y hora de notificación</label>
                <input type="datetime-local" value={form.usda_notified_at} onChange={(e) => setF("usda_notified_at", e.target.value)} className="w-full border border-red-200 dark:border-red-700 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-400/40" />
              </div>
            )}
          </div>
        )}

        {/* Outcome + lessons */}
        <div className={cardCls}>
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Resultado y lecciones aprendidas</span>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Estado del evento</label>
              <div className="flex gap-2 flex-wrap">
                {OUTCOMES.map((o) => (
                  <button key={o.value} type="button" onClick={() => setF("outcome", o.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-all ${
                      form.outcome === o.value ? o.color : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Causa raíz</label>
              <textarea value={form.root_cause} onChange={(e) => setF("root_cause", e.target.value)} rows={2} placeholder="¿Por qué ocurrió o se simuló este escenario?" className={inputCls + " resize-none"} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Acción correctiva / mejora</label>
              <textarea value={form.corrective_action} onChange={(e) => setF("corrective_action", e.target.value)} rows={2} placeholder="¿Qué se mejoró o se implementará para prevenir recurrencia?" className={inputCls + " resize-none"} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Brechas del sistema identificadas</label>
              <textarea value={form.system_gaps_identified} onChange={(e) => setF("system_gaps_identified", e.target.value)} rows={2} placeholder="Fallas en procedimientos, documentación, comunicación, etc." className={inputCls + " resize-none"} />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className={cardCls}>
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Notas adicionales</span>
          </div>
          <div className="p-5">
            <textarea value={form.notes} onChange={(e) => setF("notes", e.target.value)} rows={2} placeholder="Observaciones…" className={inputCls + " resize-none"} />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-between gap-4 pb-8">
          <button type="button" onClick={() => router.back()} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={isPending} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold shadow-sm transition-all">
            {isPending
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando…</>
              : <><Save className="w-4 h-4" />Guardar registro</>
            }
          </button>
        </div>
      </form>
    </div>
  )
}
