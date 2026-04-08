"use client"

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState, useEffect, useRef, useCallback } from "react"
import {
  Scale,
  Timer,
  AlertTriangle,
  Thermometer,
  Plus,
  CheckCircle2,
  TrendingUp,
  Box,
  Target,
  Zap,
  Clock,
} from "lucide-react"
import { toast } from "sonner"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Session {
  id: string
  client_name: string
  product_name: string
  shift_date: string
  status: string
  target_boxes: number | null
  target_weight_lbs: string | null
  notes: string | null
  created_at: string
  start_time: string | null
  lot_reference: string | null
  production_line: string | null
  session_number: number | null
}

interface Entry {
  id: string
  box_number: number
  weight_lbs: number
  logged_by: string | null
  created_at: string
  notes: string | null
  lot_reference: string | null
  temperature_f: number | null
}

interface TempLog {
  id: string
  session_id: string
  organization_id: string | null
  box_number_at: number | null
  temperature_f: number
  location: "center" | "surface" | "ambient"
  logged_by: string | null
  created_at: string
  notes: string | null
}

interface AiRule {
  id: string
  organization_id: string | null
  is_active: boolean
  rule_type: string
  value: number
  unit: string | null
  action: string
  message: string | null
}

interface Alert {
  id: string
  rule_type: string
  action: string
  message: string | null
  value: number
  unit: string | null
  triggeredAt: Date
  boxNumber?: number
  weight?: number
}

interface Props {
  session: Session
  entries: Entry[]
  tempLogs: TempLog[]
  rules: AiRule[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatElapsed(s: number) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
}

function fmtW(lbs: number) {
  return `${lbs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} lbs`
}

function fmtTime(ts: string) {
  return new Date(ts).toLocaleTimeString("es-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProduccionLive({ session, entries, tempLogs, rules }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const weightInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [weight, setWeight] = useState("")
  const [lotRef, setLotRef] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)

  // Alerts
  const [alerts, setAlerts] = useState<Alert[]>([])

  // Timer
  const [elapsed, setElapsed] = useState(0)

  // Temp form
  const [showTempForm, setShowTempForm] = useState(false)
  const [tempValue, setTempValue] = useState("")
  const [tempLocation, setTempLocation] = useState<"center" | "surface" | "ambient">("center")
  const [tempNotes, setTempNotes] = useState("")
  const [tempLoading, setTempLoading] = useState(false)

  const isActive = session.status === "active"

  // ── Timer ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    const startTime = new Date(
      session.start_time || session.created_at
    ).getTime()

    const interval = setInterval(() => {
      const s = Math.floor((Date.now() - startTime) / 1000)
      setElapsed(s)

      // Check temp_interval rule
      const tempRule = rules.find((r) => r.is_active && r.rule_type === "temp_interval")
      if (tempRule && s > 0 && s % Math.round(tempRule.value * 60) === 0) {
        setShowTempForm(true)
      }
    }, 1000)

    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Auto-focus on mount ────────────────────────────────────────────────────

  useEffect(() => {
    if (isActive) weightInputRef.current?.focus()
  }, [isActive])

  // ── Computed stats ─────────────────────────────────────────────────────────

  const boxCount = entries.length
  const totalWeight =
    entries.reduce((s, e) => s + parseFloat(String(e.weight_lbs)), 0)
  const avgWeight = boxCount > 0 ? totalWeight / boxCount : 0
  const minWeight =
    boxCount > 0
      ? Math.min(...entries.map((e) => parseFloat(String(e.weight_lbs))))
      : 0
  const maxWeight =
    boxCount > 0
      ? Math.max(...entries.map((e) => parseFloat(String(e.weight_lbs))))
      : 0

  const elapsedHours = elapsed / 3600
  const pacePerHour =
    elapsedHours > 0 ? boxCount / elapsedHours : 0

  const projectedHoursRemaining =
    session.target_boxes && pacePerHour > 0
      ? (session.target_boxes - boxCount) / pacePerHour
      : null

