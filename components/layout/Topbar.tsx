"use client"

import { LogOut, Menu, Settings, ChevronRight, Zap, Sun, Moon, Building2 } from "lucide-react"
import { NotificationBell } from "@/components/notifications/NotificationBell"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import type { Profile } from "@/types"
import { ROLE_LABELS, ROLE_COLORS } from "@/constants/roles"
import { cn } from "@/lib/utils"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

/* ── Breadcrumb mapping ─────────────────────────────────── */
const ROUTE_LABELS: Record<string, string> = {
  dashboard:            "Dashboard",
  receiving:            "Recepción",
  thawing:              "Descongelado",
  cooking:              "Cocción / CCP",
  calibration:          "Calibración",
  sanitation:           "Sanitación",
  operational:          "Operacional",
  preop:                "Pre-Op",
  preshipment:          "Pre-Embarque",
  deviations:           "Desviaciones",
  "corrective-actions": "Acciones CAPA",
  reports:              "Reportes",
  production:           "Producción",
  lots:                 "Lotes MP",
  clients:              "Clientes",
  admin:                "Admin",
  users:                "Usuarios",
  settings:             "Configuración",
  new:                  "Nuevo",
  nuevo:                "Nuevo",
  costos:               "Costos",
  inventario:           "Inventario",
  horas:                "Control de Horas",
  finanzas:             "Finanzas",
  listeria:             "Listeria",
  capacitacion:         "Capacitación",
  "metal-detector":     "Det. de Metales",
  proveedores:          "Proveedores",
  despacho:             "Despacho",
  alergenos:            "Alérgenos",
  plagas:               "Control de Plagas",
  recall:               "Mock Recall",
  "agua-retenida":      "Agua Retenida",
  "agua-potable":       "Agua Potable",
  "auditoria-interna":  "Auditoría HACCP",
  "salud-personal":     "Salud Personal",
  "box-tracker":        "Control de Cajas",
}

const ROLE_DOT: Record<string, string> = {
  admin:      "bg-red-500",
  supervisor: "bg-amber-400",
  qa:         "bg-blue-500",
  operator:   "bg-emerald-500",
}

const AVATAR_GRADIENT: Record<string, string> = {
  admin:      "from-red-600 to-red-800",
  supervisor: "from-amber-500 to-amber-700",
  qa:         "from-blue-600 to-blue-800",
  operator:   "from-emerald-600 to-emerald-800",
}

interface TopbarProps {
  profile: Profile
  onMenuToggle?: () => void
}

