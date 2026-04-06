"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import {
  Bell, X, AlertTriangle, AlertCircle, Info,
  CheckCircle, Package, ClipboardList, RefreshCw,
  Boxes, ShieldAlert, Loader2,
} from "lucide-react"
import { useNotifications, type AppNotification, type NotifSeverity } from "./useNotifications"
import { cn } from "@/lib/utils"

/* ── Per-severity styles ──────────────────────────────────── */
const SEV: Record<NotifSeverity, {
  icon: React.ElementType
  dot: string
  badge: string
  bg: string
  border: string
  text: string
  iconColor: string
}> = {
  critical: {
    icon:      AlertCircle,
    dot:       "bg-red-500",
    badge:     "bg-red-500 text-white",
    bg:        "bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30",
    border:    "border-l-2 border-red-400",
    text:      "text-red-700 dark:text-red-300",
    iconColor: "text-red-500",
  },
  warning: {
    icon:      AlertTriangle,
    dot:       "bg-amber-400",
    badge:     "bg-amber-500 text-white",
    bg:        "bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30",
    border:    "border-l-2 border-amber-400",
    text:      "text-amber-700 dark:text-amber-300",
    iconColor: "text-amber-500",
  },
  info: {
    icon:      Info,
    dot:       "bg-blue-400",
    badge:     "bg-blue-500 text-white",
    bg:        "bg-slate-50 dark:bg-slate-700/40 hover:bg-slate-100 dark:hover:bg-slate-700/60",
    border:    "border-l-2 border-blue-400",
    text:      "text-slate-700 dark:text-slate-200",
    iconColor: "text-blue-500",
  },
}

/* ── Per-type icons ──────────────────────────────────────── */
const TYPE_ICON: Record<string, React.ElementType> = {
  capa_overdue:  ShieldAlert,
  deviation_open: AlertTriangle,
  order_ready:   CheckCircle,
  stock_low:     Boxes,
  stock_out:     Boxes,
  log_pending:   ClipboardList,
}

/* ── Section labels ──────────────────────────────────────── */
function sectionLabel(sev: NotifSeverity) {
  if (sev === "critical") return "🔴 Urgente"
  if (sev === "warning")  return "🟡 Requiere atención"
  return "🔵 Información"
}

