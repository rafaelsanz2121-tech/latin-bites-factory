"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { TermTip } from "@/components/ui/TermTip"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { CCP_LABELS, CCP_LIMITS } from "@/constants/products"
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Flame,
  Plus,
  Snowflake,
  Thermometer,
  Trash2,
  XCircle,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

interface Product { id: string; name: string; code: string }

interface TempReading {
  time: string
  temp_f: string
  initials: string
  notes: string
}

const CCP_OPTIONS = [
  { value: "CCP_1B",   label: "CCP 1-B: Cooking ≥160°F",            type: "cooking"  },
  { value: "CCP_1B_1", label: "CCP 1B(1): Partial Cook 145–150°F",   type: "cooking"  },
  { value: "CCP_1B_2", label: "CCP 1B(2): Browning ≤145°F",          type: "cooking"  },
  { value: "CCP_2B",   label: "CCP 2-B: Chilling (130→80°F in 1.5h)",type: "chilling" },
  { value: "CCP_2B_1", label: "CCP 2B(1): Chilling tracking",        type: "chilling" },
]

function isTempOutOfRange(temp: string, ccpNumber: string): boolean {
  if (!temp || !ccpNumber) return false
  const t = parseFloat(temp)
  const limits = CCP_LIMITS[ccpNumber]
  if (!limits) return false
  if (limits.min !== undefined && t < limits.min) return true
  if (limits.max !== undefined && t > limits.max) return true
  return false
}

