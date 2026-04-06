import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import {
  GraduationCap, Plus, AlertTriangle, CheckCircle2,
  Clock, XCircle, Info, ArrowUpRight, Shield,
} from "lucide-react"

function fmtDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("es-US", {
    day: "2-digit", month: "short", year: "numeric",
  })
}

function daysUntil(d: string) {
  return Math.ceil((new Date(d + "T12:00:00").getTime() - Date.now()) / 86_400_000)
}

/* Trainings required per role — 9 CFR 417.7 */
const REQUIRED_BY_ROLE: Record<string, string[]> = {
  admin:      ["HACCP Básico", "HACCP Avanzado", "SSOP", "Listeria / RTE"],
  supervisor: ["HACCP Básico", "HACCP Avanzado", "SSOP", "Listeria / RTE"],
  qa:         ["HACCP Básico", "HACCP Avanzado", "SSOP", "Listeria / RTE"],
  operator:   ["HACCP Básico", "SSOP", "GMP Operaciones"],
}

const TRAINING_TYPES = [
  "HACCP Básico",
  "HACCP Avanzado",
  "SSOP",
  "Listeria / RTE",
  "GMP Operaciones",
  "Manejo de CCP",
  "Calibración de Equipos",
  "Alérgenos",
  "Inocuidad Alimentaria",
  "Food Defense",
  "Primeros Auxilios",
  "Otro",
]

const STATUS_STYLE = {
  valid:        { label: "Vigente",          icon: CheckCircle2, color: "text-green-700", bg: "bg-green-100 dark:bg-green-900/40"  },
  expiring_soon:{ label: "Vence pronto",     icon: Clock,        color: "text-amber-700", bg: "bg-amber-100 dark:bg-amber-900/40"  },
  expired:      { label: "Vencido",          icon: AlertTriangle,color: "text-red-700",   bg: "bg-red-100 dark:bg-red-900/40"      },
  no_expiry:    { label: "Sin vencimiento",  icon: Shield,       color: "text-blue-700",  bg: "bg-blue-100 dark:bg-blue-900/40"    },
  missing:      { label: "Sin entrenamiento",icon: XCircle,      color: "text-slate-500", bg: "bg-slate-100 dark:bg-slate-700/40"  },
}

const ROLE_ES: Record<string, string> = {
  admin: "Administrador", supervisor: "Supervisor", qa: "QA / Calidad", operator: "Operador",
}

