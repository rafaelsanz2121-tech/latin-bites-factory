import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import {
  Plus, Building2, ShieldCheck, AlertTriangle,
  CheckCircle2, XCircle, Clock, Calendar,
} from "lucide-react"

const COMPANY_TYPE: Record<string, string> = {
  processor:    "Procesador",
  packer:       "Empacador",
  distributor:  "Distribuidor",
  broker:       "Broker",
  farm:         "Granja",
  transporter:  "Transportista",
  other:        "Otro",
}

const RISK_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  low:    { label: "Bajo",   color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",   dot: "bg-green-500" },
  medium: { label: "Medio",  color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",   dot: "bg-amber-500" },
  high:   { label: "Alto",   color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",           dot: "bg-red-500"   },
}

const VERIF_RESULT: Record<string, { label: string; color: string }> = {
  approved:    { label: "Aprobado",     color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  conditional: { label: "Condicional",  color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  rejected:    { label: "Rechazado",    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
}

export default async function ProveedoresPage() {
  const supabase = await createClient()

  let suppliers: any[]       = []
  let verifications: any[]   = []
  let tableExists            = true

  try {
    const { data: sData, error } = await supabase
      .from("suppliers")
      .select("*")
      .eq("is_active", true)
      .order("name")
    if (error?.code === "42P01") { tableExists = false } else { suppliers = sData || [] }

    if (tableExists && suppliers.length > 0) {
      const ids = suppliers.map((s) => s.id)
      const { data: vData } = await supabase
        .from("supplier_verifications")
        .select("*")
        .in("supplier_id", ids)
        .order("verification_date", { ascending: false })
      verifications = vData || []
    }
  } catch { tableExists = false }

  // Latest verification per supplier
  const latestVerif: Record<string, any> = {}
  for (const v of verifications) {
    if (!latestVerif[v.supplier_id]) latestVerif[v.supplier_id] = v
  }

  const today = new Date()
  const in90  = new Date(); in90.setDate(today.getDate() + 90)
  const in30  = new Date(); in30.setDate(today.getDate() + 30)
  const todayStr = today.toISOString().split("T")[0]
  const in90Str  = in90.toISOString().split("T")[0]

  const totalApproved  = suppliers.filter((s) => s.is_approved).length
  const highRisk       = suppliers.filter((s) => s.risk_level === "high").length
  const pendingReview  = suppliers.filter((s) => {
    if (!s.is_approved) return true
    if (!s.approval_expiry) return false
    return s.approval_expiry <= in30.toISOString().split("T")[0]
  }).length

  const upcomingExpiry = suppliers
    .filter((s) => s.approval_expiry && s.approval_expiry >= todayStr && s.approval_expiry <= in90Str)
    .sort((a, b) => a.approval_expiry.localeCompare(b.approval_expiry))

  const fmtDate = (d: string) =>
    new Date(d + "T12:00:00").toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" })

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-teal-600" />
            </span>
            Proveedores
          </h1>
          <p className="text-sm text-slate-400 mt-1">9 CFR 417.4 · Verificación y aprobación de proveedores</p>
        </div>
        <Link
          href="/proveedores/nuevo"
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Nuevo proveedor
        </Link>
      </div>

      {/* Migration notice */}
      {!tableExists && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
          <p className="text-sm font-bold text-blue-800 dark:text-blue-200">Migración requerida</p>
          <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
            Ejecuta{" "}
            <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">014_metal_supplier_dispatch.sql</code>{" "}
            en Supabase para activar este módulo.
          </p>
        </div>
      )}

      {tableExists && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total proveedores", value: suppliers.length, icon: Building2,    color: "text-teal-600",   bg: "bg-teal-50 dark:bg-teal-900/20"       },
              { label: "Aprobados",         value: totalApproved,    icon: ShieldCheck,  color: "text-green-600",  bg: "bg-green-50 dark:bg-green-900/20"     },
              { label: "Riesgo alto",       value: highRisk,         icon: AlertTriangle,color: highRisk > 0 ? "text-red-600" : "text-slate-400", bg: highRisk > 0 ? "bg-red-50 dark:bg-red-900/20" : "bg-slate-50 dark:bg-slate-800/50" },
              { label: "Pendientes revisión",value: pendingReview,   icon: Clock,        color: pendingReview > 0 ? "text-amber-600" : "text-slate-400", bg: pendingReview > 0 ? "bg-amber-50 dark:bg-amber-900/20" : "bg-slate-50 dark:bg-slate-800/50" },
            ].map((k) => (
              <div key={k.label} className={`rounded-xl p-4 ${k.bg}`}>
                <k.icon className={`w-4 h-4 ${k.color} mb-2`} />
                <p className={`text-2xl font-black ${k.color} tabular-nums`}>{k.value}</p>
                <p className="text-[10.5px] font-medium text-slate-500 dark:text-slate-400 mt-1">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Supplier cards */}
          {suppliers.length === 0 ? (
            <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center py-16 gap-3">
              <Building2 className="w-8 h-8 text-slate-200 dark:text-slate-700" />
              <p className="text-sm text-slate-400">Sin proveedores registrados.</p>
              <Link href="/proveedores/nuevo" className="text-sm text-teal-600 font-semibold hover:underline">
                + Agregar primer proveedor
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {suppliers.map((s) => {
                const risk    = RISK_CONFIG[s.risk_level] ?? RISK_CONFIG.medium
                const latest  = latestVerif[s.id]
                const vr      = latest ? (VERIF_RESULT[latest.result] ?? null) : null
                const isExpiringSoon = s.approval_expiry && s.approval_expiry <= in30.toISOString().split("T")[0]

                return (
                  <div
                    key={s.id}
                    className={`bg-white dark:bg-[#111827] rounded-xl border shadow-sm p-5 space-y-3 transition-all hover:shadow-md ${
                      isExpiringSoon
                        ? "border-amber-200 dark:border-amber-700"
                        : "border-slate-100 dark:border-slate-700"
                    }`}
                  >
                    {/* Name + badges */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-100 text-[15px]">{s.name}</p>
                        {s.est_number && (
                          <p className="text-xs text-slate-400 mt-0.5">EST {s.est_number}</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 items-end flex-shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${risk.color}`}>
                          Riesgo {risk.label}
                        </span>
                        {s.is_approved ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Aprobado
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400 flex items-center gap-1">
                            <XCircle className="w-2.5 h-2.5" /> No aprobado
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Meta row */}
                    <div className="flex flex-wrap gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full font-medium">
                        {COMPANY_TYPE[s.company_type] ?? s.company_type}
                      </span>
                      {s.contact_name && <span>{s.contact_name}</span>}
                      {s.phone && <span>{s.phone}</span>}
                    </div>

                    {/* Products */}
                    {s.products_supplied && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {s.products_supplied}
                      </p>
                    )}

                    {/* Approval expiry warning */}
                    {isExpiringSoon && (
                      <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1.5 rounded-lg">
                        <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                        Aprobación vence: {fmtDate(s.approval_expiry)}
                      </div>
                    )}

                    {/* Latest verification */}
                    {latest && (
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-50 dark:border-slate-700/50">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span className="text-[11px] text-slate-400">
                          Última verif.: {fmtDate(latest.verification_date)}
                        </span>
                        {vr && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${vr.color}`}>
                            {vr.label}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Upcoming expiry table */}
          {upcomingExpiry.length > 0 && (
            <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  Aprobaciones por vencer — próximos 90 días
                </span>
              </div>
              <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {upcomingExpiry.map((s) => {
                  const daysLeft = Math.ceil(
                    (new Date(s.approval_expiry + "T12:00:00").getTime() - Date.now()) / 86_400_000
                  )
                  return (
                    <div key={s.id} className="px-5 py-3 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{s.name}</p>
                        <p className="text-xs text-slate-400">{COMPANY_TYPE[s.company_type]}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-amber-600">{fmtDate(s.approval_expiry)}</p>
                        <p className="text-xs text-slate-400">{daysLeft}d restantes</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
