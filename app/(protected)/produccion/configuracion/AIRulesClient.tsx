"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import {
  Scale,
  TrendingUp,
  Thermometer,
  Lock,
  Bell,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader2,
} from "lucide-react"
import type { AIRule } from "./page"

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const RULE_TYPE_OPTIONS = [
  { value: "weight_min",      label: "Peso mínimo por caja",          unit: "lbs" },
  { value: "weight_max",      label: "Peso máximo por caja",          unit: "lbs" },
  { value: "pace_min",        label: "Ritmo mínimo",                  unit: "cajas/hora" },
  { value: "temp_interval",   label: "Verificar temperatura cada",    unit: "minutos" },
  { value: "temp_max",        label: "Temperatura máxima",            unit: "°F" },
  { value: "temp_min",        label: "Temperatura mínima",            unit: "°F" },
  { value: "min_boxes_close", label: "Mínimo cajas para cerrar",      unit: "cajas" },
  { value: "custom_reminder", label: "Recordatorio personalizado",    unit: "minutos" },
]

const DEFAULT_MESSAGES: Record<string, string> = {
  weight_min:       "⚠️ Caja muy liviana — revisar pesaje.",
  weight_max:       "⚠️ Caja muy pesada — revisar llenado.",
  pace_min:         "🐢 Ritmo bajo — verificar si hay problemas en línea.",
  temp_interval:    "🌡️ Hora de verificar temperatura del producto.",
  temp_max:         "🔴 Temperatura alta — producto en riesgo de no conformidad.",
  temp_min:         "🔵 Temperatura baja — posible congelación o equipo.",
  min_boxes_close:  "❌ No se puede cerrar hasta completar el mínimo de cajas.",
  custom_reminder:  "Recordatorio de producción.",
}

const RULE_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  RULE_TYPE_OPTIONS.map((o) => [o.value, o.label])
)

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────
function RuleIcon({ type, className = "w-5 h-5" }: { type: string; className?: string }) {
  if (type === "weight_min" || type === "weight_max") return <Scale className={className} />
  if (type === "pace_min")        return <TrendingUp className={className} />
  if (type.startsWith("temp"))    return <Thermometer className={className} />
  if (type === "min_boxes_close") return <Lock className={className} />
  return <Bell className={className} />
}

function ActionBadge({ action }: { action: string }) {
  if (action === "alert")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
        Alerta
      </span>
    )
  if (action === "warn")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
        Aviso
      </span>
    )
  if (action === "block")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 dark:bg-red-900/40 text-red-900 dark:text-red-300">
        <Lock className="w-3 h-3" /> Bloqueo
      </span>
    )
  return null
}

function accentClass(action: string) {
  if (action === "alert") return "border-l-4 border-red-500"
  if (action === "warn")  return "border-l-4 border-amber-500"
  if (action === "block") return "border-l-4 border-red-800"
  return "border-l-4 border-slate-300 dark:border-slate-600"
}

