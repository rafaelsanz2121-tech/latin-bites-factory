import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, AlertTriangle, CheckCircle2, Clock, Flame, Snowflake, Thermometer, XCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LogStatusBadge } from "@/components/logs/LogStatusBadge"
import { SignatureBlock } from "@/components/logs/SignatureBlock"
import { GenericActionButtons } from "@/components/forms/GenericActionButtons"
import { formatDate, formatTime } from "@/lib/utils"
import { CCP_LABELS } from "@/constants/products"
import { PrintButton } from "@/components/ui/PrintButton"

interface Props { params: Promise<{ id: string }> }

function minutesBetween(from: string | null, to: string | null): number | null {
  if (!from || !to) return null
  const [fh, fm] = from.slice(0, 5).split(":").map(Number)
  const [th, tm] = to.slice(0, 5).split(":").map(Number)
  const diff = (th * 60 + tm) - (fh * 60 + fm)
  return diff >= 0 ? diff : null
}

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins} min`
  return `${Math.floor(mins / 60)}h ${mins % 60}min`
}

function PhaseRow({ label, value, alert, success }: { label: string; value: string; alert?: boolean; success?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[var(--border)] last:border-0">
      <span className="text-sm text-[var(--muted-foreground)]">{label}</span>
      <span className={`text-sm font-semibold flex items-center gap-1.5 ${alert ? "text-red-600" : success ? "text-green-600" : ""}`}>
        {alert && <AlertTriangle className="w-3.5 h-3.5" />}
        {success && <CheckCircle2 className="w-3.5 h-3.5" />}
        {value}
      </span>
    </div>
  )
}

export default async function CookingDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [{ data: profile }, { data: log }] = await Promise.all([
    supabase.from("profiles").select("id, role").eq("id", user.id).single(),
    supabase.from("cooking_chilling_logs").select(`
      *, products(name),
      creator:profiles!cooking_chilling_logs_created_by_fkey(id, full_name, initials),
      verifier:profiles!cooking_chilling_logs_verified_by_fkey(id, full_name, initials),
      approver:profiles!cooking_chilling_logs_approved_by_fkey(id, full_name, initials)
    `).eq("id", id).single(),
  ])

  if (!profile || !log) notFound()

  const isCooking  = log.log_type === "cooking"
  const isChilling = log.log_type === "chilling"

  const ovenDuration   = minutesBetween(log.oven_in_time, log.oven_out_time)
  const phase1Duration = minutesBetween(log.chilling_start_time, log.phase_one_end_time)
  const phase2Duration = minutesBetween(log.phase_one_end_time, log.phase_two_end_time)

  const ovenOutOk  = log.oven_out_temp_f  ? log.oven_out_temp_f  >= 160 : null
  const phase1TempOk = log.phase_one_end_temp_f ? log.phase_one_end_temp_f <= 80  : null
  const phase2TempOk = log.phase_two_end_temp_f ? log.phase_two_end_temp_f <= 40  : null
  const phase1TimeOk = phase1Duration !== null ? phase1Duration <= 90  : null
  const phase2TimeOk = phase2Duration !== null ? phase2Duration <= 300 : null

  return (
    <div className="max-w-3xl mx-auto space-y-4">

      {/* Header */}
      <div>
        <Link href="/cooking" className="flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-3">
          <ArrowLeft className="w-3.5 h-3.5" />Cooking / Chilling Logs
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              {isCooking ? "🔥 Cooking Log" : "❄️ Chilling Log"}
            </h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
              {log.products?.name}
              {log.lot_batch_number && <span className="mx-1.5 text-[var(--muted-foreground)]/60">·</span>}
              {log.lot_batch_number && <span className="font-mono">{log.lot_batch_number}</span>}
              <span className="mx-1.5 text-[var(--muted-foreground)]/60">·</span>
              {formatDate(log.date)}
              <span className="mx-1.5 text-[var(--muted-foreground)]/60">·</span>
              {CCP_LABELS[log.ccp_number] || log.ccp_number}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <PrintButton module="cooking" id={id} />
            <LogStatusBadge status={log.status} />
          </div>
        </div>
      </div>

      <GenericActionButtons
        log={{ id: log.id, status: log.status, created_by: log.created_by }}
        tableName="cooking_chilling_logs"
        currentUserId={user.id}
        currentUserRole={profile.role}
      />

      {/* ── Timeline visual de fases ───────────────────────────────── */}
      {(isCooking && (log.oven_in_time || log.oven_out_time)) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)] flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              Fase 1 — Horno
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0 px-6 pb-4">

            {/* Timeline visual */}
            <div className="relative mb-4">
              <div className="flex items-center gap-0">

                {/* Nodo: Entrada */}
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-orange-100 border-2 border-orange-400 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-orange-600" />
                  </div>
                  <p className="text-xs font-semibold text-orange-700 mt-1">Entrada</p>
                  <p className="text-sm font-bold">{log.oven_in_time ? formatTime(log.oven_in_time) : "—"}</p>
                  {log.oven_in_temp_f && (
                    <p className="text-xs text-[var(--muted-foreground)]">{log.oven_in_temp_f}°F int.</p>
                  )}
                  {log.oven_setpoint_f && (
                    <p className="text-xs text-orange-600">Horno: {log.oven_setpoint_f}°F</p>
                  )}
                </div>

                {/* Línea con duración */}
                <div className="flex-1 flex flex-col items-center mx-2">
                  <div className="w-full h-0.5 bg-orange-300 relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="bg-white px-2 text-xs font-medium text-orange-700 border border-orange-200 rounded-full">
                        {ovenDuration !== null ? formatMinutes(ovenDuration) : "—"}
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-orange-400 mt-2">en horno</p>
                </div>

                {/* Nodo: Salida */}
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${
                    ovenOutOk === true  ? "bg-green-100 border-green-500" :
                    ovenOutOk === false ? "bg-red-100 border-red-500" :
                    "bg-orange-100 border-orange-400"
                  }`}>
                    {ovenOutOk === true  ? <CheckCircle2 className="w-4 h-4 text-green-600" /> :
                     ovenOutOk === false ? <XCircle className="w-4 h-4 text-red-600" /> :
                     <Thermometer className="w-4 h-4 text-orange-600" />}
                  </div>
                  <p className="text-xs font-semibold text-orange-700 mt-1">Salida</p>
                  <p className="text-sm font-bold">{log.oven_out_time ? formatTime(log.oven_out_time) : "—"}</p>
                  {log.oven_out_temp_f && (
                    <p className={`text-xs font-bold ${ovenOutOk === false ? "text-red-600" : "text-green-600"}`}>
                      {log.oven_out_temp_f}°F int.
                    </p>
                  )}
                </div>

              </div>
            </div>

            {/* Alerta CCP */}
            {ovenOutOk === false && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-300 rounded-lg p-3 text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <strong>Desviación CCP:</strong> temperatura de salida {log.oven_out_temp_f}°F no alcanzó el límite crítico (≥160°F)
              </div>
            )}
            {ovenOutOk === true && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                Temperatura de cocción dentro del límite CCP ✓
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Fase Cooler ─────────────────────────────────────────────── */}
      {isChilling && log.chilling_start_time && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)] flex items-center gap-2">
              <Snowflake className="w-4 h-4 text-sky-500" />
              Fase 2 — Cooler / Refrigeración
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-6 pb-5">

            {/* Timeline de 3 puntos: entrada → fase1 → fase2 */}
            <div className="flex items-start gap-0">

              {/* Nodo: Entrada cooler */}
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-sky-100 border-2 border-sky-400 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-sky-600" />
                </div>
                <p className="text-xs font-semibold text-sky-700 mt-1">Entrada cooler</p>
                <p className="text-sm font-bold">{formatTime(log.chilling_start_time)}</p>
                {log.chilling_start_temp_f && (
                  <p className="text-xs text-[var(--muted-foreground)]">{log.chilling_start_temp_f}°F</p>
                )}
              </div>

              {/* Línea fase 1 */}
              <div className="flex-1 flex flex-col items-center mx-1 mt-4">
                <div className={`w-full h-0.5 relative ${phase1TimeOk === false ? "bg-red-300" : "bg-sky-300"}`}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`bg-white px-2 text-[10px] font-medium border rounded-full ${
                      phase1TimeOk === false ? "text-red-700 border-red-200" :
                      phase1TimeOk === true  ? "text-sky-700 border-sky-200" :
                      "text-[var(--muted-foreground)] border-[var(--border)]"
                    }`}>
                      {phase1Duration !== null ? formatMinutes(phase1Duration) : "—"}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-sky-400 mt-2">Fase 1</p>
              </div>

              {/* Nodo: Fin fase 1 */}
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${
                  phase1TempOk === true  ? "bg-green-100 border-green-500" :
                  phase1TempOk === false ? "bg-red-100 border-red-500" :
                  "bg-sky-100 border-sky-400"
                }`}>
                  {phase1TempOk === true  ? <CheckCircle2 className="w-4 h-4 text-green-600" /> :
                   phase1TempOk === false ? <XCircle className="w-4 h-4 text-red-600" /> :
                   <Thermometer className="w-4 h-4 text-sky-600" />}
                </div>
                <p className="text-xs font-semibold text-sky-700 mt-1">80°F check</p>
                <p className="text-sm font-bold">{log.phase_one_end_time ? formatTime(log.phase_one_end_time) : "—"}</p>
                {log.phase_one_end_temp_f && (
                  <p className={`text-xs font-bold ${phase1TempOk === false ? "text-red-600" : "text-green-600"}`}>
                    {log.phase_one_end_temp_f}°F
                  </p>
                )}
              </div>

              {/* Línea fase 2 */}
              <div className="flex-1 flex flex-col items-center mx-1 mt-4">
                <div className={`w-full h-0.5 relative ${phase2TimeOk === false ? "bg-red-300" : "bg-indigo-300"}`}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`bg-white px-2 text-[10px] font-medium border rounded-full ${
                      phase2TimeOk === false ? "text-red-700 border-red-200" :
                      phase2TimeOk === true  ? "text-indigo-700 border-indigo-200" :
                      "text-[var(--muted-foreground)] border-[var(--border)]"
                    }`}>
                      {phase2Duration !== null ? formatMinutes(phase2Duration) : "—"}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-indigo-400 mt-2">Fase 2</p>
              </div>

              {/* Nodo: Fin fase 2 */}
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${
                  phase2TempOk === true  ? "bg-green-100 border-green-500" :
                  phase2TempOk === false ? "bg-red-100 border-red-500" :
                  "bg-indigo-100 border-indigo-400"
                }`}>
                  {phase2TempOk === true  ? <CheckCircle2 className="w-4 h-4 text-green-600" /> :
                   phase2TempOk === false ? <XCircle className="w-4 h-4 text-red-600" /> :
                   <Thermometer className="w-4 h-4 text-indigo-600" />}
                </div>
                <p className="text-xs font-semibold text-indigo-700 mt-1">40°F check</p>
                <p className="text-sm font-bold">{log.phase_two_end_time ? formatTime(log.phase_two_end_time) : "—"}</p>
                {log.phase_two_end_temp_f && (
                  <p className={`text-xs font-bold ${phase2TempOk === false ? "text-red-600" : "text-green-600"}`}>
                    {log.phase_two_end_temp_f}°F
                  </p>
                )}
              </div>

            </div>

            {/* Alertas de tiempo */}
            {(phase1TimeOk === false || phase2TimeOk === false) && (
              <div className="flex flex-col gap-2">
                {phase1TimeOk === false && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-300 rounded-lg p-3 text-sm text-red-700">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <strong>Desviación Fase 1:</strong> tardó {formatMinutes(phase1Duration!)} — límite es 90 min
                  </div>
                )}
                {phase2TimeOk === false && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-300 rounded-lg p-3 text-sm text-red-700">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <strong>Desviación Fase 2:</strong> tardó {formatMinutes(phase2Duration!)} — límite es 5 horas
                  </div>
                )}
              </div>
            )}
            {phase1TimeOk === true && phase2TimeOk === true && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                Enfriamiento completado dentro de los límites CCP ✓
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Lecturas de temperatura ─────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)] flex items-center gap-2">
            <Thermometer className="w-4 h-4" />
            Lecturas de Temperatura
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!(log.readings || []).length ? (
            <p className="text-center py-8 text-sm text-[var(--muted-foreground)]">Sin lecturas registradas</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
                  <th className="text-left px-4 py-2 w-10">#</th>
                  <th className="text-left px-4 py-2">Hora</th>
                  <th className="text-left px-4 py-2">Temp (°F)</th>
                  <th className="text-left px-4 py-2">Iniciales</th>
                  <th className="text-left px-4 py-2">Notas</th>
                </tr>
              </thead>
              <tbody>
                {(log.readings || []).map((r: any, i: number) => {
                  const outOfRange = isCooking && log.ccp_number === "CCP_1B" && r.temp_f < 160
                  return (
                    <tr key={i} className={`border-b border-[var(--border)] last:border-0 ${outOfRange ? "bg-red-50" : ""}`}>
                      <td className="px-4 py-2.5 text-sm text-[var(--muted-foreground)]">{i + 1}</td>
                      <td className="px-4 py-2.5 text-sm font-medium">{formatTime(r.time)}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-sm font-bold ${outOfRange ? "text-red-600" : ""}`}>
                          {outOfRange && <AlertTriangle className="inline w-3.5 h-3.5 mr-1" />}
                          {r.temp_f}°F
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-sm uppercase tracking-wider">{r.initials}</td>
                      <td className="px-4 py-2.5 text-sm text-[var(--muted-foreground)]">{r.notes || "—"}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Notas */}
      {log.notes && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              Notas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{log.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Firmas */}
      <Card>
        <CardContent className="p-6">
          <SignatureBlock
            status={log.status}
            creator={log.creator}
            submittedAt={log.submitted_at}
            verifier={log.verifier}
            verifiedAt={log.verified_at}
            approver={log.approver}
            approvedAt={log.approved_at}
            lockedAt={log.locked_at}
          />
        </CardContent>
      </Card>

    </div>
  )
}
