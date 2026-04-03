import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import {
  AlertTriangle, CheckSquare, ClipboardList, Factory,
  ShieldAlert, Truck, Wrench, CheckCircle2, Circle,
  TrendingUp, Package, DollarSign, Boxes, Timer, ArrowUpRight,
} from "lucide-react"
import { LogStatusBadge } from "@/components/logs/LogStatusBadge"
import { formatDate } from "@/lib/utils"
import Link from "next/link"
import type { LogStatus } from "@/types"

const COVERAGE_MODULES = [
  { label: "Recepción",    table: "receiving_logs",              dateField: "received_date",     href: "/receiving/new" },
  { label: "Descongelado", table: "thawing_logs",               dateField: "date",              href: "/thawing/new" },
  { label: "Cocción CCP",  table: "cooking_chilling_logs",      dateField: "cook_date",         href: "/cooking/new" },
  { label: "Calibración",  table: "calibration_logs",           dateField: "calibration_date",  href: "/calibration/new" },
  { label: "Pre-Op",       table: "preop_sanitation_reports",   dateField: "report_date",       href: "/sanitation/preop/new" },
  { label: "Sanitación",   table: "operational_sanitation_logs",dateField: "log_date",          href: "/sanitation/operational/new" },
]

const LOG_TABLES = [
  "thawing_logs","receiving_logs","cooking_chilling_logs",
  "calibration_logs","preop_sanitation_reports",
  "operational_sanitation_logs","preshipment_reviews",
] as const