  const weightConsistency =
    boxCount > 1 && avgWeight > 0
      ? Math.round(
          (entries.filter(
            (e) =>
              Math.abs(parseFloat(String(e.weight_lbs)) - avgWeight) <=
              avgWeight * 0.1
          ).length /
            boxCount) *
            100
        )
      : 100

  const pctBoxes =
    session.target_boxes && session.target_boxes > 0
      ? Math.min(100, Math.round((boxCount / session.target_boxes) * 100))
      : null

  const pctWeight =
    session.target_weight_lbs
      ? Math.min(
          100,
          Math.round(
            (totalWeight / parseFloat(session.target_weight_lbs)) * 100
          )
        )
      : null

  // ── AI Rules Engine ────────────────────────────────────────────────────────

  const checkRules = useCallback(
    (newWeight: number, allEntries: Entry[]) => {
      const newAlerts: Alert[] = []

      for (const rule of rules) {
        if (!rule.is_active) continue

        switch (rule.rule_type) {
          case "weight_min":
            if (newWeight < rule.value) {
              newAlerts.push({
                ...rule,
                triggeredAt: new Date(),
                boxNumber: allEntries.length,
                weight: newWeight,
              })
            }
            break
          case "weight_max":
            if (newWeight > rule.value) {
              newAlerts.push({
                ...rule,
                triggeredAt: new Date(),
                boxNumber: allEntries.length,
                weight: newWeight,
              })
            }
            break
          case "pace_min": {
            const pace =
              elapsedHours > 0 ? allEntries.length / elapsedHours : 0
            if (pace < rule.value && allEntries.length > 5) {
              newAlerts.push({ ...rule, triggeredAt: new Date() })
            }
            break
          }
          default:
            break
        }
      }

      if (newAlerts.length > 0) {
        setAlerts((prev) => [...newAlerts, ...prev].slice(0, 5))
      }
    },
    [rules, elapsedHours]
  )

  // ── Add box handler ────────────────────────────────────────────────────────

  const handleAddBox = async (e: React.FormEvent) => {
    e.preventDefault()
    const w = parseFloat(weight)
    if (!weight || isNaN(w) || w <= 0) {
      toast.error("Ingresa un peso válido mayor a 0")
      weightInputRef.current?.focus()
      return
    }

    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, organization_id")
      .eq("id", user!.id)
      .single()

    const nextBoxNumber = boxCount + 1

    const { error } = await supabase.from("box_entries").insert({
      session_id: session.id,
      organization_id: profile!.organization_id,
      box_number: nextBoxNumber,
      weight_lbs: w,
      logged_by: profile!.id,
      notes: notes.trim() || null,
      lot_reference: lotRef.trim() || null,
    })

    if (error) {
      toast.error("Error al registrar caja: " + error.message)
      setLoading(false)
      return
    }

    toast.success(`✓ Caja #${nextBoxNumber} — ${w.toFixed(2)} lbs`, {
      duration: 2000,
    })

    // Run rules check against a synthetic updated entries list
    const syntheticEntry: Entry = {
      id: "tmp",
      box_number: nextBoxNumber,
      weight_lbs: w,
      logged_by: null,
      created_at: new Date().toISOString(),
      notes: null,
      lot_reference: null,
      temperature_f: null,
    }
    checkRules(w, [...entries, syntheticEntry])

    setWeight("")
    setLotRef("")
    setNotes("")
    setLoading(false)
    router.refresh()

    setTimeout(() => weightInputRef.current?.focus(), 80)
  }

  // ── Add temperature handler ────────────────────────────────────────────────

