"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { Sidebar } from "./Sidebar"
import { Topbar } from "./Topbar"
import { cn } from "@/lib/utils"
import type { Profile, UserRole } from "@/types"

interface Props {
  profile: Profile
  children: React.ReactNode
}

export function AppShell({ profile, children }: Props) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Close sidebar on route change (mobile UX)
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  // Close sidebar on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false)
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[#0a0f1e]">

      {/* ── Mobile backdrop ────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ───────────────────────────────────── */}
      <div
        className={cn(
          // On mobile: fixed overlay, slides in/out
          "fixed inset-y-0 left-0 z-30 transition-transform duration-300 ease-in-out",
          // On desktop: static, always visible
          "lg:static lg:translate-x-0 lg:z-auto",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Sidebar role={profile.role as UserRole} />
      </div>

      {/* ── Main area ─────────────────────────────────── */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        {/* Sticky top bar */}
        <Topbar
          profile={profile}
          onMenuToggle={() => setSidebarOpen((prev) => !prev)}
        />
        {/* Scrollable content area */}
        <main className="flex-1 overflow-y-auto">
          <div className="px-4 md:px-6 py-6 max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