export function Topbar({ profile, onMenuToggle }: TopbarProps) {
  const router   = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    toast.success("Sesión cerrada")
    router.push("/login")
  }

  /* Build breadcrumb segments from pathname */
  const segments = pathname
    .split("/")
    .filter(Boolean)
    .filter((s) => !s.match(/^[0-9a-f-]{36}$/i)) // skip UUIDs
    .map((s) => ({ raw: s, label: ROUTE_LABELS[s] ?? s }))

  const initials = profile.initials || profile.full_name?.slice(0, 2).toUpperCase() || "??"
  const avatarGradient = AVATAR_GRADIENT[profile.role] ?? "from-slate-600 to-slate-800"

  return (
    <header className="h-14 bg-white dark:bg-[#080e1c] border-b border-slate-100 dark:border-white/[0.06] flex items-center px-4 gap-3 flex-shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:shadow-none">

      {/* ── Mobile menu toggle ────────────────────────── */}
      <button
        onClick={onMenuToggle}
        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors lg:hidden text-slate-500 dark:text-slate-400"
        aria-label="Menu"
      >
        <Menu className="w-[18px] h-[18px]" />
      </button>

      {/* ── Mobile logo (hidden on desktop where sidebar shows logo) ── */}
      <Link
        href="/dashboard"
        className="flex items-center gap-2 lg:hidden flex-shrink-0"
      >
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow shadow-red-900/30">
          <Zap className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="font-black text-sm text-slate-800 dark:text-white tracking-tight">
          Factor<span className="text-red-500">OS</span>
        </span>
      </Link>

      {/* ── Breadcrumb (hidden on mobile) ────────────────── */}
      <nav className="sm:flex items-center gap-1 flex-1 min-w-0 hidden">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-slate-400 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors flex-shrink-0"
        >
          <Zap className="w-3.5 h-3.5" />
          <span className="text-[11.5px] font-bold tracking-tight hidden lg:block">FactorOS</span>
        </Link>
        {segments.map((seg, i) => (
          <span key={i} className="flex items-center gap-1 min-w-0">
            <ChevronRight className="w-3 h-3 text-slate-200 dark:text-slate-700 flex-shrink-0" />
            <span className={cn(
              "truncate",
              i === segments.length - 1
                ? "text-[13px] font-semibold text-slate-800 dark:text-slate-100"
                : "text-[12px] font-medium text-slate-400 dark:text-slate-500"
            )}>
              {seg.label}
            </span>
          </span>
        ))}
      </nav>

      {/* ── Spacer on mobile ─────────────────────────── */}
      <div className="flex-1 sm:hidden" />

      {/* ── Right side ───────────────────────────────── */}
      <div className="flex items-center gap-1 flex-shrink-0">

        {/* Org name pill — desktop only */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/[0.07] bg-slate-50 dark:bg-white/[0.03] mr-1">
          <Building2 className="w-3 h-3 text-slate-400 dark:text-slate-500 flex-shrink-0" />
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">Latin Bites Factory</span>
        </div>

        {/* Live indicator — large screens */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/40 mr-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10.5px] font-semibold text-emerald-700 dark:text-emerald-400">En línea</span>
        </div>

        {/* Theme toggle */}
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors text-slate-500 dark:text-slate-400"
            aria-label="Cambiar tema"
            title={theme === "dark" ? "Modo diurno" : "Modo nocturno"}
          >
            {theme === "dark"
              ? <Sun className="w-4 h-4 text-amber-400" />
              : <Moon className="w-4 h-4" />
            }
          </button>
        )}

        {/* Notifications */}
        <NotificationBell />

        {/* Divider */}
        <div className="w-px h-5 bg-slate-200 dark:bg-white/[0.08] mx-1.5" />

        {/* User menu */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center gap-2 pl-1 pr-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors outline-none">
              {/* Avatar with role ring */}
              <div className="relative">
                <div className={cn(
                  "w-7 h-7 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-[11px] font-bold shadow-sm ring-2 ring-white dark:ring-[#080e1c]",
                  avatarGradient
                )}>
                  {initials}
                </div>
                <span className={cn(
                  "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#080e1c]",
                  ROLE_DOT[profile.role] ?? "bg-slate-400"
                )} />
              </div>
              {/* Name + role label */}
              <div className="hidden sm:block text-left">
                <p className="text-[12px] font-semibold text-slate-800 dark:text-slate-100 leading-tight">{profile.full_name}</p>
                <p className={cn("text-[10px] font-semibold leading-tight mt-0.5", ROLE_COLORS[profile.role])}>
                  {ROLE_LABELS[profile.role]}
                </p>
              </div>
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="min-w-[240px] bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-white/[0.07] shadow-xl shadow-black/10 dark:shadow-black/40 p-1.5 z-50 animate-in fade-in-0 zoom-in-95"
              sideOffset={6}
              align="end"
            >
              {/* User info header */}
              <div className="px-3 py-3 mb-1 border-b border-slate-100 dark:border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white text-sm font-bold shadow",
                    avatarGradient
                  )}>
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100 truncate">{profile.full_name}</p>
                    <p className={cn("text-[11px] font-semibold mt-0.5", ROLE_COLORS[profile.role])}>
                      {ROLE_LABELS[profile.role]}
                    </p>
                    {profile.employee_id && (
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">ID: {profile.employee_id}</p>
                    )}
                  </div>
                </div>
              </div>

              <DropdownMenu.Item asChild>
                <Link
                  href="/admin/settings"
                  className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.05] cursor-pointer outline-none transition-colors"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  Mi Perfil
                </Link>
              </DropdownMenu.Item>

              <DropdownMenu.Separator className="h-px bg-slate-100 dark:bg-white/[0.06] my-1" />

              <DropdownMenu.Item asChild>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-red-500 dark:text-red-400 cursor-pointer outline-none w-full transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Cerrar sesión
                </button>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  )
}
