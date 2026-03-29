"use client"

import { Bell, LogOut, Menu, User } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import type { Profile } from "@/types"
import { ROLE_LABELS, ROLE_COLORS } from "@/constants/roles"
import { cn } from "@/lib/utils"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"

interface TopbarProps {
  profile: Profile
  onMenuToggle?: () => void
}

export function Topbar({ profile, onMenuToggle }: TopbarProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    toast.success("Signed out successfully")
    router.push("/login")
  }

  return (
    <header className="h-14 bg-white border-b border-[var(--border)] flex items-center px-4 gap-4 flex-shrink-0">
      {/* Menu toggle for mobile */}
      <button
        onClick={onMenuToggle}
        className="p-2 rounded-md hover:bg-[var(--muted)] transition-colors lg:hidden"
      >
        <Menu className="w-4 h-4" />
      </button>

      {/* Breadcrumb area */}
      <div className="flex-1" />

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Notifications — future feature */}
        <button className="relative p-2 rounded-md hover:bg-[var(--muted)] transition-colors">
          <Bell className="w-4 h-4 text-[var(--muted-foreground)]" />
        </button>

        {/* User menu */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-[var(--muted)] transition-colors text-sm">
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                {profile.initials}
              </div>
              <div className="hidden sm:block text-left">
                <p className="font-medium text-sm leading-none">{profile.full_name}</p>
                <p className={cn("text-xs mt-0.5 px-1.5 py-0.5 rounded-full inline-block", ROLE_COLORS[profile.role])}>
                  {ROLE_LABELS[profile.role]}
                </p>
              </div>
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="min-w-[200px] bg-white rounded-lg border border-[var(--border)] shadow-lg p-1 z-50"
              sideOffset={4}
              align="end"
            >
              <div className="px-3 py-2 border-b border-[var(--border)] mb-1">
                <p className="text-sm font-medium">{profile.full_name}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{profile.employee_id ? `ID: ${profile.employee_id}` : "Operator"}</p>
              </div>
              <DropdownMenu.Item asChild>
                <Link
                  href="/admin/settings"
                  className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-[var(--muted)] cursor-pointer outline-none"
                >
                  <User className="w-4 h-4" />
                  My Profile
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="h-px bg-[var(--border)] my-1" />
              <DropdownMenu.Item asChild>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-red-50 text-red-600 cursor-pointer outline-none w-full"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  )
}
