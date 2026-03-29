"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { TermTip } from "@/components/ui/TermTip"
import { createClient } from "@/lib/supabase/client"
import { calcDurationMinutes, cn, formatDuration } from "@/lib/utils"
import { AlertTriangle, CheckCircle2, Clock, Droplets, Snowflake, Thermometer } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { toast } from "sonner"

interface Product {
  id: string
  name: string
  code: string
}

interface ThawingLogFormProps {
  userId: string
  userInitials: string
  products: Product[]
  defaultValues?: Partial<{
    product_id: string
    lot_batch_number: string
    thawing_method: string
  }>
}

export function ThawingLogForm({ userId, userInitials, products, defaultValues }: ThawingLogFormProps) {
  const router = useRouter()
  const supabase = createClient()

  const today = new Date().toISOString().split("T")[0]
  const now = new Date().toTimeString().slice(0, 5)

  const [form, setForm] = useState({
    date: today,
    product_id: defaultValues?.product_id || "",
    lot_batch_number: defaultValues?.lot_batch_number || "",
    thawing_method: (defaultValues?.thawing_method || "cooler") as "cooler" | "running_water",
    start_time: now,
    start_temp_f: "",
    end_time: "",
    end_temp_f: "",
    water_temp_f: "",
    employee_initials: userInitials,
    notes: "",
  })

  const [loading, setLoading] = useState(false)
  const [submitType, setSubmitType] = useState<"draft" | "submit">("draft")

  const duration = calcDurationMinutes(form.start_time, form.end_time)
  const isLongThaw = duration !== null && duration > 480 // > 8 hours

  const waterTempWarning =
    form.thawing_method === "running_water" &&
    form.water_temp_f &&
    parseFloat(form.water_temp_f) > 70

  const endTempWarning =
    form.end_temp_f !== "" && parseFloat(form.end_temp_f) > 40

  const set = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSave = async (status: "draft" | "submitted") => {
    if (!form.product_id) {
      toast.error("Please select a product")
      return
    }
    if (!form.start_temp_f) {
      toast.error("Start temperature is required")
      return
    }
    if (status === "submitted" && !form.end_time) {
      toast.error("End time is required to submit")
      return
    }
    if (status === "submitted" && !form.end_temp_f) {
      toast.error("End temperature is required to submit")
      return
    }
    if (
      form.thawing_method === "running_water" &&
      form.water_temp_f &&
      parseFloat(form.water_temp_f) > 70
    ) {
      toast.error("Running water temperature exceeds limit of 70°F")
      return
    }

    setLoading(true)

    const payload: Record<string, unknown> = {
      date: form.date,
      product_id: form.product_id,
      lot_batch_number: form.lot_batch_number || null,
      thawing_method: form.thawing_method,
      start_time: form.start_time + ":00",
      start_temp_f: parseFloat(form.start_temp_f),
      end_time: form.end_time ? form.end_time + ":00" : null,
      end_temp_f: form.end_temp_f ? parseFloat(form.end_temp_f) : null,
      water_temp_f:
        form.thawing_method === "running_water" && form.water_temp_f
          ? parseFloat(form.water_temp_f)
          : null,
      employee_initials: form.employee_initials,
      notes: form.notes || null,
      created_by: userId,
      status,
      submitted_at: status === "submitted" ? new Date().toISOString() : null,
    }

    const { data, error } = await supabase
      .from("thawing_logs")
      .insert(payload)
      .select("id")
      .single()

    setLoading(false)

    if (error) {
      toast.error(error.message || "Failed to save log")
      return
    }

    toast.success(status === "submitted" ? "Log submitted for verification" : "Draft saved")
    router.push(`/thawing/${data.id}`)
  }

  return (
    <div className="bg-white rounded-xl border border-[var(--border)] divide-y divide-[var(--border)]">
      {/* Section: Basic Info */}
      <div className="p-6 space-y-4">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-[var(--muted-foreground)]">
          Producto &amp; Fecha
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="date">Fecha <span className="text-red-500">*</span></Label>
            <Input
              id="date"
              type="date"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
              max={today}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Producto <span className="text-red-500">*</span></Label>
            <Select value={form.product_id} onValueChange={(v) => set("product_id", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select product..." />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lot" className="flex items-center">
            Lote / Batch
            <TermTip term="lot_number" />
          </Label>
          <Input
            id="lot"
            placeholder="Ej. LOT-2026-03-28-001"
            value={form.lot_batch_number}
            onChange={(e) => set("lot_batch_number", e.target.value)}
          />
        </div>
      </div>

      {/* Section: Thawing Method */}
      <div className="p-6 space-y-4">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-[var(--muted-foreground)] flex items-center">
          Método de Descongelación
          <TermTip term="thawing" side="right" />
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: "cooler", label: "Cooler", icon: Snowflake, desc: "Refrigeración ≤40°F", term: "thawing_cooler" },
            { value: "running_water", label: "Agua Corriente", icon: Droplets, desc: "Agua corriente ≤70°F", term: "thawing_running_water" },
          ].map((method) => (
            <button
              key={method.value}
              type="button"
              onClick={() => set("thawing_method", method.value)}
              className={cn(
                "flex flex-col gap-2 p-4 rounded-lg border-2 text-left transition-colors",
                form.thawing_method === method.value
                  ? "border-blue-500 bg-blue-50"
                  : "border-[var(--border)] hover:border-slate-300"
              )}
            >
              <method.icon
                className={cn(
                  "w-5 h-5",
                  form.thawing_method === method.value ? "text-blue-600" : "text-[var(--muted-foreground)]"
                )}
              />
              <div>
                <p className="font-medium text-sm">{method.label}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{method.desc}</p>
              </div>
            </button>
          ))}
        </div>

        {form.thawing_method === "running_water" && (
          <div className="space-y-1.5">
            <Label htmlFor="water_temp" className="flex items-center">
              Temperatura del Agua (°F)
              <TermTip term="thawing_running_water" />
            </Label>
            <div className="relative">
              <Input
                id="water_temp"
                type="number"
                step="0.1"
                placeholder="Must be ≤70°F"
                value={form.water_temp_f}
                onChange={(e) => set("water_temp_f", e.target.value)}
                className={waterTempWarning ? "border-red-400 focus-visible:ring-red-400" : ""}
              />
              {waterTempWarning && (
                <div className="flex items-center gap-1.5 mt-1.5 text-red-600 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Temperatura del agua excede el límite de 70°F — violación CCP
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Section: Times & Temperatures */}
      <div className="p-6 space-y-4">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-[var(--muted-foreground)]">
          Tiempos &amp; Temperaturas
        </h2>

        <div className="grid grid-cols-2 gap-4">
          {/* Start */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <Clock className="w-4 h-4" />
              <span>Inicio</span>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="start_time">Hora de inicio <span className="text-red-500">*</span></Label>
              <Input
                id="start_time"
                type="time"
                value={form.start_time}
                onChange={(e) => set("start_time", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="start_temp" className="flex items-center gap-1">
                <Thermometer className="w-3.5 h-3.5" />
                Temp. inicio (°F) <span className="text-red-500">*</span>
                <TermTip term="danger_zone" />
              </Label>
              <Input
                id="start_temp"
                type="number"
                step="0.1"
                placeholder="e.g. 32.0"
                value={form.start_temp_f}
                onChange={(e) => set("start_temp_f", e.target.value)}
              />
            </div>
          </div>

          {/* End */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <CheckCircle2 className="w-4 h-4" />
              <span>Fin</span>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end_time">Hora de fin</Label>
              <Input
                id="end_time"
                type="time"
                value={form.end_time}
                onChange={(e) => set("end_time", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end_temp" className="flex items-center gap-1">
                <Thermometer className="w-3.5 h-3.5" />
                Temp. fin (°F)
              </Label>
              <Input
                id="end_temp"
                type="number"
                step="0.1"
                placeholder="e.g. 38.0"
                value={form.end_temp_f}
                onChange={(e) => set("end_temp_f", e.target.value)}
                className={endTempWarning ? "border-amber-400" : ""}
              />
              {endTempWarning && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Temp. fin sobre 40°F — revisa antes de enviar
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Duration indicator */}
        {duration !== null && (
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
              isLongThaw ? "bg-amber-50 text-amber-700" : "bg-slate-50 text-slate-600"
            )}
          >
            <Clock className="w-4 h-4" />
            <span>
              Duración de descongelación: <strong>{formatDuration(duration)}</strong>
              {isLongThaw && " — Tiempo extendido, verificar con supervisor"}
            </span>
          </div>
        )}
      </div>

      {/* Section: Signatures & Notes */}
      <div className="p-6 space-y-4">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-[var(--muted-foreground)]">
          Firmas &amp; Notas
        </h2>
        <div className="space-y-1.5">
          <Label htmlFor="initials" className="flex items-center">
            Iniciales del Empleado <span className="text-red-500 ml-0.5">*</span>
            <TermTip term="initials" />
          </Label>
          <Input
            id="initials"
            placeholder="Ej. JG"
            value={form.employee_initials}
            onChange={(e) => set("employee_initials", e.target.value.toUpperCase())}
            maxLength={4}
            className="uppercase w-24"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="notes">Notas / Observaciones</Label>
          <Textarea
            id="notes"
            placeholder="Observaciones, desviaciones, acciones tomadas..."
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="p-6 flex items-center justify-between gap-3">
        <Button
          variant="outline"
          onClick={() => router.back()}
          type="button"
        >
          Cancelar
        </Button>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => handleSave("draft")}
            loading={loading && submitType === "draft"}
            disabled={loading}
            type="button"
          >
            Guardar borrador
          </Button>
          <Button
            onClick={() => {
              setSubmitType("submit")
              handleSave("submitted")
            }}
            loading={loading && submitType === "submit"}
            disabled={loading}
            type="button"
          >
            Enviar para verificación
          </Button>
        </div>
      </div>
    </div>
  )
}