export default async function CapacitacionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  /* Fetch active employees */
  const { data: employees } = await supabase
    .from("profiles")
    .select("id, full_name, role, employee_id")
    .eq("is_active", true)
    .order("full_name")

  /* Fetch all training records */
  let records: any[] = []
  let tableExists = true
  try {
    const { data, error } = await supabase
      .from("training_records")
      .select("*, profiles!employee_id(full_name, role)")
      .order("training_date", { ascending: false })
    if (error) tableExists = false
    else records = data || []
  } catch { tableExists = false }

  /* Build matrix: employee × training_type → latest record */
  const matrix: Record<string, Record<string, any>> = {}
  ;(employees || []).forEach((e) => { matrix[e.id] = {} })
  records.forEach((r) => {
    if (!matrix[r.employee_id]) matrix[r.employee_id] = {}
    // Keep only the most recent per type
    const existing = matrix[r.employee_id][r.training_type]
    if (!existing || new Date(r.training_date) > new Date(existing.training_date)) {
      matrix[r.employee_id][r.training_type] = r
    }
  })

  /* Compute status for a record */
  function getStatus(record: any): keyof typeof STATUS_STYLE {
    if (!record) return "missing"
    if (!record.expiry_date) return "no_expiry"
    const days = daysUntil(record.expiry_date)
    if (days < 0) return "expired"
    if (days <= 30) return "expiring_soon"
    return "valid"
  }

  /* KPIs */
  const allStatuses = (employees || []).flatMap((e) => {
    const required = REQUIRED_BY_ROLE[e.role] ?? REQUIRED_BY_ROLE.operator
    return required.map((t) => getStatus(matrix[e.id]?.[t]))
  })
  const missingCount  = allStatuses.filter((s) => s === "missing").length
  const expiredCount  = allStatuses.filter((s) => s === "expired").length
  const expiringCount = allStatuses.filter((s) => s === "expiring_soon").length
  const compliantCount = (employees || []).filter((e) => {
    const required = REQUIRED_BY_ROLE[e.role] ?? REQUIRED_BY_ROLE.operator
    return required.every((t) => {
      const s = getStatus(matrix[e.id]?.[t])
      return s === "valid" || s === "no_expiry"
    })
  }).length

  return (
    <div className="space-y-6 max-w-[1100px]">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-indigo-600" />
            </span>
            Capacitación de Personal
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            Registros de entrenamiento HACCP · 9 CFR 417.7
          </p>
        </div>
        <Link
          href="/capacitacion/nuevo"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Registrar Capacitación
        </Link>
      </div>

      {!tableExists && (
        <div className="bg-white dark:bg-[#111827] border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-slate-900 dark:text-slate-100">
            Ejecuta <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded font-mono">013_listeria_training.sql</code> para habilitar este módulo.
          </p>
        </div>
      )}

      {/* Regulatory note */}
      <div className="bg-white dark:bg-[#111827] border border-indigo-200 dark:border-indigo-800/40 rounded-xl px-5 py-3 flex items-start gap-3">
        <Shield className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
        <p className="text-[12.5px] text-indigo-800 dark:text-indigo-200 font-medium">
          <strong>9 CFR 417.7</strong> — Solo personas que hayan completado un curso de HACCP certificado pueden
          desarrollar el plan HACCP o ser responsables del monitoreo de CCPs. Los registros deben estar disponibles
          para inspección del FSIS en cualquier momento.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Empleados al día",       value: compliantCount,                       icon: CheckCircle2, bg: "bg-white dark:bg-[#111827]",   text: "text-slate-900 dark:text-slate-100"  },
          { label: "Entrenamientos vencidos", value: expiredCount,                         icon: AlertTriangle, bg: expiredCount > 0 ? "bg-white dark:bg-[#111827]" : "bg-slate-50 dark:bg-slate-700/40",     text: expiredCount > 0 ? "text-slate-900 dark:text-slate-100" : "text-slate-500"        },
          { label: "Vencen en 30 días",       value: expiringCount,                        icon: Clock,        bg: expiringCount > 0 ? "bg-white dark:bg-[#111827]" : "bg-slate-50 dark:bg-slate-700/40", text: expiringCount > 0 ? "text-slate-900 dark:text-slate-100" : "text-slate-500"    },
          { label: "Sin entrenamiento req.",  value: missingCount,                         icon: XCircle,      bg: missingCount > 0 ? "bg-white dark:bg-[#111827]" : "bg-slate-50 dark:bg-slate-700/40", text: missingCount > 0 ? "text-slate-900 dark:text-slate-100" : "text-slate-500"  },
        ].map((k) => (
          <div key={k.label} className={`rounded-xl border border-transparent p-4 ${k.bg}`}>
            <k.icon className={`w-4 h-4 ${k.text} mb-2`} />
            <p className={`text-3xl font-black tabular-nums ${k.text}`}>{k.value}</p>
            <p className="text-[10.5px] font-medium text-slate-600 dark:text-slate-300 mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Employee compliance matrix */}
      <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">Estado por Empleado</h2>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
            Entrenamientos requeridos según 9 CFR 417.7 por rol
          </p>
        </div>

        {(employees || []).length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-300 text-center py-8">Sin empleados activos</p>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
            {(employees || []).map((emp) => {
              const required = REQUIRED_BY_ROLE[emp.role] ?? REQUIRED_BY_ROLE.operator
              const empRecords = records.filter((r) => r.employee_id === emp.id)
              const latestPerType = matrix[emp.id] ?? {}
              const allGood = required.every((t) => {
                const s = getStatus(latestPerType[t])
                return s === "valid" || s === "no_expiry"
              })

              return (
                <div key={emp.id} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
                        {emp.full_name?.slice(0, 2).toUpperCase() ?? "??"}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{emp.full_name}</p>
                        <p className="text-[10.5px] text-slate-600 dark:text-slate-300">
                          {ROLE_ES[emp.role] ?? emp.role}
                          {emp.employee_id && ` · ID: ${emp.employee_id}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {allGood
                        ? <span className="flex items-center gap-1 text-[10.5px] font-bold text-green-700 bg-green-100 dark:bg-green-900/40 px-2.5 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3" /> Al día</span>
                        : <span className="flex items-center gap-1 text-[10.5px] font-bold text-red-700 bg-red-100 dark:bg-red-900/40 px-2.5 py-0.5 rounded-full"><AlertTriangle className="w-3 h-3" /> Requiere atención</span>
                      }
                      <Link
                        href={`/capacitacion/nuevo?emp=${emp.id}`}
                        className="flex items-center gap-1 text-[10.5px] font-semibold text-indigo-500 hover:text-indigo-700 transition-colors"
                      >
                        <Plus className="w-3 h-3" /> Agregar
                      </Link>
                    </div>
                  </div>

                  {/* Required trainings */}
                  <div className="flex flex-wrap gap-2">
                    {required.map((trainingType) => {
                      const rec  = latestPerType[trainingType]
                      const stat = getStatus(rec)
                      const s    = STATUS_STYLE[stat]
                      const days = rec?.expiry_date ? daysUntil(rec.expiry_date) : null

                      return (
                        <div
                          key={trainingType}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-semibold ${s.bg} border-transparent`}
                        >
                          <s.icon className={`w-3 h-3 ${s.color}`} />
                          <span className={s.color}>{trainingType}</span>
                          {rec && stat === "valid" && days !== null && (
                            <span className="text-[9.5px] text-slate-600 dark:text-slate-300 ml-0.5">vence en {days}d</span>
                          )}
                          {stat === "expired" && (
                            <span className="text-[9.5px] text-red-500 ml-0.5">VENCIDO</span>
                          )}
                          {stat === "expiring_soon" && days !== null && (
                            <span className="text-[9.5px] text-amber-600 ml-0.5">en {days}d</span>
                          )}
                        </div>
                      )
                    })}

                    {/* Additional trainings beyond required */}
                    {empRecords
                      .filter((r) => !required.includes(r.training_type))
                      .filter((r, i, arr) => arr.findIndex((x) => x.training_type === r.training_type) === i)
                      .map((r) => {
                        const stat = getStatus(r)
                        const s = STATUS_STYLE[stat]
                        return (
                          <div key={r.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-700/40 border border-transparent text-[11px] text-slate-600 dark:text-slate-300">
                            <s.icon className="w-3 h-3 text-slate-300" />
                            {r.training_type}
                          </div>
                        )
                      })
                    }
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Recent training log */}
      {records.length > 0 && (
        <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">Registro de Capacitaciones</h2>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">{records.length} registros · Retención: 2 años</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-50 dark:border-slate-700 text-[10.5px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Empleado</th>
                  <th className="text-left px-4 py-3">Capacitación</th>
                  <th className="text-left px-4 py-3">Fecha</th>
                  <th className="text-left px-4 py-3">Instructor</th>
                  <th className="text-left px-4 py-3">Vencimiento</th>
                  <th className="text-left px-4 py-3">Resultado</th>
                  <th className="text-left px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {records.slice(0, 20).map((r) => {
                  const stat = getStatus(r)
                  const s    = STATUS_STYLE[stat]
                  return (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3 text-[12.5px] font-semibold text-slate-700 dark:text-slate-200">
                        {r.profiles?.full_name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-slate-600 dark:text-slate-300">{r.training_type}</td>
                      <td className="px-4 py-3 text-[12px] text-slate-500 whitespace-nowrap">{fmtDate(r.training_date)}</td>
                      <td className="px-4 py-3 text-[12px] text-slate-500">{r.trainer_name ?? "—"}</td>
                      <td className="px-4 py-3 text-[12px] text-slate-500 whitespace-nowrap">
                        {r.expiry_date ? fmtDate(r.expiry_date) : "Sin vencimiento"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${
                          r.result === "passed"  ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" :
                          r.result === "failed"  ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" :
                                                   "bg-amber-100 text-amber-700"
                        }`}>
                          {r.result === "passed" ? "Aprobado" : r.result === "failed" ? "Reprobado" : "Pendiente"}
                        </span>
                        {r.score != null && (
                          <span className="ml-1.5 text-[10.5px] text-slate-600 dark:text-slate-300">{r.score}%</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-[10.5px] font-semibold ${s.color}`}>
                          <s.icon className="w-3 h-3" />
                          {s.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
