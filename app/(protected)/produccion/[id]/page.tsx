import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  CheckCircle2,
  Scale,
  FileText,
} from "lucide-react"
import { ProduccionLive } from "./ProduccionLive"
import { CloseSessionButton } from "./CloseSessionButton"

export default async function ProduccionSessionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // 1. Fetch session
  const { data: session } = await supabase
    .from("box_sessions")
    .select(
      `id, client_name, product_name, shift_date, status,
       target_boxes, target_weight_lbs, notes, created_at, completed_at,
       start_time, lot_reference, production_line, session_number,
       supervisor:profiles!started_by(full_name)`
    )
    .eq("id", id)
    .single()

  if (!session) notFound()

  // 2. Fetch box entries
  const { data: entriesRaw } = await supabase
    .from("box_entries")
    .select(
      "id, box_number, weight_lbs, logged_by, created_at, notes, lot_reference, temperature_f"
    )
    .eq("session_id", id)
    .order("box_number", { ascending: true })

  // 3. Fetch temp logs
  const { data: tempLogsRaw } = await supabase
    .from("produccion_temp_logs")
    .select("id, session_id, organization_id, box_number_at, temperature_f, location, logged_by, created_at, notes")
    .eq("session_id", id)
    .order("created_at", { ascending: false })

  // 4. Fetch AI rules
  const { data: rulesRaw } = await supabase
    .from("produccion_ai_rules")
    .select("id, organization_id, is_active, rule_type, value, unit, action, message")
    .eq("is_active", true)
    .order("id", { ascending: true })

  const entries = entriesRaw || []
  const tempLogs = tempLogsRaw || []
  const rules = rulesRaw || []

  const isActive = session.status === "active"

  // Derived display values
  const shiftDateFormatted = new Date(
    session.shift_date + "T12:00:00"
  ).toLocaleDateString("es-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="space-y-5 max-w-[960px]">
      {/* ── Back link ── */}
      <Link
        href="/produccion"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Producción
      </Link>

      {/* ── Session Header Card ── */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-800 text-white rounded-xl p-5 shadow-lg shadow-emerald-500/10">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            {/* Top row: client · product · status badge */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-xl font-black truncate">{session.client_name}</h1>
              <span className="opacity-60">·</span>
              <span className="text-lg font-semibold opacity-90 truncate">{session.product_name}</span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-white/10 text-white/70"
                }`}
              >
                {isActive ? "En Producción" : "Completada"}
              </span>
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-3 flex-wrap text-sm text-white/75">
              <span className="capitalize">{shiftDateFormatted}</span>
              {session.production_line && (
                <>
                  <span className="opacity-40">·</span>
                  <span>Línea {session.production_line}</span>
                </>
              )}
              {session.session_number && (
                <>
                  <span className="opacity-40">·</span>
                  <span>Sesión #{session.session_number}</span>
                </>
              )}
              {session.lot_reference && (
                <>
                  <span className="opacity-40">·</span>
                  <span>Lote: {session.lot_reference}</span>
                </>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            {/* Print report link */}
            <Link
              href={`/produccion/${id}/reporte`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold bg-white/15 hover:bg-white/25 text-white transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Reporte</span>
            </Link>

            {/* Close session — only when active */}
            {isActive && (
              <CloseSessionButton
                sessionId={id}
                boxCount={entries.length}
                rules={rules}
              />
            )}

            {/* Completed badge */}
            {!isActive && (
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold bg-white/10 text-white/70">
                <CheckCircle2 className="w-4 h-4" />
                Completada
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Live production interface ── */}
      <ProduccionLive
        session={session}
        entries={entries}
        tempLogs={tempLogs}
        rules={rules}
      />
    </div>
  )
}