/** Calcula minutos entre dos strings "HH:MM". Retorna null si alguno está vacío. */
function minutesBetween(from: string, to: string): number | null {
  if (!from || !to) return null
  const [fh, fm] = from.split(":").map(Number)
  const [th, tm] = to.split(":").map(Number)
  const diff = (th * 60 + tm) - (fh * 60 + fm)
  return diff >= 0 ? diff : null
}

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins} min`
  return `${Math.floor(mins / 60)}h ${mins % 60}min`
}

export function CookingLogForm({
  userId,
  userInitials,
  products,
}: {
  userId: string
  userInitials: string
  products: Product[]
}) {
  const router = useRouter()
  const supabase = createClient()
  const today = new Date().toISOString().split("T")[0]
  const now = new Date().toTimeString().slice(0, 5)

  const [form, setForm] = useState({
    date: today,
    product_id: "",
    lot_batch_number: "",
    ccp_number: "CCP_1B",
    notes: "",
    // ── Oven phase ──────────────────────────
    oven_setpoint_f: "",
    oven_in_time: "",
    oven_in_temp_f: "",
    oven_out_time: "",
    oven_out_temp_f: "",
    // ── Cooler / chilling phase ──────────────
    chilling_start_time: "",
    chilling_start_temp_f: "",
    phase_one_end_time: "",
    phase_one_end_temp_f: "",
    phase_two_end_time: "",
    phase_two_end_temp_f: "",
  })

  const [readings, setReadings] = useState<TempReading[]>([
    { time: now, temp_f: "", initials: userInitials, notes: "" },
  ])

  const [loading, setLoading] = useState(false)

  const logType = CCP_OPTIONS.find((c) => c.value === form.ccp_number)?.type || "cooking"
  const isChilling = logType === "chilling"
  const isCooking  = logType === "cooking"
  const ccpLimit   = CCP_LIMITS[form.ccp_number]

  const addReading = () =>
    setReadings((prev) => [
      ...prev,
      { time: new Date().toTimeString().slice(0, 5), temp_f: "", initials: userInitials, notes: "" },
    ])

  const removeReading = (i: number) =>
    setReadings((prev) => prev.filter((_, idx) => idx !== i))

  const updateReading = (i: number, key: keyof TempReading, value: string) =>
    setReadings((prev) => prev.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)))

  const set = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }))

  // Derived time durations for live feedback
  const ovenDuration   = minutesBetween(form.oven_in_time, form.oven_out_time)
  const phase1Duration = minutesBetween(form.chilling_start_time, form.phase_one_end_time)
  const phase2Duration = minutesBetween(form.phase_one_end_time, form.phase_two_end_time)

  // Validation helpers
  const ovenOutOk = form.oven_out_temp_f
    ? !isTempOutOfRange(form.oven_out_temp_f, form.ccp_number)
    : null
  const phase1Ok = form.phase_one_end_temp_f
    ? parseFloat(form.phase_one_end_temp_f) <= 80
    : null
  const phase2Ok = form.phase_two_end_temp_f
    ? parseFloat(form.phase_two_end_temp_f) <= 40
    : null
  const phase1TimeOk = phase1Duration !== null ? phase1Duration <= 90 : null
  const phase2TimeOk = phase2Duration !== null ? phase2Duration <= 300 : null

  const handleSave = async (status: "draft" | "submitted") => {
    if (!form.product_id) { toast.error("Selecciona un producto"); return }
    if (readings.some((r) => !r.temp_f)) {
      toast.error("Todas las lecturas necesitan temperatura"); return
    }

    const hasOutOfRange = readings.some((r) => isTempOutOfRange(r.temp_f, form.ccp_number))
    if (hasOutOfRange && status === "submitted") {
      toast.error("Una o más temperaturas están fuera del límite CCP. Revisa antes de enviar.")
      return
    }

    const validReadings = readings.map((r) => ({
      time: r.time,
      temp_f: parseFloat(r.temp_f),
      initials: r.initials,
      notes: r.notes || undefined,
    }))

    setLoading(true)
    const { data, error } = await supabase
      .from("cooking_chilling_logs")
      .insert({
        date: form.date,
        product_id: form.product_id,
        lot_batch_number: form.lot_batch_number || null,
        log_type: logType,
        ccp_number: form.ccp_number,
        readings: validReadings,
        // Oven fields
        oven_setpoint_f:    form.oven_setpoint_f    ? parseFloat(form.oven_setpoint_f)    : null,
        oven_in_time:       form.oven_in_time        ? form.oven_in_time + ":00"           : null,
        oven_in_temp_f:     form.oven_in_temp_f      ? parseFloat(form.oven_in_temp_f)     : null,
        oven_out_time:      form.oven_out_time        ? form.oven_out_time + ":00"          : null,
        oven_out_temp_f:    form.oven_out_temp_f      ? parseFloat(form.oven_out_temp_f)    : null,
        // Chilling fields
        chilling_start_time:    form.chilling_start_time    ? form.chilling_start_time + ":00"    : null,
        chilling_start_temp_f:  form.chilling_start_temp_f  ? parseFloat(form.chilling_start_temp_f) : null,
        phase_one_end_time:     form.phase_one_end_time      ? form.phase_one_end_time + ":00"     : null,
        phase_one_end_temp_f:   form.phase_one_end_temp_f    ? parseFloat(form.phase_one_end_temp_f)  : null,
        phase_two_end_time:     form.phase_two_end_time      ? form.phase_two_end_time + ":00"     : null,
        phase_two_end_temp_f:   form.phase_two_end_temp_f    ? parseFloat(form.phase_two_end_temp_f)  : null,
        notes: form.notes || null,
        created_by: userId,
        status,
        submitted_at: status === "submitted" ? new Date().toISOString() : null,
      })
      .select("id")
      .single()

    setLoading(false)
    if (error) { toast.error(error.message); return }
    toast.success(status === "submitted" ? "Log enviado" : "Borrador guardado")
    router.push(`/cooking/${data.id}`)
  }

  return (
    <div className="bg-white rounded-xl border border-[var(--border)] divide-y divide-[var(--border)]">

      {/* ── Sección 1: Info básica ───────────────────────────────────── */}
      <div className="p-6 space-y-4">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-[var(--muted-foreground)]">
          Producto &amp; Proceso
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Fecha</Label>
            <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} max={today} />
          </div>
          <div className="space-y-1.5">
            <Label>Producto <span className="text-red-500">*</span></Label>
            <Select value={form.product_id} onValueChange={(v) => set("product_id", v)}>
              <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label className="flex items-center">
              Lote / Batch
              <TermTip term="lot_number" />
            </Label>
            <Input
              value={form.lot_batch_number}
              onChange={(e) => set("lot_batch_number", e.target.value)}
              placeholder="Ej. LOT-2026-03-28-001"
              className="font-mono"
            />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label className="flex items-center">
              CCP / Proceso <span className="text-red-500 ml-0.5">*</span>
              <TermTip term="CCP" />
            </Label>
            <Select value={form.ccp_number} onValueChange={(v) => set("ccp_number", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CCP_OPTIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    <span className="mr-2">{c.type === "cooking" ? "🔥" : "❄️"}</span>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {ccpLimit && (
              <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-3 py-1.5">
                📋 {ccpLimit.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Sección 2: Fase Horno (solo cooking) ─────────────────────── */}
      {isCooking && (
        <div className="p-6 space-y-4">
          {/* Header de sección */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
              <Flame className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <h2 className="font-semibold text-sm text-orange-800">Fase 1 — Horno</h2>
              <p className="text-xs text-[var(--muted-foreground)]">Registro de entrada y salida del horno</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Setpoint */}
            <div className="space-y-1.5 col-span-2">
              <Label className="flex items-center gap-1.5">
                <Thermometer className="w-3.5 h-3.5 text-orange-500" />
                Temperatura del Horno (Setpoint °F)
                <TermTip term="setpoint" side="right" />
              </Label>
              <Input
                type="number" step="1"
                placeholder="Ej. 375"
                value={form.oven_setpoint_f}
                onChange={(e) => set("oven_setpoint_f", e.target.value)}
              />
              <p className="text-xs text-[var(--muted-foreground)]">Temperatura configurada en el termostato del horno</p>
            </div>

            {/* Entrada al horno */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-orange-500" />
                Hora entrada al horno
              </Label>
              <Input
                type="time"
                value={form.oven_in_time}
                onChange={(e) => set("oven_in_time", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Thermometer className="w-3.5 h-3.5 text-orange-500" />
                Temp. interna al entrar (°F)
              </Label>
              <Input
                type="number" step="0.1"
                placeholder="Ej. 38.0"
                value={form.oven_in_temp_f}
                onChange={(e) => set("oven_in_temp_f", e.target.value)}
              />
            </div>

            {/* Salida del horno */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-orange-500" />
                Hora salida del horno
              </Label>
              <Input
                type="time"
                value={form.oven_out_time}
                onChange={(e) => set("oven_out_time", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Thermometer className="w-3.5 h-3.5 text-orange-500" />
                Temp. interna al salir (°F) — CCP
                <TermTip term="internal_temp" side="left" />
              </Label>
              <div className="relative">
                <Input
                  type="number" step="0.1"
                  placeholder="≥160°F"
                  value={form.oven_out_temp_f}
                  onChange={(e) => set("oven_out_temp_f", e.target.value)}
                  className={cn(
                    form.oven_out_temp_f && ovenOutOk === false && "border-red-400 bg-red-50",
                    form.oven_out_temp_f && ovenOutOk === true  && "border-green-400 bg-green-50",
                  )}
                />
                {form.oven_out_temp_f && ovenOutOk !== null && (
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                    {ovenOutOk
                      ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                      : <XCircle className="w-4 h-4 text-red-600" />
                    }
                  </div>
                )}
              </div>
              {form.oven_out_temp_f && ovenOutOk === false && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Temperatura fuera del límite CCP — se requiere acción correctiva
                </p>
              )}
            </div>
          </div>

          {/* Duración en horno */}
          {ovenDuration !== null && (
            <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-4 py-2.5">
              <Clock className="w-4 h-4 text-orange-600" />
              <span className="text-sm text-orange-800 font-medium">
                Tiempo en horno: <strong>{formatMinutes(ovenDuration)}</strong>
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Sección 3: Lecturas periódicas de temperatura ────────────── */}
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center",
              isChilling ? "bg-sky-100" : "bg-orange-100"
            )}>
              <Thermometer className={cn("w-4 h-4", isChilling ? "text-sky-600" : "text-orange-600")} />
            </div>
            <div>
              <h2 className="font-semibold text-sm">
                {isChilling ? "Lecturas de Enfriamiento" : "Lecturas de Cocción"}
              </h2>
              <p className="text-xs text-[var(--muted-foreground)]">
                {isChilling
                  ? "Registra la temperatura cada 30 min o según el protocolo"
                  : "Registra la temperatura interna cada 15 min durante la cocción"}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={addReading} type="button">
            <Plus className="w-3.5 h-3.5" />Agregar lectura
          </Button>
        </div>

        <div className="space-y-2">
          {readings.map((reading, i) => {
            const outOfRange = isTempOutOfRange(reading.temp_f, form.ccp_number)
            return (
              <div
                key={i}
                className={cn(
                  "grid grid-cols-[auto_1fr_1fr_80px_auto] gap-2 items-end p-3 rounded-lg border",
                  outOfRange
                    ? "border-red-300 bg-red-50"
                    : "border-[var(--border)] bg-[var(--muted)]/20"
                )}
              >
                {/* Número de lectura */}
                <div className="w-7 h-7 rounded-full bg-white border border-[var(--border)] flex items-center justify-center text-xs font-bold text-[var(--muted-foreground)] mb-0.5">
                  {i + 1}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Hora</Label>
                  <Input
                    type="time"
                    value={reading.time}
                    onChange={(e) => updateReading(i, "time", e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    Temp (°F)
                    {outOfRange && <AlertTriangle className="w-3 h-3 text-red-500" />}
                  </Label>
                  <Input
                    type="number" step="0.1"
                    value={reading.temp_f}
                    onChange={(e) => updateReading(i, "temp_f", e.target.value)}
                    className={cn("h-8 text-sm", outOfRange && "border-red-400")}
                    placeholder="°F"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Init.</Label>
                  <Input
                    value={reading.initials}
                    onChange={(e) => updateReading(i, "initials", e.target.value.toUpperCase())}
                    className="h-8 text-sm uppercase"
                    maxLength={4}
                  />
                </div>

                {readings.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeReading(i)}
                    className="p-1 text-red-400 hover:text-red-600 mb-0.5"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Sección 4: Fase Cooler (solo chilling) ──────────────────── */}
      {isChilling && (
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center">
              <Snowflake className="w-4 h-4 text-sky-600" />
            </div>
            <div>
              <h2 className="font-semibold text-sm text-sky-800">Fase 2 — Cooler / Refrigeración</h2>
              <p className="text-xs text-[var(--muted-foreground)]">Registro de entrada al cooler y tiempos de enfriamiento</p>
            </div>
          </div>

          {/* Regla de negocio */}
          <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 text-xs text-sky-700 space-y-1">
            <p className="flex items-center gap-1">
              ⚡ <strong>Fase 1:</strong> 130°F → ≤80°F en máximo <strong>1.5 horas (90 min)</strong>
              <TermTip term="chilling_phase1" side="right" />
            </p>
            <p className="flex items-center gap-1">
              ❄️ <strong>Fase 2:</strong> 80°F → ≤40°F en máximo <strong>5 horas (300 min)</strong>
              <TermTip term="chilling_phase2" side="right" />
            </p>
          </div>

          {/* ── Entrada al cooler ── */}
          <div>
            <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-3">
              Entrada al Cooler
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-sky-500" />
                  Hora de entrada al cooler
                </Label>
                <Input
                  type="time"
                  value={form.chilling_start_time}
                  onChange={(e) => set("chilling_start_time", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Thermometer className="w-3.5 h-3.5 text-sky-500" />
                  Temp. al entrar al cooler (°F)
                </Label>
                <Input
                  type="number" step="0.1"
                  placeholder="≈130°F"
                  value={form.chilling_start_temp_f}
                  onChange={(e) => set("chilling_start_temp_f", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* ── Fase 1: 130 → 80°F ── */}
          <div>
            <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-3">
              Fase 1 — 130°F a ≤80°F
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-sky-500" />
                  Hora fin fase 1
                </Label>
                <Input
                  type="time"
                  value={form.phase_one_end_time}
                  onChange={(e) => set("phase_one_end_time", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Thermometer className="w-3.5 h-3.5 text-sky-500" />
                  Temp. fin fase 1 (°F) — debe ser ≤80°F
                  <TermTip term="chilling_phase1" side="left" />
                </Label>
                <div className="relative">
                  <Input
                    type="number" step="0.1"
                    placeholder="≤80°F"
                    value={form.phase_one_end_temp_f}
                    onChange={(e) => set("phase_one_end_temp_f", e.target.value)}
                    className={cn(
                      form.phase_one_end_temp_f && phase1Ok === false && "border-red-400 bg-red-50",
                      form.phase_one_end_temp_f && phase1Ok === true  && "border-green-400 bg-green-50",
                    )}
                  />
                  {form.phase_one_end_temp_f && phase1Ok !== null && (
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      {phase1Ok
                        ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                        : <XCircle className="w-4 h-4 text-red-600" />
                      }
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* Feedback de tiempo fase 1 */}
            {phase1Duration !== null && (
              <div className={cn(
                "mt-2 flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium",
                phase1TimeOk
                  ? "bg-green-50 border border-green-200 text-green-800"
                  : "bg-red-50 border border-red-200 text-red-800"
              )}>
                {phase1TimeOk
                  ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                  : <AlertTriangle className="w-4 h-4 text-red-600" />
                }
                Duración fase 1: <strong>{formatMinutes(phase1Duration)}</strong>
                {!phase1TimeOk && " — EXCEDE el límite de 90 min"}
              </div>
            )}
          </div>

          {/* ── Fase 2: 80 → 40°F ── */}
          <div>
            <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-3">
              Fase 2 — 80°F a ≤40°F
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  Hora fin fase 2
                </Label>
                <Input
                  type="time"
                  value={form.phase_two_end_time}
                  onChange={(e) => set("phase_two_end_time", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Thermometer className="w-3.5 h-3.5 text-indigo-500" />
                  Temp. fin fase 2 (°F) — debe ser ≤40°F
                  <TermTip term="chilling_phase2" side="left" />
                </Label>
                <div className="relative">
                  <Input
                    type="number" step="0.1"
                    placeholder="≤40°F"
                    value={form.phase_two_end_temp_f}
                    onChange={(e) => set("phase_two_end_temp_f", e.target.value)}
                    className={cn(
                      form.phase_two_end_temp_f && phase2Ok === false && "border-red-400 bg-red-50",
                      form.phase_two_end_temp_f && phase2Ok === true  && "border-green-400 bg-green-50",
                    )}
                  />
                  {form.phase_two_end_temp_f && phase2Ok !== null && (
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      {phase2Ok
                        ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                        : <XCircle className="w-4 h-4 text-red-600" />
                      }
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* Feedback de tiempo fase 2 */}
            {phase2Duration !== null && (
              <div className={cn(
                "mt-2 flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium",
                phase2TimeOk
                  ? "bg-green-50 border border-green-200 text-green-800"
                  : "bg-red-50 border border-red-200 text-red-800"
              )}>
                {phase2TimeOk
                  ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                  : <AlertTriangle className="w-4 h-4 text-red-600" />
                }
                Duración fase 2: <strong>{formatMinutes(phase2Duration)}</strong>
                {!phase2TimeOk && " — EXCEDE el límite de 5 horas"}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Sección 5: Notas ─────────────────────────────────────────── */}
      <div className="p-6 space-y-2">
        <Label>Notas / Observaciones</Label>
        <Textarea
          placeholder="Observaciones, desviaciones, acciones correctivas tomadas..."
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={3}
        />
      </div>

      {/* ── Acciones ─────────────────────────────────────────────────── */}
      <div className="p-6 flex items-center justify-between gap-3">
        <Button variant="outline" onClick={() => router.back()} type="button">
          Cancelar
        </Button>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => handleSave("draft")}
            loading={loading}
            type="button"
          >
            Guardar borrador
          </Button>
          <Button onClick={() => handleSave("submitted")} loading={loading} type="button">
            Enviar para verificación
          </Button>
        </div>
      </div>
    </div>
  )
}
