import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import {
  AlertTriangle, CheckSquare, ClipboardList, Factory,
  ShieldAlert, Truck, Wrench, CheckCircle2, Clock,
  TrendingUp, DollarSign, Boxes, Timer, ArrowUpRight,
  Play, Thermometer, FlaskConical, Shield,
  Package2, ChevronRight,
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
  const supabase  = await createClient()
  const today     = new Date().toISOString().split("T")[0]
  const monthStart = today.slice(0, 7) + "-01"

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

  /* ── Enterprise KPIs (graceful — tables may not exist yet) ── */
  let cogsMonth    = 0
  let lowStockCnt  = 0
  let inventoryVal = 0
  let hoursWeek    = 0
  try {
    const weekStart = new Date(today)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const ws = weekStart.toISOString().split("T")[0]

    const [costRes, invRes, hoursRes] = await Promise.all([
      supabase.from("cost_items").select("total_cost").gte("created_at", monthStart + "T00:00:00"),
      supabase.from("inventory_items").select("current_stock, min_stock, cost_per_unit").eq("is_active", true),
      supabase.from("labor_entries").select("hours_worked").gte("work_date", ws),
    ])
    cogsMonth   = (costRes.data  || []).reduce((s:number, r:any) => s + Number(r.total_cost  ?? 0), 0)
    hoursWeek   = (hoursRes.data || []).reduce((s:number, r:any) => s + Number(r.hours_worked ?? 0), 0)
    const invItems = invRes.data || []
    inventoryVal  = invItems.reduce((s:number, i:any) => s + Number(i.current_stock) * Number(i.cost_per_unit ?? 0), 0)
    lowStockCnt   = invItems.filter((i:any) => Number(i.current_stock) <= Number(i.min_stock ?? 0)).length
  } catch { /* tables not migrated yet */ }

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
    /* enterprise */
    cogsMonth, lowStockCnt, inventoryVal, hoursWeek,
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
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            {greeting}{firstName ? `, ${firstName}` : ""} 👋
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
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

      {/* ── Quick Actions ────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <Link href="/production/new"
          className="group flex flex-col items-center gap-2 px-3 py-4 rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-sm transition-all hover:shadow-md col-span-2 sm:col-span-1">
          <Play className="w-5 h-5 fill-white" />
          <span className="text-xs font-bold tracking-tight text-center leading-tight">Iniciar Producción</span>
        </Link>
        <Link href="/receiving/new"
          className="group flex flex-col items-center gap-2 px-3 py-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-slate-700 transition-all">
          <Truck className="w-5 h-5 text-blue-500" />
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 text-center leading-tight">Registrar Recepción</span>
        </Link>
        <Link href="/sanitation/preop/new"
          className="group flex flex-col items-center gap-2 px-3 py-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-green-400 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-slate-700 transition-all">
          <Shield className="w-5 h-5 text-green-500" />
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 text-center leading-tight">Pre-Op Sanitación</span>
        </Link>
        <Link href="/metal-detector/nuevo"
          className="group flex flex-col items-center gap-2 px-3 py-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-purple-400 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-slate-700 transition-all">
          <FlaskConical className="w-5 h-5 text-purple-500" />
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 text-center leading-tight">Det. de Metales</span>
        </Link>
        <Link href="/deviations/new"
          className="group flex flex-col items-center gap-2 px-3 py-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-amber-400 dark:hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-slate-700 transition-all">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 text-center leading-tight">Reportar Desviación</span>
        </Link>
        <Link href="/salud-personal/nuevo"
          className="group flex flex-col items-center gap-2 px-3 py-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-rose-400 dark:hover:border-rose-500 hover:bg-rose-50 dark:hover:bg-slate-700 transition-all">
          <Thermometer className="w-5 h-5 text-rose-500" />
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 text-center leading-tight">Declaración de Salud</span>
        </Link>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          {
            label: "Logs Hoy", value: stats.logsToday, icon: ClipboardList,
            href: "/thawing", accent: "blue", alert: false,
          },
          {
            label: "Pendientes", value: stats.pendingApproval, icon: CheckSquare,
            href: "/thawing", accent: stats.pendingApproval > 0 ? "amber" : "green",
            alert: stats.pendingApproval > 0,
          },
          {
            label: "Desviaciones", value: stats.openDeviations, icon: AlertTriangle,
            href: "/deviations", accent: stats.openDeviations > 0 ? "red" : "green",
            alert: stats.openDeviations > 0,
          },
          {
            label: "CAPAs Vencidos", value: stats.overdueCapas, icon: Wrench,
            href: "/corrective-actions", accent: stats.overdueCapas > 0 ? "red" : "green",
            alert: stats.overdueCapas > 0,
          },
          {
            label: "Órdenes Activas", value: stats.activeOrders, icon: Factory,
            href: "/production", accent: stats.activeOrders > 0 ? "indigo" : "slate",
            alert: false,
          },
          {
            label: "Listos p/ Envío", value: stats.readyToShip, icon: Truck,
            href: "/production?status=ready", accent: stats.readyToShip > 0 ? "emerald" : "slate",
            alert: stats.readyToShip > 0,
          },
        ].map((kpi) => {
          const accentMap: Record<string,{iconBg:string,iconText:string,bar:string,alertDot:string}> = {
            blue:    { iconBg:"bg-blue-100 dark:bg-blue-900/40",    iconText:"text-blue-600 dark:text-blue-300",    bar:"bg-blue-500",    alertDot:"bg-blue-500" },
            amber:   { iconBg:"bg-amber-100 dark:bg-amber-900/40",   iconText:"text-amber-600 dark:text-amber-300",   bar:"bg-amber-500",   alertDot:"bg-amber-500" },
            red:     { iconBg:"bg-red-100 dark:bg-red-900/40",     iconText:"text-red-600 dark:text-red-300",     bar:"bg-red-500",     alertDot:"bg-red-500" },
            green:   { iconBg:"bg-green-100 dark:bg-green-900/40",   iconText:"text-green-600 dark:text-green-300",   bar:"bg-green-500",   alertDot:"bg-green-500" },
            indigo:  { iconBg:"bg-indigo-100 dark:bg-indigo-900/40",  iconText:"text-indigo-600 dark:text-indigo-300",  bar:"bg-indigo-500",  alertDot:"bg-indigo-500" },
            emerald: { iconBg:"bg-emerald-100 dark:bg-emerald-900/40", iconText:"text-emerald-600 dark:text-emerald-300", bar:"bg-emerald-500", alertDot:"bg-emerald-500" },
            slate:   { iconBg:"bg-slate-100 dark:bg-slate-700",      iconText:"text-slate-500 dark:text-slate-300",   bar:"bg-slate-300",   alertDot:"bg-slate-400" },
          }
          const c = accentMap[kpi.accent]
          return (
            <Link key={kpi.label} href={kpi.href}>
              <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] p-4 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200 cursor-pointer group overflow-hidden">
                {/* colored top bar */}
                <div className={`absolute top-0 left-0 right-0 h-1 ${c.bar}`} />
                {kpi.alert && (
                  <span className={`absolute top-3 right-3 w-2 h-2 rounded-full ${c.alertDot} animate-pulse`} />
                )}
                <div className={`w-9 h-9 rounded-lg ${c.iconBg} flex items-center justify-center mb-3 mt-1`}>
                  <kpi.icon className={`w-4 h-4 ${c.iconText}`} />
                </div>
                <p className="text-2xl font-black text-slate-900 dark:text-slate-100 leading-none">{kpi.value}</p>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1.5">{kpi.label}</p>
                <ArrowUpRight className="absolute bottom-3 right-3 w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          )
        })}
      </div>

      {/* ── Enterprise Modules — live KPIs ──────────────────── */}
      {(() => {
        const fmt$ = (n: number) => n > 0
          ? n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 })
          : "—"
        const { lowStockCnt } = stats
        const enterpriseMods = [
          {
            label: "COGS del mes",
            sub:   "Costos de Producción",
            icon:  DollarSign,
            href:  "/costos",
            value: fmt$(stats.cogsMonth),
            alert: false,
            bar: "bg-amber-500",
            iconBg: "bg-amber-100 dark:bg-amber-900/40",
            iconText: "text-amber-600 dark:text-amber-300",
          },
          {
            label: lowStockCnt > 0 ? `${lowStockCnt} bajo mínimo` : "Stock OK",
            sub:   "Control de Inventario",
            icon:  Boxes,
            href:  "/inventario",
            value: fmt$(stats.inventoryVal),
            alert: lowStockCnt > 0,
            bar: lowStockCnt > 0 ? "bg-orange-500" : "bg-blue-500",
            iconBg: lowStockCnt > 0 ? "bg-orange-100 dark:bg-orange-900/40" : "bg-blue-100 dark:bg-blue-900/40",
            iconText: lowStockCnt > 0 ? "text-orange-600 dark:text-orange-300" : "text-blue-600 dark:text-blue-300",
          },
          {
            label: "Horas esta semana",
            sub:   "Control de Horas MOD",
            icon:  Timer,
            href:  "/horas",
            value: stats.hoursWeek > 0 ? `${stats.hoursWeek.toFixed(1)} h` : "—",
            alert: false,
            bar: "bg-green-500",
            iconBg: "bg-green-100 dark:bg-green-900/40",
            iconText: "text-green-600 dark:text-green-300",
          },
          {
            label: "Dashboard financiero",
            sub:   "Finanzas",
            icon:  TrendingUp,
            href:  "/finanzas",
            value: "Ver reporte",
            alert: false,
            bar: "bg-purple-500",
            iconBg: "bg-purple-100 dark:bg-purple-900/40",
            iconText: "text-purple-600 dark:text-purple-300",
          },
        ]
        return (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {enterpriseMods.map((mod) => (
              <Link key={mod.href} href={mod.href}
                className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] p-4 overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-slate-300 dark:hover:border-slate-600"
              >
                <div className={`absolute top-0 left-0 right-0 h-1 ${mod.bar}`} />
                <div className="flex items-center justify-between mb-3 mt-1">
                  <div className={`w-8 h-8 rounded-lg ${mod.iconBg} flex items-center justify-center`}>
                    <mod.icon className={`w-4 h-4 ${mod.iconText}`} />
                  </div>
                  {mod.alert && (
                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                  )}
                </div>
                <p className="text-lg font-black leading-none text-slate-900 dark:text-slate-100 tabular-nums">{mod.value}</p>
                <p className="text-[10.5px] font-semibold mt-1 text-slate-700 dark:text-slate-300">{mod.label}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{mod.sub}</p>
              </Link>
            ))}
          </div>
        )
      })()}

      {/* ── Today's Coverage ──────────────────────────────── */}
      <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Cobertura de Logs — Hoy</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Módulos que deben tener al menos un registro diario</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${
              coveredCount === stats.coverage.length
                ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                : coveredCount === 0
                ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
            }`}>
              {coveredCount} / {stats.coverage.length} módulos
            </span>
            <Link href="/thawing" className="text-xs text-red-600 hover:text-red-700 font-semibold">
              Ver todos →
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-y divide-slate-100 dark:divide-slate-700/60">
          {stats.coverage.map((mod) => (
            <Link
              key={mod.table}
              href={mod.count > 0 ? mod.href.replace("/new","") : mod.href}
              className={`group flex flex-col items-center gap-2.5 p-5 text-center transition-all hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                mod.count > 0
                  ? "dark:bg-green-900/10"
                  : "dark:bg-[#111827]"
              }`}
            >
              {mod.count > 0 ? (
                <CheckCircle2 className="w-8 h-8 text-green-500 drop-shadow-sm" />
              ) : (
                <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              )}
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-tight">{mod.label}</span>
              {mod.count > 0 ? (
                <span className="text-[10px] font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                  registrado hoy
                </span>
              ) : (
                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                  pendiente
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* ── Checklist de hoy ─────────────────────────────── */}
      {(() => {
        const checklistItems = [
          { label: "Recepción",   table: "receiving_logs" },
          { label: "Pre-Op",      table: "preop_sanitation_reports" },
          { label: "Descongelado",table: "thawing_logs" },
          { label: "Calibración", table: "calibration_logs" },
        ]
        return (
          <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Checklist de hoy</h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Tareas críticas de cumplimiento diario</p>
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                checklistItems.every(item => (stats.coverage.find(m => m.table === item.table)?.count ?? 0) > 0)
                  ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
              }`}>
                {checklistItems.filter(item => (stats.coverage.find(m => m.table === item.table)?.count ?? 0) > 0).length} / {checklistItems.length} completados
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {checklistItems.map((item) => {
                const covered = (stats.coverage.find(m => m.table === item.table)?.count ?? 0) > 0
                return (
                  <div
                    key={item.table}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all ${
                      covered
                        ? "border-green-200 bg-green-50 dark:border-green-800/50 dark:bg-green-900/10"
                        : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40"
                    }`}
                  >
                    <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black ${
                      covered
                        ? "bg-green-500 text-white"
                        : "bg-slate-200 dark:bg-slate-600 text-slate-400 dark:text-slate-300"
                    }`}>
                      {covered ? "✓" : "✗"}
                    </span>
                    <span className={`text-xs font-semibold ${
                      covered
                        ? "text-green-700 dark:text-green-300"
                        : "text-slate-500 dark:text-slate-400"
                    }`}>
                      {item.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* ── Quick Actions (secondary) ──────────────────────── */}
      <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Acciones Rápidas</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Registrar un log nuevo</p>
          </div>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[
            { label: "Descongelado",  href: "/thawing/new",     emoji: "🧊", color: "hover:bg-cyan-50    hover:border-cyan-200 dark:hover:border-cyan-700" },
            { label: "Recepción",     href: "/receiving/new",   emoji: "📦", color: "hover:bg-blue-50   hover:border-blue-200 dark:hover:border-blue-700" },
            { label: "Cocción CCP",   href: "/cooking/new",     emoji: "🔥", color: "hover:bg-red-50    hover:border-red-200 dark:hover:border-red-700" },
            { label: "Calibración",   href: "/calibration/new", emoji: "🌡️", color: "hover:bg-amber-50  hover:border-amber-200 dark:hover:border-amber-700" },
            { label: "Desviación",    href: "/deviations/new",  emoji: "⚠️", color: "hover:bg-orange-50 hover:border-orange-200 dark:hover:border-orange-700" },
            { label: "Nueva Orden",   href: "/production/new",  emoji: "🏭", color: "hover:bg-indigo-50 hover:border-indigo-200 dark:hover:border-indigo-700" },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 transition-all duration-150 text-center ${action.color}`}
            >
              <span className="text-2xl leading-none">{action.emoji}</span>
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 leading-tight">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Recent Activity ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Recent Thawing Logs — activity feed */}
        <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Últimos Registros</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Actividad reciente de descongelado</p>
            </div>
            <Link href="/thawing" className="text-xs text-red-600 hover:text-red-700 font-semibold">
              Ver todos →
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {stats.recentThawing.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-slate-300 dark:text-slate-600">
                <Package2 className="w-8 h-8 mb-2" />
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Sin registros recientes</p>
              </div>
            ) : stats.recentThawing.map((log: any) => {
              const dotColor = log.status === "approved" ? "bg-green-500" :
                               log.status === "submitted" ? "bg-amber-400" :
                               log.status === "rejected"  ? "bg-red-500" : "bg-slate-300"
              return (
                <Link
                  key={log.id}
                  href={`/thawing/${log.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group"
                >
                  {/* status dot */}
                  <span className={`flex-shrink-0 w-2.5 h-2.5 rounded-full ${dotColor}`} />
                  {/* info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">{log.products?.name || "—"}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                      <span className="font-mono">{log.lot_batch_number || "Sin lote"}</span>
                      <span className="text-slate-300 dark:text-slate-600">·</span>
                      <span>{formatDate(log.date)}</span>
                    </p>
                  </div>
                  {/* status badge */}
                  <LogStatusBadge status={log.status as LogStatus} />
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </Link>
              )
            })}
          </div>
        </div>

        {/* Recent Deviations */}
        <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Desviaciones Recientes</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Eventos abiertos o bajo revisión</p>
            </div>
            <Link href="/deviations" className="text-xs text-red-600 hover:text-red-700 font-semibold">
              Ver todas →
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {stats.recentDeviations.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-slate-300 dark:text-slate-600">
                <ShieldAlert className="w-8 h-8 mb-2" />
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Sin desviaciones abiertas</p>
              </div>
            ) : stats.recentDeviations.map((dev: any) => (
              <Link
                key={dev.id}
                href={`/deviations/${dev.id}`}
                className="flex items-start gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group"
              >
                <span className={`mt-1 flex-shrink-0 w-2.5 h-2.5 rounded-full ${
                  dev.severity==="critical" ? "bg-red-500" :
                  dev.severity==="major"    ? "bg-amber-500" : "bg-yellow-400"
                }`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">{dev.description}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {formatDate(dev.date_identified)} · <span className="capitalize">{dev.severity}</span>
                  </p>
                </div>
                <span className={`flex-shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full ${
                  dev.status==="open"
                    ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                }`}>{dev.status}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Active Production Orders — Kanban pipeline ─────── */}
      {stats.recentOrders.length > 0 && (() => {
        const PIPELINE: Array<{ key: string; label: string; bar: string; badge: string; badgeText: string }> = [
          { key: "planned",       label: "Planificado",   bar: "bg-blue-400",    badge: "bg-blue-100 dark:bg-blue-900/40",    badgeText: "text-blue-700 dark:text-blue-300" },
          { key: "in_production", label: "En Producción", bar: "bg-orange-400",  badge: "bg-orange-100 dark:bg-orange-900/40", badgeText: "text-orange-700 dark:text-orange-300" },
          { key: "cooking",       label: "Cocción",       bar: "bg-red-500",     badge: "bg-red-100 dark:bg-red-900/40",      badgeText: "text-red-700 dark:text-red-300" },
          { key: "chilling",      label: "Enfriando",     bar: "bg-cyan-400",    badge: "bg-cyan-100 dark:bg-cyan-900/40",    badgeText: "text-cyan-700 dark:text-cyan-300" },
          { key: "packaging",     label: "Empacando",     bar: "bg-purple-400",  badge: "bg-purple-100 dark:bg-purple-900/40", badgeText: "text-purple-700 dark:text-purple-300" },
          { key: "refrigerating", label: "Refrigerando",  bar: "bg-indigo-400",  badge: "bg-indigo-100 dark:bg-indigo-900/40", badgeText: "text-indigo-700 dark:text-indigo-300" },
          { key: "ready",         label: "Listo",         bar: "bg-emerald-500", badge: "bg-emerald-100 dark:bg-emerald-900/40", badgeText: "text-emerald-700 dark:text-emerald-300" },
        ]
        // group orders by status key
        const grouped: Record<string, any[]> = {}
        stats.recentOrders.forEach((o: any) => {
          if (!grouped[o.status]) grouped[o.status] = []
          grouped[o.status].push(o)
        })
        // only show pipeline stages that have orders
        const activeStages = PIPELINE.filter(stage => (grouped[stage.key]?.length ?? 0) > 0)

        return (
          <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Factory className="w-4 h-4 text-indigo-500" />
                  Órdenes de Producción Activas
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Pipeline de producción — {stats.activeOrders} en proceso</p>
              </div>
              <Link href="/production" className="text-xs text-red-600 hover:text-red-700 font-semibold">
                Ver todas →
              </Link>
            </div>
            {/* Pipeline stage headers */}
            <div className="overflow-x-auto">
              <div className="min-w-max">
                {/* Stage header row */}
                <div className={`grid gap-px bg-slate-100 dark:bg-slate-700/50`} style={{ gridTemplateColumns: `repeat(${activeStages.length}, minmax(180px, 1fr))` }}>
                  {activeStages.map((stage) => (
                    <div key={stage.key} className="bg-slate-50 dark:bg-slate-800/60 px-4 py-2 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${stage.bar}`} />
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{stage.label}</span>
                      <span className="ml-auto text-[10px] font-bold text-slate-400 dark:text-slate-500">{grouped[stage.key]?.length ?? 0}</span>
                    </div>
                  ))}
                </div>
                {/* Cards row */}
                <div className={`grid gap-px bg-slate-100 dark:bg-slate-700/50`} style={{ gridTemplateColumns: `repeat(${activeStages.length}, minmax(180px, 1fr))` }}>
                  {activeStages.map((stage) => (
                    <div key={stage.key} className="bg-white dark:bg-[#111827] p-3 flex flex-col gap-2">
                      {(grouped[stage.key] || []).map((order: any) => (
                        <Link
                          key={order.id}
                          href={`/production/${order.id}`}
                          className="group block rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-3 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm transition-all"
                        >
                          {/* top bar accent */}
                          <div className={`h-0.5 rounded-full ${stage.bar} mb-2.5`} />
                          <div className="flex items-start justify-between gap-1 mb-1.5">
                            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{order.order_number}</span>
                            <ChevronRight className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
                          </div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate leading-tight">{order.clients?.company_name || "—"}</p>
                          <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-1 truncate">{order.products?.name}</p>
                          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-1">{Number(order.quantity_lbs||0).toLocaleString()} lbs</p>
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
