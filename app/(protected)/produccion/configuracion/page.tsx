import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import {
  Brain,
  Scale,
  TrendingUp,
  Thermometer,
  Lock,
  Bell,
  Info,
  Plus,
} from "lucide-react"
import { AIRulesClient } from "./AIRulesClient"

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export type AIRule = {
  id: string
  organization_id: string | null
  is_active: boolean
  rule_type: string
  value: number
  unit: string | null
  action: string
  message: string | null
  sort_order: number | null
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const RULE_TYPE_LABELS: Record<string, string> = {
  weight_min:       "Peso mínimo por caja",
  weight_max:       "Peso máximo por caja",
  pace_min:         "Ritmo mínimo de producción",
  temp_interval:    "Frecuencia de temperatura",
  temp_max:         "Temperatura máxima",
  temp_min:         "Temperatura mínima",
  min_boxes_close:  "Cajas mínimas para cerrar",
  custom_reminder:  "Recordatorio personalizado",
}

function RuleIcon({ type }: { type: string }) {
  const cls = "w-5 h-5"
  if (type === "weight_min" || type === "weight_max")
    return <Scale className={cls} />
  if (type === "pace_min")
    return <TrendingUp className={cls} />
  if (type.startsWith("temp"))
    return <Thermometer className={cls} />
  if (type === "min_boxes_close")
    return <Lock className={cls} />
  return <Bell className={cls} />
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
        <Lock className="w-3 h-3" />
        Bloqueo
      </span>
    )
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
      {action}
    </span>
  )
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
// Page
// ─────────────────────────────────────────────
export default async function ConfiguracionPage() {
  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // Role check — admin only
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, organization_id")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "admin") redirect("/produccion")

  // Fetch rules for this org
  const { data: rulesRaw } = await supabase
    .from("produccion_ai_rules")
    .select("id, organization_id, is_active, rule_type, value, unit, action, message, sort_order")
    .eq("organization_id", profile.organization_id)
    .order("sort_order", { ascending: true })

  const rules: AIRule[] = rulesRaw || []

  return (
    <div className="space-y-6 max-w-[860px]">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-500/25">
            <Brain className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Inteligencia de Producción
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Configura las reglas que guían a los operadores durante la producción
            </p>
          </div>
        </div>
      </div>

      {/* ── Info banner ── */}
      <div className="flex items-start gap-3 rounded-xl border border-purple-200 dark:border-purple-800/50 bg-purple-50 dark:bg-purple-900/10 p-4">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-800/40 flex items-center justify-center mt-0.5">
          <Info className="w-4 h-4 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-purple-900 dark:text-purple-300 mb-0.5">
            ¿Cómo funcionan las reglas?
          </p>
          <p className="text-sm text-purple-700 dark:text-purple-400 leading-relaxed">
            Estas reglas se aplican automáticamente durante cada sesión de producción. Los operadores
            reciben alertas en tiempo real cuando se detecta una situación que requiere atención.
            Las reglas de tipo <strong>bloqueo</strong> impiden ciertas acciones hasta que se corrija la situación.
          </p>
        </div>
      </div>

      {/* ── Rules count chip ── */}
      {rules.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {rules.length} {rules.length === 1 ? "regla configurada" : "reglas configuradas"}
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
            {rules.filter((r) => r.is_active).length} activas
          </span>
        </div>
      )}

      {/* ── Static rule cards (display only — interactions in client) ── */}
      {rules.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Reglas actuales
          </h2>
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-slate-700 p-4 ${accentClass(rule.action)} ${
                !rule.is_active ? "opacity-50" : ""
              }`}
            >
              <div className="flex items-start gap-3 flex-wrap">
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
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg font-black text-slate-900 dark:text-white tabular-nums">
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
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Empty state (no rules yet) ── */}
      {rules.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] flex flex-col items-center justify-center py-16 px-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center mb-3">
            <Brain className="w-7 h-7 text-purple-400 dark:text-purple-500" />
          </div>
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">
            Sin reglas configuradas
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-xs">
            Agrega tu primera regla usando el formulario de abajo para guiar a los operadores durante la producción.
          </p>
        </div>
      )}

      {/* ── Interactive client component (form + toggles + delete) ── */}
      <AIRulesClient
        rules={rules}
        organizationId={profile.organization_id ?? ""}
      />

    </div>
  )
}
