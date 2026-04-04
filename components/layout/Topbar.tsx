"use client"

import { LogOut, Menu, Settings, ChevronRight, Zap, Sun, Moon } from "lucide-react"
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
  dashboard:          "Dashboard",
  receiving:          "Recepción",
  thawing:            "Descongelado",
  cooking:            "Cocción / CCP",
  calibration:        "Calibración",
  sanitation:         "Sanitación",
  operational:        "Operacional",
  preop:              "Pre-Op",
  preshipment:        "Pre-Embarque",
  deviations:         "Desviaciones",
  "corrective-actions": "Acciones CAPA",
  reports:            "Reportes",
  production:         "Producción",
  lots:               "Lotes MP",
  clients:            "Clientes",
  admin:              "Admin",
  users:              "Usuarios",
  settings:           "Configuración",
  new:                "Nuevo",
  costos:             "Costos",
  inventario:         "Inventario",
  horas:              "Control de Horas",
  finanzas:           "Finanzas",
}

const ROLE_DOT: Record<string, string> = {
  admin:      "bg-red-500",
  supervisor: "bg-amber-400",
  qa:         "bg-blue-500",
  operator:   "bg-green-500",
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

  return (
    <header className="h-14 bg-[var(--topbar-bg)] backdrop-blur-sm border-b border-[var(--topbar-border)] flex items-center px-4 gap-3 flex-shrink-0 shadow-[0_1px_0_0_rgba(0,0,0,0.04)]">

      {/* ── Mobile menu toggle ────────────────────────── */}
      <button
        onClick={onMenuToggle}
        className="p-2 rounded-lg hover:bg-slate-100 transition-colors lg:hidden text-slate-500"
        aria-label="Menu"
      >
        <Menu className="w-4 h-4" />
      </button>

      {/* ── Breadcrumb ───────────────────────────────── */}
      <nav className="flex items-center gap-1 flex-1 min-w-0">
        <Link href="/dashboard" className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 transition-colors flex-shrink-0">
          <Zap className="w-3.5 h-3.5 text-red-500" />
          <span className="text-[12px] font-semibold text-red-500 hidden sm:block">FactorOS</span>
        </Link>
        {segments.map((seg, i) => (
          <span key={i} className="flex items-center gap-1 min-w-0">
            <ChevronRight className="w-3 h-3 text-slate-300 flex-shrink-0" />
            <span className={cn(
              "text-[12.5px] font-medium truncate",
              i === segments.length - 1 ? "text-slate-700" : "text-slate-400"
            )}>
              {seg.label}
            </span>
          </span>
        ))}
      </nav>

      {/* ── Right side ───────────────────────────────── */}
      <div className="flex items-center gap-1.5 flex-shrink-0">

        {/* Live indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-green-50 rounded-full border border-green-100 mr-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10.5px] font-semibold text-green-700">Sistema activo</span>
        </div>

        {/* Theme toggle */}
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors"
            aria-label="Cambiar tema"
            title={theme === "dark" ? "Modo diurno" : "Modo nocturno"}
          >
            {theme === "dark"
              ? <Sun className="w-4 h-4 text-amber-400" />
              : <Moon className="w-4 h-4 text-slate-400" />
            }
          </button>
        )}

        {/* Notifications */}
        <NotificationBell />

        {/* User menu */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors">
              {/* Avatar */}
              <div className="relative">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white text-[11px] font-bold shadow-sm">
                  {initials}
                </div>
                <span className={cn(
                  "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white",
                  ROLE_DOT[profile.role] ?? "bg-slate-400"
                )} />
              </div>
              {/* Name + role */}
              <div className="hidden sm:block text-left">
                <p className="text-[12px] font-semibold text-slate-700 leading-tight">{profile.full_name}</p>
                <p className={cn("text-[10px] font-medium leading-tight mt-0.5", ROLE_COLORS[profile.role])}>
                  {ROLE_LABELS[profile.role]}
                </p>
              </div>
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="min-w-[220px] bg-[var(--surface-1)] rounded-xl border border-[var(--border-subtle)] shadow-xl shadow-black/20 p-1.5 z-50 animate-in fade-in-0 zoom-in-95"
              sideOffset={6}
              align="end"
            >
              {/* User info */}
              <div className="px-3 py-2.5 border-b border-[var(--border-subtle)] mb-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white text-xs font-bold">
                    {initials}
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-[var(--text-primary)]">{profile.full_name}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">{profile.employee_id ? `ID: ${profile.employee_id}` : "Sin ID"}</p>
                  </div>
                </div>
              </div>

              <DropdownMenu.Item asChild>
                <Link
                  href="/admin/settings"
                  className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--surface-3)] cursor-pointer outline-none transition-colors"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-400" />
                  Mi Perfil
                </Link>
              </DropdownMenu.Item>

              <DropdownMenu.Separator className="h-px bg-[var(--border-subtle)] my-1" />

              <DropdownMenu.Item asChild>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-lg hover:bg-red-50 text-red-500 cursor-pointer outline-none w-full transition-colors"
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