function iconBgClass(type: string) {
  if (type === "weight_min" || type === "weight_max")
    return "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
  if (type === "pace_min")
    return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
  if (type.startsWith("temp"))
    return "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
  if (type === "min_boxes_close")
    return "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
  return "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────
interface Props {
  rules: AIRule[]
  organizationId: string
}

const EMPTY_FORM = {
  rule_type: "weight_min",
  value: "",
  action: "warn",
  message: DEFAULT_MESSAGES["weight_min"],
}

export function AIRulesClient({ rules: initialRules, organizationId }: Props) {
  const supabase = createClient()
  const [rules, setRules] = useState<AIRule[]>(initialRules)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, startSubmit] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // Derive unit from selected type
  const selectedOption = RULE_TYPE_OPTIONS.find((o) => o.value === form.rule_type)
  const derivedUnit = selectedOption?.unit ?? ""

  // Handle rule_type change → auto-fill unit + default message
  function handleTypeChange(type: string) {
    setForm((f) => ({
      ...f,
      rule_type: type,
      message: DEFAULT_MESSAGES[type] ?? "",
    }))
  }

  // ── Add rule ──────────────────────────────
  async function handleAddRule(e: React.FormEvent) {
    e.preventDefault()
    if (!form.value || isNaN(Number(form.value))) {
      toast.error("Ingresa un valor numérico válido.")
      return
    }
    startSubmit(async () => {
      const { data, error } = await supabase
        .from("produccion_ai_rules")
        .insert({
          organization_id: organizationId,
          is_active: true,
          rule_type: form.rule_type,
          value: Number(form.value),
          unit: derivedUnit,
          action: form.action,
          message: form.message,
          sort_order: rules.length,
        })
        .select()
        .single()

      if (error) {
        toast.error("Error al agregar la regla: " + error.message)
        return
      }
      setRules((prev) => [...prev, data as AIRule])
      setForm({ ...EMPTY_FORM, message: DEFAULT_MESSAGES["weight_min"] })
      toast.success("Regla agregada correctamente.")
    })
  }

  // ── Toggle active ─────────────────────────
  async function handleToggle(rule: AIRule) {
    setTogglingId(rule.id)
    // Optimistic update
    setRules((prev) =>
      prev.map((r) => (r.id === rule.id ? { ...r, is_active: !r.is_active } : r))
    )
    const { error } = await supabase
      .from("produccion_ai_rules")
      .update({ is_active: !rule.is_active })
      .eq("id", rule.id)

    if (error) {
      // Revert
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, is_active: rule.is_active } : r))
      )
      toast.error("No se pudo actualizar la regla.")
    } else {
      toast.success(rule.is_active ? "Regla desactivada." : "Regla activada.")
    }
    setTogglingId(null)
  }

  // ── Delete rule ───────────────────────────
  async function handleDelete(rule: AIRule) {
    if (!confirm(`¿Eliminar la regla "${RULE_TYPE_LABELS[rule.rule_type] ?? rule.rule_type}"?`)) return
    setDeletingId(rule.id)
    const { error } = await supabase
      .from("produccion_ai_rules")
      .delete()
      .eq("id", rule.id)

    if (error) {
      toast.error("No se pudo eliminar la regla.")
    } else {
      setRules((prev) => prev.filter((r) => r.id !== rule.id))
      toast.success("Regla eliminada.")
    }
    setDeletingId(null)
  }

  // ── Render ────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Add Rule Form ── */}
      <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        {/* Form header */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
            <Plus className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">
            Agregar nueva regla
          </h2>
        </div>

        <form onSubmit={handleAddRule} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Rule type */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                Tipo de regla
              </label>
              <select
                value={form.rule_type}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 transition-colors"
              >
                {RULE_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Action */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                Acción
              </label>
              <select
                value={form.action}
                onChange={(e) => setForm((f) => ({ ...f, action: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 transition-colors"
              >
                <option value="warn">Aviso (warn)</option>
                <option value="alert">Alerta (alert)</option>
                <option value="block">Bloqueo (block)</option>
              </select>
            </div>

            {/* Value */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                Valor
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="any"
                  placeholder="0"
                  value={form.value}
                  onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                  className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 transition-colors tabular-nums"
                  required
                />
                {derivedUnit && (
                  <span className="flex-shrink-0 text-sm font-semibold text-slate-500 dark:text-slate-400 min-w-[56px] text-right">
                    {derivedUnit}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Message */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
              Mensaje para operadores
            </label>
            <textarea
              rows={2}
              placeholder="Mensaje que verán los operadores cuando se active esta regla..."
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 transition-colors resize-none"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-colors shadow-sm shadow-purple-500/20"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Agregar Regla
            </button>
          </div>
        </form>
      </div>

      {/* ── Rules List ── */}
      {rules.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Reglas configuradas
            <span className="ml-2 inline-flex items-center px-2 py-px rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 normal-case tracking-normal">
              {rules.length}
            </span>
          </h2>

          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-slate-700 p-4 ${accentClass(rule.action)} ${
                !rule.is_active ? "opacity-50" : ""
              } transition-opacity`}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBgClass(rule.rule_type)}`}
                >
                  <RuleIcon type={rule.rule_type} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      {RULE_TYPE_LABELS[rule.rule_type] ?? rule.rule_type}
                    </span>
                    <ActionBadge action={rule.action} />
                    {!rule.is_active && (
                      <span className="inline-flex items-center px-2 py-px rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                        Inactiva
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1.5 mb-2">
                    <span className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
                      {rule.value}
                    </span>
                    {rule.unit && (
                      <span className="text-sm text-slate-500 dark:text-slate-400">{rule.unit}</span>
                    )}
                  </div>
                  {rule.message && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 py-2 font-medium">
                      {rule.message}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                  {/* Toggle */}
                  <button
                    onClick={() => handleToggle(rule)}
                    disabled={togglingId === rule.id}
                    title={rule.is_active ? "Desactivar regla" : "Activar regla"}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-50"
                  >
                    {togglingId === rule.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : rule.is_active ? (
                      <ToggleRight className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="w-5 h-5" />
                    )}
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(rule)}
                    disabled={deletingId === rule.id}
                    title="Eliminar regla"
                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50"
                  >
                    {deletingId === rule.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty rules list state */}
      {rules.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] flex flex-col items-center justify-center py-12 px-4">
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
            Aún no hay reglas. Usa el formulario de arriba para agregar la primera.
          </p>
        </div>
      )}
    </div>
  )
}