async function getDashboardData() {
  const supabase = await createClient()
  const today    = new Date().toISOString().split("T")[0]

  const [
    { count: openDeviations },
    { count: overdueCapas },
    { count: activeOrders },
    { count: readyToShip },
    { data: recentThawing },
    { data: recentDeviations },
    { data: recentOrders },
    ...pendingResults
  ] = await Promise.all([
    supabase.from("deviations").select("*",{count:"exact",head:true}).in("status",["open","under_review"]),
    supabase.from("corrective_actions").select("*",{count:"exact",head:true}).lt("due_date",today).in("status",["open","in_progress"]),
    supabase.from("production_orders").select("*",{count:"exact",head:true}).in("status",["planned","in_production","cooking","chilling","packaging","refrigerating"]),
    supabase.from("production_orders").select("*",{count:"exact",head:true}).eq("status","ready"),
    supabase.from("thawing_logs").select("id,date,status,lot_batch_number,thawing_method,created_at,products(name)").order("created_at",{ascending:false}).limit(5),
    supabase.from("deviations").select("id,date_identified,severity,status,description").order("created_at",{ascending:false}).limit(4),
    supabase.from("production_orders").select("id,order_number,status,quantity_lbs,order_date,clients(company_name),products(name)").in("status",["planned","in_production","cooking","chilling","packaging","refrigerating","ready"]).order("created_at",{ascending:false}).limit(4),
    ...LOG_TABLES.map((t) => supabase.from(t).select("*",{count:"exact",head:true}).eq("status","submitted")),
  ])

  const pendingApproval = pendingResults.reduce((s,r) => s + (r.count||0), 0)

  const coverageResults = await Promise.all(
    COVERAGE_MODULES.map((m) =>
      supabase.from(m.table as any).select("*",{count:"exact",head:true}).eq(m.dateField,today)
    )
  )
  const coverage = COVERAGE_MODULES.map((m,i) => ({ ...m, count: coverageResults[i].count||0 }))
  const logsToday = coverage.reduce((s,m) => s + m.count, 0)

  return {
    logsToday, pendingApproval,
    openDeviations: openDeviations||0, overdueCapas: overdueCapas||0,
    recentThawing: recentThawing||[], recentDeviations: recentDeviations||[],
    activeOrders: activeOrders||0, readyToShip: readyToShip||0,
    recentOrders: recentOrders||[], coverage,
  }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("role,full_name").eq("id",user.id).single()
  if (!profile) redirect("/login")

  const stats = await getDashboardData()
  const coveredCount = stats.coverage.filter((m) => m.count > 0).length
  const compliancePct = Math.round((coveredCount / stats.coverage.length) * 100)

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? "Buenos días" : hour < 18 ? "Buenas tardes" : "Buenas noches"
  const firstName = profile.full_name?.split(" ")[0] ?? ""

  return (
    <div className="space-y-6 max-w-[1400px]">

      {/* ── Welcome Header ──────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            {greeting}{firstName ? `, ${firstName}` : ""} 👋
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {now.toLocaleDateString("es-US", { weekday:"long", year:"numeric", month:"long", day:"numeric" })}
          </p>
        </div>
        {/* Compliance score pill */}
        <div className={`flex items-center gap-2.5 px-4 py-2 rounded-xl border text-sm font-semibold ${
          compliancePct === 100
            ? "bg-green-50 border-green-200 text-green-700"
            : compliancePct >= 50
            ? "bg-amber-50 border-amber-200 text-amber-700"
            : "bg-red-50 border-red-200 text-red-700"
        }`}>
          <span className={`w-2 h-2 rounded-full ${
            compliancePct === 100 ? "bg-green-500 animate-pulse" :
            compliancePct >= 50   ? "bg-amber-500 animate-pulse" : "bg-red-500 animate-pulse"
          }`} />
          Cobertura hoy: {compliancePct}%
        </div>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          {
            label: "Logs Hoy", value: stats.logsToday, icon: ClipboardList,
            href: "/thawing",
            accent: "blue",
            alert: false,
          },
          {
            label: "Pendientes", value: stats.pendingApproval, icon: CheckSquare,
            href: "/thawing",
            accent: stats.pendingApproval > 0 ? "amber" : "green",
            alert: stats.pendingApproval > 0,
          },
          {
            label: "Desviaciones", value: stats.openDeviations, icon: AlertTriangle,
            href: "/deviations",
            accent: stats.openDeviations > 0 ? "red" : "green",
            alert: stats.openDeviations > 0,
          },
          {
            label: "CAPAs Vencidos", value: stats.overdueCapas, icon: Wrench,
            href: "/corrective-actions",
            accent: stats.overdueCapas > 0 ? "red" : "green",
            alert: stats.overdueCapas > 0,
          },
          {
            label: "Órdenes Activas", value: stats.activeOrders, icon: Factory,
            href: "/production",
            accent: stats.activeOrders > 0 ? "indigo" : "slate",
            alert: false,
          },
          {
            label: "Listos p/ Envío", value: stats.readyToShip, icon: Truck,
            href: "/production?status=ready",
            accent: stats.readyToShip > 0 ? "emerald" : "slate",
            alert: stats.readyToShip > 0,
          },
        ].map((kpi) => {
          const accentMap: Record<string,{bg:string,text:string,border:string,iconBg:string}> = {
            blue:    { bg:"bg-blue-50",    text:"text-blue-700",    border:"border-blue-100",   iconBg:"bg-blue-100" },
            amber:   { bg:"bg-amber-50",   text:"text-amber-700",   border:"border-amber-100",  iconBg:"bg-amber-100" },
            red:     { bg:"bg-red-50",     text:"text-red-700",     border:"border-red-100",    iconBg:"bg-red-100" },
            green:   { bg:"bg-green-50",   text:"text-green-700",   border:"border-green-100",  iconBg:"bg-green-100" },
            indigo:  { bg:"bg-indigo-50",  text:"text-indigo-700",  border:"border-indigo-100", iconBg:"bg-indigo-100" },
            emerald: { bg:"bg-emerald-50", text:"text-emerald-700", border:"border-emerald-100",iconBg:"bg-emerald-100" },
            slate:   { bg:"bg-slate-50",   text:"text-slate-500",   border:"border-slate-100",  iconBg:"bg-slate-100" },
          }
          const c = accentMap[kpi.accent]
          return (
            <Link key={kpi.label} href={kpi.href}>
              <div className={`relative rounded-xl border p-4 hover:shadow-md transition-all duration-200 cursor-pointer group ${c.bg} ${c.border}`}>
                {kpi.alert && (
                  <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-current opacity-60 animate-pulse" />
                )}
                <div className={`w-9 h-9 rounded-lg ${c.iconBg} flex items-center justify-center mb-3`}>
                  <kpi.icon className={`w-4 h-4 ${c.text}`} />
                </div>
                <p className={`text-2xl font-black ${c.text} leading-none`}>{kpi.value}</p>
                <p className="text-[11px] font-medium text-slate-500 mt-1.5">{kpi.label}</p>
                <ArrowUpRight className="absolute bottom-3 right-3 w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          )
        })}
      </div>

      {/* ── Enterprise Modules Teaser ──────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Costos por Lote",   icon: DollarSign, href: "/costos",     color: "amber",  value: "Próximo" },
          { label: "Control Inventario",icon: Boxes,       href: "/inventario", color: "blue",   value: "Próximo" },
          { label: "Horas de Producción",icon:Timer,       href: "/horas",      color: "green",  value: "Próximo" },
          { label: "Dashboard Financiero",icon:TrendingUp,  href: "/finanzas",   color: "purple", value: "Próximo" },
        ].map((mod) => {
          const c: Record<string,{bg:string,text:string,border:string,iconBg:string}> = {
            amber:  { bg:"bg-amber-950/20",  text:"text-amber-400",  border:"border-amber-900/30",  iconBg:"bg-amber-950/40" },
            blue:   { bg:"bg-blue-950/20",   text:"text-blue-400",   border:"border-blue-900/30",   iconBg:"bg-blue-950/40" },
            green:  { bg:"bg-green-950/20",  text:"text-green-400",  border:"border-green-900/30",  iconBg:"bg-green-950/40" },
            purple: { bg:"bg-purple-950/20", text:"text-purple-400", border:"border-purple-900/30", iconBg:"bg-purple-950/40" },
          }
          const col = c[mod.color]
          return (
            <div key={mod.label} className={`rounded-xl border p-4 ${col.bg} ${col.border} opacity-60`}>
              <div className={`w-8 h-8 rounded-lg ${col.iconBg} flex items-center justify-center mb-2.5`}>
                <mod.icon className={`w-4 h-4 ${col.text}`} />
              </div>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${col.text} mb-1`}>{mod.value}</p>
              <p className="text-[12px] font-semibold text-slate-400">{mod.label}</p>
            </div>
          )
        })}
      </div>

      {/* ── Today's Coverage ──────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Cobertura de Logs — Hoy</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Módulos que deben tener al menos un registro diario</p>
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${
            coveredCount === stats.coverage.length
              ? "bg-green-100 text-green-700"
              : coveredCount === 0
              ? "bg-red-100 text-red-700"
              : "bg-amber-100 text-amber-700"
          }`}>
            {coveredCount} / {stats.coverage.length} módulos
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-0 divide-x divide-y divide-slate-100">
          {stats.coverage.map((mod) => (
            <Link
              key={mod.table}
              href={mod.count > 0 ? mod.href.replace("/new","") : mod.href}
              className={`flex flex-col items-center gap-2 p-4 text-center transition-colors hover:bg-slate-50 ${
                mod.count > 0 ? "bg-green-50/50" : "bg-white"
              }`}
            >
              {mod.count > 0
                ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                : <Circle className="w-5 h-5 text-slate-200" />
              }
              <span className="text-[11.5px] font-semibold text-slate-600 leading-tight">{mod.label}</span>
              {mod.count > 0
                ? <span className="text-[10px] text-green-600 font-bold">{mod.count} log{mod.count!==1?"s":""}</span>
                : <span className="text-[10px] text-slate-300 font-medium">Pendiente</span>
              }
            </Link>
          ))}
        </div>
      </div>

      {/* ── Quick Actions ──────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
        <h2 className="text-sm font-bold text-slate-800 mb-4">Acciones Rápidas</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[
            { label: "Descongelado",  href: "/thawing/new",              emoji: "🧊", color: "hover:bg-cyan-50    hover:border-cyan-200" },
            { label: "Recepción",     href: "/receiving/new",            emoji: "📦", color: "hover:bg-blue-50   hover:border-blue-200" },
            { label: "Cocción CCP",   href: "/cooking/new",              emoji: "🔥", color: "hover:bg-red-50    hover:border-red-200" },
            { label: "Calibración",   href: "/calibration/new",          emoji: "🌡️", color: "hover:bg-amber-50  hover:border-amber-200" },
            { label: "Desviación",    href: "/deviations/new",           emoji: "⚠️", color: "hover:bg-orange-50 hover:border-orange-200" },
            { label: "Nueva Orden",   href: "/production/new",           emoji: "🏭", color: "hover:bg-indigo-50 hover:border-indigo-200" },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border border-slate-100 transition-all duration-150 text-center ${action.color}`}
            >
              <span className="text-2xl leading-none">{action.emoji}</span>
              <span className="text-[11px] font-semibold text-slate-600 leading-tight">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Recent Activity ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Recent Logs */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-800">Últimos Registros</h2>
            <Link href="/thawing" className="text-[11.5px] text-red-500 hover:text-red-600 font-semibold flex items-center gap-0.5">
              Ver todos <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {stats.recentThawing.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">Sin registros hoy</p>
            ) : stats.recentThawing.map((log: any) => (
              <Link
                key={log.id}
                href={`/thawing/${log.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors"
              >
                <div>
                  <p className="text-[13px] font-semibold text-slate-700">{log.products?.name || "—"}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{log.lot_batch_number || "Sin lote"} · {formatDate(log.date)}</p>
                </div>
                <LogStatusBadge status={log.status as LogStatus} />
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Deviations */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-800">Desviaciones Recientes</h2>
            <Link href="/deviations" className="text-[11.5px] text-red-500 hover:text-red-600 font-semibold flex items-center gap-0.5">
              Ver todas <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {stats.recentDeviations.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-slate-300">
                <ShieldAlert className="w-8 h-8 mb-2" />
                <p className="text-sm font-medium text-slate-400">Sin desviaciones abiertas</p>
              </div>
            ) : stats.recentDeviations.map((dev: any) => (
              <Link
                key={dev.id}
                href={`/deviations/${dev.id}`}
                className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50 transition-colors"
              >
                <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
                  dev.severity==="critical" ? "bg-red-500" :
                  dev.severity==="major"    ? "bg-amber-500" : "bg-yellow-400"
                }`} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-slate-700 truncate">{dev.description}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(dev.date_identified)} · <span className="capitalize">{dev.severity}</span></p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                  dev.status==="open" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                }`}>{dev.status}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Active Production Orders ────────────────────────── */}
      {stats.recentOrders.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Factory className="w-4 h-4 text-indigo-500" />
              Órdenes de Producción Activas
            </h2>
            <Link href="/production" className="text-[11.5px] text-red-500 hover:text-red-600 font-semibold flex items-center gap-0.5">
              Ver todas <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 divide-x divide-y divide-slate-50">
            {stats.recentOrders.map((order: any) => {
              const statusConfig: Record<string,{label:string,bg:string,text:string}> = {
                planned:       { label:"Planificado", bg:"bg-blue-100",    text:"text-blue-700" },
                in_production: { label:"En Producción",bg:"bg-orange-100", text:"text-orange-700" },
                cooking:       { label:"Cocción",     bg:"bg-red-100",     text:"text-red-700" },
                chilling:      { label:"Enfriando",   bg:"bg-cyan-100",    text:"text-cyan-700" },
                packaging:     { label:"Empacando",   bg:"bg-purple-100",  text:"text-purple-700" },
                refrigerating: { label:"Refrigerando",bg:"bg-indigo-100",  text:"text-indigo-700" },
                ready:         { label:"Listo",        bg:"bg-emerald-100", text:"text-emerald-700" },
              }
              const sc = statusConfig[order.status] ?? { label:order.status, bg:"bg-slate-100", text:"text-slate-600" }
              return (
                <Link
                  key={order.id}
                  href={`/production/${order.id}`}
                  className="flex flex-col gap-2 p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-mono text-slate-400">{order.order_number}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>{sc.label}</span>
                  </div>
                  <p className="text-[13px] font-bold text-slate-800 truncate">{order.clients?.company_name || "—"}</p>
                  <p className="text-[11px] text-slate-400">{order.products?.name} · {Number(order.quantity_lbs||0).toLocaleString()} lbs</p>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
