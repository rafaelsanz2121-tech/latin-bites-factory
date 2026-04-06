import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import {
  Plus, AlertTriangle, CheckCircle2, XCircle,
  ClipboardCheck, Calendar, Clock, ShieldCheck,
} from "lucide-react"

const AUDIT_TYPE: Record<string, string> = {
  haccp_plan_review:  "Revisión Plan HACCP",
  ccp_monitoring:     "Monitoreo CCPs",
  record_review:      "Revisión de Registros",
  validation:         "Validación",
  pre_inspection:     "Pre-inspección USDA",
  full_system:        "Sistema completo",
}

const RESULT_CONFIG = {
  satisfactory:  { label: "Satisfactorio", bg: "bg-green-100 dark:bg-green-900/30",  text: "text-slate-900 dark:text-slate-100"  },
  conditional:   { label: "Condicional",   bg: "bg-amber-100 dark:bg-amber-900/30",  text: "text-slate-900 dark:text-slate-100"  },
  unsatisfactory:{ label: "No Satisfactorio", bg: "bg-red-100 dark:bg-red-900/30",   text: "text-slate-900 dark:text-slate-100"      },
}

export default async function AuditoriaInternaPage() {
  const supabase = await createClient()
  let audits: any[] = []
  let tableExists = true

  try {
    const since365 = new Date()
    since365.setDate(since365.getDate() - 365)
    const { data, error } = await supabase
      .from("internal_audits")
      .select("*")
      .gte("audit_date", since365.toISOString().split("T")[0])
      .order("audit_date", { ascending: false })
      .limit(100)
    if (error?.code === "42P01") { tableExists = false } else { audits = data || [] }
  } catch { tableExists = false }

  const total         = audits.length
  const unsatisfactory = audits.filter((a) => a.overall_result === "unsatisfactory").length
  const conditional   = audits.filter((a) => a.overall_result === "conditional").length
  const overdueFollowUp = audits.filter((a) =>
    a.corrective_actions_required &&
    !a.follow_up_completed &&
    a.corrective_action_deadline &&
    new Date(a.corrective_action_deadline) < new Date()
  ).length

  // 9 CFR 417.8 requires at least annual review
  const lastAudit = audits[0]
  const daysSinceLast = lastAudit
    ? Math.floor((Date.now() - new Date(lastAudit.audit_date + "T12:00:00").getTime()) / 86_400_000)
    : null

  const criticalOpen = audits.filter((a) => a.critical_findings && !a.follow_up_completed)

  const fmtDate = (d: string) =>
    new Date(d + "T12:00:00").toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" })

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
              <ClipboardCheck className="w-4 h-4 text-indigo-600" />
            </span>
            Auditoría Interna HACCP
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">9 CFR 417.8 · Verificación y auditoría del sistema HACCP</p>
        </div>
        <Link
          href="/auditoria-interna/nuevo"
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Nueva auditoría
        </Link>
      </div>

      {/* Annual requirement alert */}
      {tableExists && (daysSinceLast === null || daysSinceLast > 300) && (
        <div className={`rounded-xl px-5 py-4 border flex items-start gap-3 ${
          daysSinceLast === null || daysSinceLast > 365
            ? "bg-white dark:bg-[#111827] border-red-300 dark:border-red-700"
            : "bg-white dark:bg-[#111827] border-amber-200 dark:border-amber-700"
        }`}>
          <Clock className={`w-5 h-5 flex-shrink-0 mt-0.5 ${daysSinceLast === null || daysSinceLast > 365 ? "text-red-500" : "text-amber-500"}`} />
          <div>
            <p className={`text-sm font-black ${daysSinceLast === null || daysSinceLast > 365 ? "text-red-800 dark:text-red-200" : "text-amber-800 dark:text-amber-200"}`}>
              {daysSinceLast === null
                ? "⚠ Sin auditorías registradas — 9 CFR 417.8 requiere revisión anual del plan HACCP"
                : `⚠ Última auditoría hace ${daysSinceLast} días — Se acerca el vencimiento anual`}
            </p>
            <p className={`text-xs mt-0.5 ${daysSinceLast === null || daysSinceLast > 365 ? "text-slate-900 dark:text-slate-100" : "text-slate-900 dark:text-slate-100"}`}>
              El sistema HACCP debe ser auditado al menos una vez al año o cuando ocurran cambios significativos en el proceso.
            </p>
          </div>
        </div>
      )}

      {/* Critical open findings alert */}
      {tableExists && criticalOpen.length > 0 && (
        <div className="bg-white dark:bg-[#111827] border border-red-200 dark:border-red-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-sm font-bold text-red-800 dark:text-red-200">
              {criticalOpen.length} auditoría{criticalOpen.length > 1 ? "s" : ""} con hallazgos críticos sin cerrar
            </p>
          </div>
          {criticalOpen.map((a) => (
            <div key={a.id} className="bg-white dark:bg-red-900/10 rounded-lg px-4 py-2 text-xs">
              <span className="font-bold text-slate-900 dark:text-slate-100">{fmtDate(a.audit_date)}</span>
              <span className="text-slate-600 dark:text-slate-300 ml-2">{AUDIT_TYPE[a.audit_type] ?? a.audit_type}</span>
              <p className="text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">{a.critical_findings}</p>
            </div>
          ))}
        </div>
      )}

      {/* Migration notice */}
      {!tableExists && (
        <div className="bg-white dark:bg-[#111827] border border-blue-200 dark:border-blue-800 rounded-xl p-5">
          <p className="text-sm font-bold text-blue-800 dark:text-blue-200">Migración requerida</p>
          <p className="text-sm text-slate-900 dark:text-slate-100 mt-1">
            Ejecuta <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">016_water_audit_health.sql</code> en Supabase para activar este módulo.
          </p>
        </div>
      )}

      {tableExists && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Auditorías (12m)",     value: total,          icon: ClipboardCheck, color: "text-indigo-600",  bg: "bg-white dark:bg-[#111827]" },
              { label: "No satisfactorias",    value: unsatisfactory, icon: XCircle,        color: unsatisfactory > 0 ? "text-red-600" : "text-slate-600 dark:text-slate-300",   bg: unsatisfactory > 0 ? "bg-white dark:bg-[#111827]" : "bg-slate-100 dark:bg-slate-800" },
              { label: "Condicionales",        value: conditional,    icon: AlertTriangle,  color: conditional > 0 ? "text-amber-600" : "text-slate-600 dark:text-slate-300",    bg: conditional > 0 ? "bg-white dark:bg-[#111827]" : "bg-slate-100 dark:bg-slate-800" },
              { label: "Seguimientos vencidos",value: overdueFollowUp,icon: Clock,          color: overdueFollowUp > 0 ? "text-red-600" : "text-slate-600 dark:text-slate-300",  bg: overdueFollowUp > 0 ? "bg-white dark:bg-[#111827]" : "bg-slate-100 dark:bg-slate-800" },
            ].map((k) => (
              <div key={k.label} className={`rounded-xl p-4 ${k.bg}`}>
                <k.icon className={`w-4 h-4 ${k.color} mb-2`} />
                <p className={`text-2xl font-black ${k.color} tabular-nums`}>{k.value}</p>
                <p className="text-[10.5px] font-medium text-slate-600 dark:text-slate-300 mt-1">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Regulatory requirements panel */}
          <div className="bg-white dark:bg-[#111827] border border-indigo-200 dark:border-indigo-800 rounded-xl px-5 py-4">
            <p className="text-xs font-bold text-indigo-800 dark:text-indigo-200 mb-2">Requisitos 9 CFR 417.8 — Verificación del Sistema HACCP</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                { req: "Revisión anual del Plan HACCP",        freq: "≥ 1 vez/año" },
                { req: "Auditoría de monitoreo de CCPs",       freq: "Semanal/mensual" },
                { req: "Revisión de registros de verificación",freq: "Continua" },
                { req: "Validación cuando hay cambios",        freq: "Ad-hoc" },
                { req: "Pre-inspección USDA",                  freq: "Antes de inspecciones" },
                { req: "Acciones correctivas documentadas",    freq: "Según hallazgos" },
              ].map((r) => (
                <div key={r.req} className="flex items-center justify-between bg-white dark:bg-indigo-900/10 rounded-lg px-3 py-2 gap-2">
                  <p className="font-semibold text-indigo-800 dark:text-indigo-200">{r.req}</p>
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">{r.freq}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Auditorías — últimos 12 meses</span>
              <span className="text-xs text-slate-600 dark:text-slate-300">{total} registros</span>
            </div>
            {audits.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <ClipboardCheck className="w-8 h-8 text-slate-200 dark:text-slate-700" />
                <p className="text-sm text-slate-600 dark:text-slate-300">Sin auditorías registradas.</p>
                <p className="text-xs text-slate-400 max-w-xs text-center">9 CFR 417.8 requiere al menos una revisión anual del Plan HACCP.</p>
                <Link href="/auditoria-interna/nuevo" className="text-sm text-indigo-600 font-semibold hover:underline">+ Primera auditoría</Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 dark:bg-slate-800">
                    <tr>
                      {["Fecha","Tipo","Auditor","Items ✓","Items ✗","Hallazgos críticos","Seguimiento","Resultado"].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                    {audits.map((a) => {
                      const rc = RESULT_CONFIG[a.overall_result as keyof typeof RESULT_CONFIG]
                      const followUpOverdue = a.corrective_actions_required && !a.follow_up_completed &&
                        a.corrective_action_deadline && new Date(a.corrective_action_deadline) < new Date()
                      return (
                        <tr key={a.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${a.overall_result === "unsatisfactory" ? "bg-red-50/20 dark:bg-red-900/5" : ""}`}>
                          <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">{fmtDate(a.audit_date)}</td>
                          <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">{AUDIT_TYPE[a.audit_type] ?? a.audit_type}</td>
                          <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">{a.auditor_name}</td>
                          <td className="px-4 py-3 text-xs text-green-600 font-bold tabular-nums">{a.items_passed}</td>
                          <td className="px-4 py-3 text-xs font-bold tabular-nums">{a.items_failed > 0 ? <span className="text-red-600">{a.items_failed}</span> : <span className="text-slate-600 dark:text-slate-300">0</span>}</td>
                          <td className="px-4 py-3 max-w-[200px]">
                            {a.critical_findings
                              ? <span className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 font-medium">{a.critical_findings}</span>
                              : <span className="text-xs text-slate-600 dark:text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {a.corrective_actions_required
                              ? a.follow_up_completed
                                ? <span className="text-green-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Cerrado</span>
                                : followUpOverdue
                                ? <span className="text-red-600 font-bold flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Vencido</span>
                                : <span className="text-amber-600 font-bold">Pendiente</span>
                              : <span className="text-slate-600 dark:text-slate-300">N/A</span>}
                          </td>
                          <td className="px-4 py-3">
                            {rc && (
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${rc.bg} ${rc.text}`}>
                                {rc.label}
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
