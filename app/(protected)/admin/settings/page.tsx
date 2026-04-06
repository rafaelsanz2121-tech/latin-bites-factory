import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { OrgSettingsForm } from "./OrgSettingsForm"
import { ProfileForm } from "./ProfileForm"
import {
  Settings, Users, Database, Shield,
  CheckCircle2, ClipboardList, AlertTriangle,
} from "lucide-react"

const ROLES = [
  {
    role:  "Operador",
    color: "bg-green-100 text-green-700",
    perms: ["Crear y enviar logs de producción", "Registrar desviaciones", "Ver sus propios registros"],
  },
  {
    role:  "Supervisor",
    color: "bg-amber-100 text-amber-700",
    perms: ["Verificar logs (no propios)", "Asignar CAPAs", "Exportar reportes", "Ver todos los registros"],
  },
  {
    role:  "QA / Calidad",
    color: "bg-blue-100 text-blue-700",
    perms: ["Aprobar logs (no propios)", "Cerrar desviaciones", "Verificar CAPAs", "Acceso a todos los módulos HACCP"],
  },
  {
    role:  "Administrador",
    color: "bg-red-100 text-red-700",
    perms: ["Acceso completo", "Gestionar usuarios y roles", "Configuración del sistema", "Reabrir registros cerrados"],
  },
]

export default async function AdminSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, initials, role, employee_id")
    .eq("id", user.id)
    .single()

  if (!profile) redirect("/login")

  /* System stats */
  const [
    { count: userCount },
    { count: activeOrderCount },
    { count: openDeviations },
    { count: openCAPAs },
    { count: logCount },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("production_orders").select("*", { count: "exact", head: true }).in("status", ["planned","in_production","cooking","chilling","packaging","refrigerating"]),
    supabase.from("deviations").select("*", { count: "exact", head: true }).in("status", ["open","under_review"]),
    supabase.from("corrective_actions").select("*", { count: "exact", head: true }).in("status", ["open","in_progress"]),
    supabase.from("receiving_logs").select("*", { count: "exact", head: true }),
  ])

  /* Org data (graceful if migration 011 not run) */
  let org: any = null
  try {
    const { data } = await supabase
      .from("organizations")
      .select("id, name, slug, est_number, phone, address, city, state, zip, logo_url, plan, subscription_status, trial_ends_at")
      .single()
    org = data
  } catch { /* migration not run */ }

  const isAdmin = profile.role === "admin"

  const profileWithEmail = {
    ...profile,
    email: user.email ?? "",
  }

  return (
    <div className="max-w-[860px] space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
              <Settings className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            </span>
            Configuración
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Perfil personal · Establecimiento · Sistema</p>
        </div>
      </div>

      {/* ── Profile + Password ── */}
      <ProfileForm profile={profileWithEmail} />

      {/* ── Org settings (admin-only with editable form) ── */}
      {isAdmin && org ? (
        <OrgSettingsForm org={org} />
      ) : isAdmin && !org ? (
        <div className="bg-white dark:bg-[#111827] border border-blue-200 dark:border-blue-800 rounded-xl p-5">
          <p className="text-sm font-bold text-blue-800 dark:text-blue-200">Migración requerida</p>
          <p className="text-sm text-slate-900 dark:text-slate-100 mt-1">
            Ejecuta <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">011_multi_tenant.sql</code> en
            Supabase para habilitar la edición del establecimiento.
          </p>
        </div>
      ) : null}

      {/* ── System stats ── */}
      <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
          <Database className="w-4 h-4  text-slate-600 dark:text-slate-300" />
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Estadísticas del Sistema</span>
        </div>
        <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: "Usuarios activos",         value: userCount        ?? "—", icon: Users,        color: "text-blue-600",   bg: "bg-white dark:bg-[#111827]"    },
            { label: "Órdenes en proceso",        value: activeOrderCount ?? "—", icon: ClipboardList, color: "text-amber-600",  bg: "bg-white dark:bg-[#111827]"  },
            { label: "Desviaciones abiertas",     value: openDeviations   ?? "—", icon: AlertTriangle, color: "text-red-600",    bg: "bg-white dark:bg-[#111827]"      },
            { label: "CAPAs abiertas",            value: openCAPAs        ?? "—", icon: Shield,        color: "text-orange-600", bg: "bg-white dark:bg-[#111827]"},
            { label: "Registros de recepción",    value: logCount         ?? "—", icon: CheckCircle2,  color: "text-green-600",  bg: "bg-white dark:bg-[#111827]"  },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl p-4 ${s.bg}`}>
              <s.icon className={`w-4 h-4 ${s.color} mb-2`} />
              <p className={`text-2xl font-black ${s.color} tabular-nums`}>{s.value}</p>
              <p className="text-[10.5px] font-medium text-slate-500 dark:text-slate-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Roles & Permissions ── */}
      <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
          <Shield className="w-4 h-4  text-slate-600 dark:text-slate-300" />
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Roles y Permisos</span>
        </div>
        <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
          {ROLES.map((r) => (
            <div key={r.role} className="px-5 py-4 flex items-start gap-4">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0 mt-0.5 ${r.color}`}>
                {r.role}
              </span>
              <ul className="flex flex-col gap-1">
                {r.perms.map((p) => (
                  <li key={p} className="flex items-center gap-1.5 text-[12.5px] text-slate-500 dark:text-slate-400">
                    <CheckCircle2 className="w-3 h-3 text-slate-300 dark:text-slate-600 flex-shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* ── Version footer ── */}
      <div className="text-center pb-2">
        <p className="text-[10.5px] text-slate-300 dark:text-slate-600">
          FactorOS · El sistema operativo de tu planta · v0.1.0-beta
        </p>
      </div>
    </div>
  )
}