export function NotificationBell() {
  const [open, setOpen]             = useState(false)
  const [dismissed, setDismissed]   = useState<Set<string>>(new Set())
  const dropdownRef                 = useRef<HTMLDivElement>(null)
  const { notifications, loading, refetch } = useNotifications()

  /* Load dismissed IDs from localStorage */
  useEffect(() => {
    try {
      const saved = localStorage.getItem("fo_dismissed_notifs")
      if (saved) setDismissed(new Set(JSON.parse(saved)))
    } catch {}
  }, [])

  /* Close on outside click */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  /* Close on Escape */
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [])

  function dismiss(id: string) {
    setDismissed((prev) => {
      const next = new Set(prev)
      next.add(id)
      try { localStorage.setItem("fo_dismissed_notifs", JSON.stringify([...next])) } catch {}
      return next
    })
  }

  function dismissAll() {
    const ids = visible.map((n) => n.id)
    setDismissed((prev) => {
      const next = new Set([...prev, ...ids])
      try { localStorage.setItem("fo_dismissed_notifs", JSON.stringify([...next])) } catch {}
      return next
    })
    setOpen(false)
  }

  const visible  = notifications.filter((n) => !dismissed.has(n.id))
  const critical = visible.filter((n) => n.severity === "critical")
  const warning  = visible.filter((n) => n.severity === "warning")
  const info     = visible.filter((n) => n.severity === "info")

  const count    = visible.length
  const hasCrit  = critical.length > 0

  /* Group into sections */
  const sections: { sev: NotifSeverity; items: AppNotification[] }[] = []
  if (critical.length) sections.push({ sev: "critical", items: critical })
  if (warning.length)  sections.push({ sev: "warning",  items: warning  })
  if (info.length)     sections.push({ sev: "info",     items: info     })

  return (
    <div className="relative" ref={dropdownRef}>

      {/* ── Bell button ──────────────────────────────────── */}
      <button
        onClick={() => { setOpen((v) => !v); if (!open) refetch() }}
        className={cn(
          "relative p-2 rounded-lg transition-colors",
          open
            ? "bg-slate-100 dark:bg-white/[0.1]"
            : "hover:bg-slate-100 dark:hover:bg-white/[0.08]"
        )}
        aria-label={`Notificaciones${count > 0 ? ` — ${count} activas` : ""}`}
        title="Notificaciones"
      >
        <Bell className={cn(
          "w-4 h-4 transition-colors",
          hasCrit ? "text-red-500" : count > 0 ? "text-amber-500" : "text-slate-600 dark:text-slate-400"
        )} />

        {/* Badge */}
        {count > 0 && (
          <span className={cn(
            "absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center leading-none",
            hasCrit ? "bg-red-500 text-white animate-pulse" : "bg-amber-500 text-white"
          )}>
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {/* ── Dropdown panel ───────────────────────────────── */}
      {open && (
        <div className="absolute right-0 mt-2 w-[360px] max-h-[520px] flex flex-col bg-[var(--surface-1)] rounded-2xl border border-[var(--border-subtle)] shadow-2xl shadow-black/20 z-50 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] flex-shrink-0">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span className="text-[13px] font-bold text-[var(--text-primary)]">Notificaciones</span>
              {count > 0 && (
                <span className={cn(
                  "text-[10px] font-black px-1.5 py-0.5 rounded-full",
                  hasCrit ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                )}>
                  {count}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => { refetch() }}
                className="p-1.5 rounded-lg hover:bg-[var(--surface-3)] transition-colors"
                title="Actualizar"
              >
                <RefreshCw className={cn("w-3.5 h-3.5 text-slate-600 dark:text-slate-400", loading && "animate-spin")} />
              </button>
              {count > 0 && (
                <button
                  onClick={dismissAll}
                  className="px-2 py-1 text-[10.5px] font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-[var(--surface-3)] rounded-lg transition-colors"
                >
                  Limpiar todo
                </button>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-10 gap-2 text-slate-600 dark:text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Cargando…</span>
              </div>
            ) : visible.length === 0 ? (
              <div className="flex flex-col items-center py-12">
                <div className="w-12 h-12 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center mb-3">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                </div>
                <p className="text-sm font-bold text-[var(--text-primary)]">Todo en orden</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">Sin alertas activas en este momento</p>
              </div>
            ) : (
              sections.map(({ sev, items }) => {
                const s = SEV[sev]
                return (
                  <div key={sev}>
                    {/* Section header */}
                    <p className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] bg-[var(--surface-2)] border-b border-[var(--border-subtle)]">
                      {sectionLabel(sev)} · {items.length}
                    </p>

                    {items.map((notif) => {
                      const Icon = TYPE_ICON[notif.type] ?? s.icon
                      return (
                        <div key={notif.id} className={cn("group relative flex items-start gap-3 px-4 py-3 transition-colors", s.bg, s.border)}>
                          {/* Icon */}
                          <div className="w-7 h-7 rounded-lg bg-white/70 dark:bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Icon className={cn("w-3.5 h-3.5", s.iconColor)} />
                          </div>

                          {/* Content */}
                          <Link
                            href={notif.href}
                            onClick={() => setOpen(false)}
                            className="flex-1 min-w-0"
                          >
                            <p className={cn("text-[12.5px] font-bold leading-tight", s.text)}>
                              {notif.title}
                            </p>
                            <p className="text-[11.5px] text-[var(--text-muted)] mt-0.5 leading-snug line-clamp-2">
                              {notif.description}
                            </p>
                            {notif.createdAt && (
                              <p className="text-[10px] text-[var(--text-muted)] mt-1">
                                {new Date(notif.createdAt + (notif.createdAt.length === 10 ? "T12:00:00" : "")).toLocaleDateString("es-US", {
                                  day: "2-digit", month: "short", year: "numeric",
                                })}
                              </p>
                            )}
                          </Link>

                          {/* Dismiss */}
                          <button
                            onClick={() => dismiss(notif.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-all flex-shrink-0"
                            title="Descartar"
                          >
                            <X className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          {visible.length > 0 && (
            <div className="px-4 py-2.5 border-t border-[var(--border-subtle)] flex-shrink-0 bg-[var(--surface-2)]">
              <p className="text-[10.5px] text-[var(--text-muted)] text-center">
                Actualiza automáticamente cada 60 s · {new Date().toLocaleTimeString("es-US", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
