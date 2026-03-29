"use client"

import { cn } from "@/lib/utils"
import type { UserRole } from "@/types"
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  Briefcase,
  CheckSquare,
  ChevronDown,
  ClipboardList,
  Factory,
  FlaskConical,
  Flame,
  LayoutDashboard,
  Package,
  Settings,
  ShieldCheck,
  Snowflake,
  Truck,
  Users,
  Wrench,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"

interface NavItem {
  label: string
  href?: string
  icon: React.ElementType
  roles?: UserRole[]
  children?: { label: string; href: string; roles?: UserRole[] }[]
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Receiving",
    href: "/receiving",
    icon: Truck,
  },
  {
    label: "Thawing",
    href: "/thawing",
    icon: Snowflake,
  },
  {
    label: "Cooking & Chilling",
    href: "/cooking",
    icon: Flame,
  },
  {
    label: "Calibration",
    href: "/calibration",
    icon: FlaskConical,
  },
  {
    label: "Sanitation",
    icon: CheckSquare,
    children: [
      { label: "Operational", href: "/sanitation/operational" },
      { label: "Pre-Op Report", href: "/sanitation/preop" },
    ],
  },
  {
    label: "Pre-Shipment",
    href: "/preshipment",
    icon: Package,
    roles: ["admin", "supervisor", "qa"],
  },
  {
    label: "Deviations",
    href: "/deviations",
    icon: AlertTriangle,
  },
  {
    label: "Corrective Actions",
    href: "/corrective-actions",
    icon: Wrench,
    roles: ["admin", "supervisor", "qa"],
  },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
    roles: ["admin", "supervisor", "qa"],
  },
  {
    label: "Production",
    icon: Factory,
    roles: ["admin", "supervisor", "qa", "operator"],
    children: [
      { label: "Orders", href: "/production" },
      { label: "Raw Material Lots", href: "/lots" },
      { label: "Clients", href: "/clients", roles: ["admin", "supervisor"] },
    ],
  },
  {
    label: "Admin",
    icon: ShieldCheck,
    roles: ["admin"],
    children: [
      { label: "Users", href: "/admin/users", roles: ["admin"] },
      { label: "Settings", href: "/admin/settings", roles: ["admin"] },
    ],
  },
]

interface SidebarProps {
  role: UserRole
  collapsed?: boolean
}

export function Sidebar({ role, collapsed = false }: SidebarProps) {
  const pathname = usePathname()
  const STORAGE_KEY = "lb_sidebar_groups"
  const DEFAULT_GROUPS = ["Sanitation", "Production"]

  const [openGroups, setOpenGroups] = useState<string[]>(DEFAULT_GROUPS)

  // Restore persisted state on mount (client only)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setOpenGroups(JSON.parse(saved))
    } catch {}
  }, [])

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => {
      const next = prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label]
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }

  const isAllowed = (roles?: UserRole[]) => {
    if (!roles) return true
    return roles.includes(role)
  }

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard"
    return pathname.startsWith(href)
  }

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-[var(--sidebar)] text-[var(--sidebar-foreground)] transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-[var(--sidebar-border)]">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
          <Factory className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div>
            <p className="font-bold text-sm text-white leading-tight">Latin Bites</p>
            <p className="text-xs text-[var(--sidebar-muted)]">Factory Operations</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {navItems.map((item) => {
          if (!isAllowed(item.roles)) return null

          if (item.children) {
            const isGroupOpen = openGroups.includes(item.label)
            const hasActiveChild = item.children.some((c) => isActive(c.href))

            return (
              <div key={item.label}>
                <button
                  onClick={() => toggleGroup(item.label)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    hasActiveChild
                      ? "bg-[var(--sidebar-accent)] text-white"
                      : "text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-white"
                  )}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronDown
                        className={cn(
                          "w-3.5 h-3.5 transition-transform",
                          isGroupOpen && "rotate-180"
                        )}
                      />
                    </>
                  )}
                </button>
                {!collapsed && isGroupOpen && (
                  <div className="mt-0.5 ml-4 pl-3 border-l border-[var(--sidebar-border)] space-y-0.5">
                    {item.children.map((child) => {
                      if (!isAllowed(child.roles)) return null
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            "flex items-center px-3 py-1.5 rounded-md text-sm transition-colors",
                            isActive(child.href)
                              ? "bg-blue-600 text-white font-medium"
                              : "text-[var(--sidebar-muted)] hover:text-white hover:bg-[var(--sidebar-accent)]"
                          )}
                        >
                          {child.label}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href!}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive(item.href!)
                  ? "bg-blue-600 text-white"
                  : "text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-white"
              )}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-[var(--sidebar-border)]">
          <div className="flex items-center gap-2 text-xs text-[var(--sidebar-muted)]">
            <ClipboardList className="w-3.5 h-3.5" />
            <span>EST No. M/P2643</span>
          </div>
        </div>
      )}
    </aside>
  )
}