  const handleAddTemp = async () => {
    const t = parseFloat(tempValue)
    if (!tempValue || isNaN(t)) {
      toast.error("Ingresa una temperatura válida")
      return
    }

    setTempLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, organization_id")
      .eq("id", user!.id)
      .single()

    const { error } = await supabase.from("produccion_temp_logs").insert({
      session_id: session.id,
      organization_id: profile!.organization_id,
      box_number_at: boxCount,
      temperature_f: t,
      location: tempLocation,
      logged_by: profile!.id,
      notes: tempNotes.trim() || null,
    })

    if (error) {
      toast.error("Error al registrar temperatura: " + error.message)
      setTempLoading(false)
      return
    }

    // Check temp_max / temp_min rules
    for (const rule of rules) {
      if (!rule.is_active) continue
      if (rule.rule_type === "temp_max" && t > rule.value) {
        setAlerts((prev) =>
          [
            {
              ...rule,
              triggeredAt: new Date(),
              weight: undefined,
              boxNumber: boxCount,
            },
            ...prev,
          ].slice(0, 5)
        )
        toast.warning(rule.message || `Temperatura alta: ${t}°F`)
      }
      if (rule.rule_type === "temp_min" && t < rule.value) {
        setAlerts((prev) =>
          [
            {
              ...rule,
              triggeredAt: new Date(),
              weight: undefined,
              boxNumber: boxCount,
            },
            ...prev,
          ].slice(0, 5)
        )
        toast.warning(rule.message || `Temperatura baja: ${t}°F`)
      }
    }

    toast.success(`🌡️ Temperatura registrada: ${t}°F (${tempLocation})`, {
      duration: 2000,
    })
    setTempValue("")
    setTempNotes("")
    setTempLocation("center")
    setTempLoading(false)
    setShowTempForm(false)
    router.refresh()
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const nextBoxNumber = boxCount + 1
  const recentEntries = [...entries].reverse().slice(0, 10)

  return (
    <div className="space-y-4">

      {/* ── Session Banner + Timer ── */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Sesión en vivo
            </p>
            <p className="text-base font-black text-slate-900 dark:text-white truncate">
              {session.client_name} · {session.product_name}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Timer className="w-5 h-5 text-emerald-500" />
            <span className="font-mono text-4xl font-black text-slate-900 dark:text-white tabular-nums leading-none">
              {formatElapsed(elapsed)}
            </span>
          </div>
        </div>
      </div>

      {/* ── KPI Stats Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Cajas */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <Box className="w-4 h-4 text-blue-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Cajas
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
            {boxCount}
          </p>
          {session.target_boxes && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              meta: {session.target_boxes}
            </p>
          )}
        </div>

        {/* Peso Total */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <Scale className="w-4 h-4 text-emerald-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Peso
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
            {totalWeight > 0
              ? `${totalWeight.toLocaleString("en-US", {
                  maximumFractionDigits: 0,
                })}`
              : "—"}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {totalWeight > 0 ? "lbs totales" : "aún sin cajas"}
          </p>
        </div>

        {/* Pace */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Ritmo
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
            {pacePerHour > 0 ? pacePerHour.toFixed(1) : "—"}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            cajas/hora
          </p>
        </div>

        {/* Projected finish or consistency */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            {projectedHoursRemaining !== null ? (
              <Target className="w-4 h-4 text-violet-500" />
            ) : (
              <TrendingUp className="w-4 h-4 text-violet-500" />
            )}
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {projectedHoursRemaining !== null ? "ETA" : "Consist."}
            </span>
          </div>
          {projectedHoursRemaining !== null ? (
            <>
              <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
                {projectedHoursRemaining <= 0
                  ? "¡Meta!"
                  : projectedHoursRemaining < 1
                  ? `${Math.round(projectedHoursRemaining * 60)}m`
                  : `${projectedHoursRemaining.toFixed(1)}h`}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                tiempo restante
              </p>
            </>
          ) : (
            <>
              <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
                {weightConsistency}%
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                dentro ±10%
              </p>
            </>
          )}
        </div>
      </div>

      {/* ── Progress Bars ── */}
      {(pctBoxes !== null || pctWeight !== null) && (
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm space-y-3">
          {pctBoxes !== null && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">
                  Cajas: {boxCount} / {session.target_boxes}
                </span>
                <span className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400">
                  {pctBoxes}% de meta
                </span>
              </div>
              <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${pctBoxes}%` }}
                />
              </div>
            </div>
          )}
          {pctWeight !== null && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">
                  Peso:{" "}
                  {totalWeight.toLocaleString("en-US", {
                    maximumFractionDigits: 0,
                  })}{" "}
                  / {parseFloat(session.target_weight_lbs!).toLocaleString()} lbs
                </span>
                <span className="text-[12px] font-bold text-blue-600 dark:text-blue-400">
                  {pctWeight}%
                </span>
              </div>
              <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${pctWeight}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── AI Alerts ── */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, idx) => (
            <div
              key={`${alert.id}-${idx}`}
              className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 rounded-r-xl px-4 py-3 flex items-start gap-3"
            >
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-red-800 dark:text-red-200">
                  {alert.action === "alert"
                    ? "ALERTA"
                    : alert.action === "warn"
                    ? "ADVERTENCIA"
                    : "BLOQUEADO"}
                  {alert.boxNumber ? ` — Caja #${alert.boxNumber}` : ""}
                  {alert.weight ? ` fue ${alert.weight.toFixed(2)} lbs` : ""}
                </p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-0.5">
                  {alert.message ||
                    (alert.rule_type === "weight_min"
                      ? `Peso por debajo del mínimo (${alert.value} ${alert.unit || "lbs"})`
                      : alert.rule_type === "weight_max"
                      ? `Peso por encima del máximo (${alert.value} ${alert.unit || "lbs"})`
                      : alert.rule_type === "pace_min"
                      ? `Ritmo lento — mínimo ${alert.value} cajas/hora`
                      : `Regla: ${alert.rule_type}`)}
                </p>
              </div>
              <button
                onClick={() =>
                  setAlerts((prev) => prev.filter((_, i) => i !== idx))
                }
                className="text-red-400 hover:text-red-600 dark:hover:text-red-300 text-xs flex-shrink-0"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Add Box Form ── */}
      {isActive && (
        <div className="bg-white dark:bg-[#111827] border-2 border-emerald-300 dark:border-emerald-700/60 rounded-xl shadow-sm overflow-hidden">
          {/* Form header */}
          <div className="px-5 py-3 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-200 dark:border-emerald-800/40">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
                Registrar Caja{" "}
                <span className="font-black text-emerald-600 dark:text-emerald-300">
                  #{nextBoxNumber}
                </span>
              </p>
            </div>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
              Ingresa el peso y presiona Enter o el botón
            </p>
          </div>

          <form onSubmit={handleAddBox} className="p-5">
            {/* Big weight input */}
            <div className="mb-4">
              <input
                ref={weightInputRef}
                type="number"
                step="0.01"
                min="0.01"
                max="9999"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="0.00"
                required
                disabled={!isActive || loading}
                className="w-full px-4 py-5 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-4xl font-black text-slate-900 dark:text-white text-center tabular-nums placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Secondary fields */}
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Lote (opcional)
                </label>
                <input
                  type="text"
                  value={lotRef}
                  onChange={(e) => setLotRef(e.target.value)}
                  placeholder="Ref. de lote"
                  maxLength={40}
                  disabled={loading}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="flex-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Notas (opcional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: caja rota..."
                  maxLength={80}
                  disabled={loading}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !isActive}
                className="flex-shrink-0 h-[42px] px-5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold rounded-xl transition-colors shadow-sm inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">
                  {loading ? "..." : "Agregar"}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Temperature & Actions Row ── */}
      <div className="flex items-center gap-3 flex-wrap">
        {isActive && (
          <button
            onClick={() => setShowTempForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Thermometer className="w-4 h-4 text-orange-500" />
            Registrar Temperatura
          </button>
        )}

        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Thermometer className="w-4 h-4" />
          <span>
            {tempLogs.length > 0
              ? `${tempLogs.length} temp. registrada${tempLogs.length !== 1 ? "s" : ""}`
              : "Sin registros de temperatura"}
          </span>
          {tempLogs.length > 0 && (
            <span className="font-bold text-slate-700 dark:text-slate-300">
              · Última: {tempLogs[0].temperature_f}°F (
              {tempLogs[0].location})
            </span>
          )}
        </div>
      </div>

      {/* ── Box Table ── */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Box className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">
              Últimas cajas
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {avgWeight > 0 && (
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Promedio: <span className="font-bold">{fmtW(avgWeight)}</span>
              </span>
            )}
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {boxCount} {boxCount === 1 ? "caja" : "cajas"}
            </span>
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
              <Box className="w-6 h-6 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
              Aún no hay cajas registradas
            </p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
              Usa el formulario de arriba para agregar la primera caja.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    #
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Peso (lbs)
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Hora
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 hidden sm:table-cell">
                    Notas
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentEntries.map((entry) => {
                  const w = parseFloat(String(entry.weight_lbs))
                  const isLow = avgWeight > 0 && w < avgWeight * 0.9
                  const isHigh = avgWeight > 0 && w > avgWeight * 1.1

                  return (
                    <tr
                      key={entry.id}
                      className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono font-bold text-slate-500 dark:text-slate-500">
                          #{entry.box_number}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-black tabular-nums ${
                              isLow
                                ? "text-red-600 dark:text-red-400"
                                : isHigh
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-slate-900 dark:text-white"
                            }`}
                          >
                            {fmtW(w)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-slate-400 dark:text-slate-600" />
                          <span className="text-sm text-slate-500 dark:text-slate-400">
                            {fmtTime(entry.created_at)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-[120px] block">
                          {entry.notes || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isLow ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400">
                            BAJO
                          </span>
                        ) : isHigh ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
                            ALTO
                          </span>
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>

              {/* Totals */}
              {boxCount > 0 && (
                <tfoot>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
                    <td className="px-4 py-3 text-[12px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                      {boxCount} cajas
                    </td>
                    <td className="px-4 py-3 text-[13px] font-black text-slate-900 dark:text-white tabular-nums">
                      {fmtW(totalWeight)}
                    </td>
                    <td
                      colSpan={3}
                      className="px-4 py-3 text-[12px] text-slate-500 dark:text-slate-400 tabular-nums"
                    >
                      Promedio: {fmtW(avgWeight)} · Mín: {fmtW(minWeight)} ·
                      Máx: {fmtW(maxWeight)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {/* ── Session Notes ── */}
      {session.notes && (
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Notas del turno
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {session.notes}
          </p>
        </div>
      )}

      {/* ── Temperature Modal ── */}
      {showTempForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#111827] rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-4">
              <Thermometer className="w-5 h-5 text-orange-500" />
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Registrar Temperatura
              </h3>
            </div>

            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Caja actual: <span className="font-bold text-slate-700 dark:text-slate-300">#{boxCount}</span>
            </p>

            {/* Big temp input */}
            <div className="mb-4">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Temperatura (°F) *
              </label>
              <input
                type="number"
                step="0.1"
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                placeholder="32.0"
                autoFocus
                className="w-full px-4 py-4 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-3xl font-black text-center tabular-nums text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none focus:border-orange-500 dark:focus:border-orange-500 transition-colors"
              />
            </div>

            {/* Location */}
            <div className="mb-4">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Ubicación
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["center", "surface", "ambient"] as const).map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setTempLocation(loc)}
                    className={`py-2 px-3 rounded-xl text-sm font-bold border-2 transition-colors ${
                      tempLocation === loc
                        ? "border-orange-500 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
                        : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                    }`}
                  >
                    {loc === "center"
                      ? "Centro"
                      : loc === "surface"
                      ? "Superficie"
                      : "Ambiente"}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="mb-5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Notas (opcional)
              </label>
              <input
                type="text"
                value={tempNotes}
                onChange={(e) => setTempNotes(e.target.value)}
                placeholder="Observaciones..."
                maxLength={100}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleAddTemp}
                disabled={tempLoading || !tempValue}
                className="flex-1 py-3 px-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold rounded-xl transition-colors inline-flex items-center justify-center gap-2"
              >
                <Thermometer className="w-4 h-4" />
                {tempLoading ? "Guardando..." : "Guardar"}
              </button>
              <button
                onClick={() => {
                  setShowTempForm(false)
                  setTempValue("")
                  setTempNotes("")
                }}
                className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition-colors"
              >
                Omitir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
