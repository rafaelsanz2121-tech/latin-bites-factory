"use client"

import { cn } from "@/lib/utils"
import type { UserRole } from "@/types"
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  Brain,
  Building2,
  Bug,
  CheckSquare,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  Droplets,
  Factory,
  FlaskConical,
  Flame,
  GraduationCap,
  Heart,
  LayoutDashboard,
  Microscope,
  Package,
  RotateCcw,
  Scale,
  Send,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Snowflake,
  Truck,
  Users,
  Wrench,
  Timer,
  DollarSign,
  TrendingUp,
  Zap,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"

type NavChild = { label: string; href: string; roles?: UserRole[] }

interface NavSection {
  label: string
  roles?: UserRole[]
  items: {
    label: string
    href?: string
    icon: React.ElementType
    roles?: UserRole[]
    badge?: string
    badgeColor?: string
    children?: NavChild[]
  }[]
}

const navSections: NavSection[] = [
  {
    label: "PRINCIPAL",
    items: [
      { label: "Dashboard",  href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "COMPLIANCE HACCP",
    items: [
      { label: "Recepción",       href: "/receiving",   icon: Truck },
      { label: "Descongelado",    href: "/thawing",     icon: Snowflake },
      { label: "Cocción / CCP",   href: "/cooking",     icon: Flame },
      { label: "Calibración",     href: "/calibration", icon: FlaskConical },
      {
        label: "Sanitación",
        icon: CheckSquare,
        children: [
          { label: "Operacional", href: "/sanitation/operational" },
          { label: "Pre-Op",      href: "/sanitation/preop" },
        ],
      },
      {
        label: "Pre-Embarque",
        href: "/preshipment",
        icon: Package,
        roles: ["admin", "supervisor", "qa"],
      },
      { label: "Listeria",         href: "/listeria",        icon: Microscope,    roles: ["admin","supervisor","qa"] },
      { label: "Capacitación",    href: "/capacitacion",   icon: GraduationCap                                       },
      { label: "Det. de Metales", href: "/metal-detector", icon: Zap                                                 },
      { label: "Proveedores",     href: "/proveedores",    icon: Building2,     roles: ["admin","supervisor","qa"]    },
      { label: "Despacho",        href: "/despacho",       icon: Send                                                },
      { label: "Alérgenos",       href: "/alergenos",      icon: ShieldAlert                                         },
      { label: "Plagas",          href: "/plagas",         icon: Bug                                                 },
      { label: "Recall",          href: "/recall",         icon: RotateCcw,     roles: ["admin","supervisor","qa"]    },
      { label: "Agua Retenida",   href: "/agua-retenida",  icon: Droplets,      roles: ["admin","supervisor","qa"]    },
      { label: "Agua Potable",    href: "/agua-potable",   icon: Droplets,                                            },
      { label: "Auditoría HACCP", href: "/auditoria-interna", icon: ClipboardCheck, roles: ["admin","supervisor","qa"] },
      { label: "Salud Personal",  href: "/salud-personal", icon: Heart,                                               },
    ],
  },
  {
    label: "OPERACIONES",
    items: [
      {
        label: "Centro de Producción",
        icon: Factory,
        badge: "NEW",
        badgeColor: "gold",
        children: [
          { label: "🏭 Producción Live",  href: "/produccion" },
          { label: "⚖️ Control de Cajas", href: "/box-tracker" },
          { label: "📋 Órdenes",          href: "/production" },
          { label: "📦 Lotes MP",         href: "/lots" },
          { label: "👥 Clientes",         href: "/clients", roles: ["admin", "supervisor"] },
        ],
      },
      {
        label: "IA de Producción",
        href: "/produccion/configuracion",
        icon: Brain,
        roles: ["admin"],
        badge: "AI",
        badgeColor: "gold",
      },
    ],
  },
  {
    label: "CONTROL",
    items: [
      { label: "Desviaciones",     href: "/deviations",         icon: AlertTriangle },
      { label: "Acciones CAPA",    href: "/corrective-actions", icon: Wrench, roles: ["admin","supervisor","qa"] },
      { label: "Reportes",         href: "/reports",            icon: BarChart3,   roles: ["admin","supervisor","qa"] },
    ],
  },
  {
    label: "EMPRESA",
    items: [
      { label: "Costos",     href: "/costos",     icon: DollarSign },
      { label: "Inventario", href: "/inventario", icon: Boxes      },
      { label: "Horas MOD",  href: "/horas",      icon: Timer      },
      { label: "Finanzas",   href: "/finanzas",   icon: TrendingUp },
    ],
  },
  {
    label: "ADMIN",
    roles: ["admin"],
    items: [
      { label: "Usuarios",      href: "/admin/users",     icon: Users,      roles: ["admin"] },
      { label: "Configuración", href: "/admin/settings",  icon: Settings,   roles: ["admin"] },
    ],
  },
]

interface SidebarProps {
  role: UserRole
  orgName?: string
  estNumber?: string
}

export function Sidebar({ role, orgName = "Latin Bites Factory", estNumber = "M/P2643" }: SidebarProps) {
  const pathname = usePathname()
  const STORAGE_KEY = "fo_sidebar_groups"

  const [openGroups, setOpenGroups] = useState<string[]>(["Sanitación", "Producción"])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setOpenGroups(JSON.parse(saved))
    } catch {}
  }, [])

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => {
      const next = prev.includes(label)
        ? prev.filter((g) => g !== label)
        : [...prev, label]
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }

  const isAllowed = (roles?: UserRole[]) => !roles || roles.includes(role)

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard"
    return pathname.startsWith(href)
  }

  const hasActiveChild = (children: NavChild[]) =>
    children.some((c) => isActive(c.href))

  return (
    <aside className="flex flex-col h-full w-64 bg-[#080e1c] text-slate-300">

      {/* ── Logo ───────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06]">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg shadow-red-900/40">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="font-black text-sm text-white leading-none tracking-tight">
            Factor<span className="text-red-500">OS</span>
          </p>
          <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5 font-medium">EST {estNumber}</p>
        </div>
      </div>

      {/* ── Navigation ─────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0 scrollbar-thin">
        {navSections.map((section) => {
          if (!isAllowed(section.roles)) return null

          const visibleItems = section.items.filter((item) => isAllowed(item.roles))
          if (visibleItems.length === 0) return null

          return (
            <div key={section.label} className="mb-1">
              {/* Section label */}
              <p className="text-[9.5px] font-bold tracking-[1.8px] text-slate-600 px-3 py-2 mt-1 uppercase select-none">
                {section.label}
              </p>

              {visibleItems.map((item) => {
                /* ─ Group with children ─ */
                if (item.children) {
                  const open = openGroups.includes(item.label)
                  const active = hasActiveChild(item.children)
                  const allowedChildren = item.children.filter((c) => isAllowed(c.roles))

                  return (
                    <div key={item.label}>
                      <button
                        onClick={() => toggleGroup(item.label)}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150",
                          active
                            ? "text-white bg-white/[0.06] border-l-2 border-red-500 pl-[10px]"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                        )}
                      >
                        <item.icon className={cn("w-[15px] h-[15px] flex-shrink-0", active ? "text-red-400" : "text-slate-600 dark:text-slate-400")} />
                        <span className="flex-1 text-left">{item.label}</span>
                        <ChevronDown
                          className={cn(
                            "w-3.5 h-3.5 text-slate-600 transition-transform duration-200",
                            open && "rotate-180"
                          )}
                        />
                      </button>

                      {open && (
                        <div className="mt-0.5 ml-[22px] pl-3 border-l border-white/[0.06] space-y-0.5 mb-1">
                          {allowedChildren.map((child) => (
                            <Link
                              key={child.href}
                              href={child.href}
                              className={cn(
                                "flex items-center px-3 py-1.5 rounded-md text-[12.5px] transition-all duration-150",
                                isActive(child.href)
                                  ? "text-white font-semibold bg-red-500/10 border-l-2 border-red-500 pl-2.5"
                                  : "text-slate-600 dark:text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                              )}
                            >
                              {child.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                }

                /* ─ Single link ─ */
                const active = isActive(item.href!)
                return (
                  <Link
                    key={item.href}
                    href={item.href!}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 group",
                      active
                        ? "text-white bg-white/[0.07] border-l-2 border-red-500 pl-[10px]"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                    )}
                  >
                    <item.icon className={cn("w-[15px] h-[15px] flex-shrink-0 transition-colors", active ? "text-red-400" : "text-slate-600 dark:text-slate-400 group-hover:text-slate-400")} />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className={cn(
                        "text-[9px] font-bold px-1.5 py-0.5 rounded-full tracking-wide",
                        item.badgeColor === "gold"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-red-500/10 text-red-400 border border-red-500/20"
                      )}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* ── Footer ─────────────────────────────────────── */}
      <div className="px-4 py-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10.5px] text-slate-600 font-medium truncate">{orgName}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <ClipboardList className="w-3 h-3 text-slate-700" />
          <span className="text-[10px] text-slate-700">EST No. {estNumber} · USDA Inspeccionado</span>
        </div>
      </div>
    </aside>
  )
}
