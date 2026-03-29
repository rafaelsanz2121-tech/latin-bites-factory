import { PERMISSIONS, type Permission } from "@/constants/roles"
import type { UserRole } from "@/types"

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return PERMISSIONS[role]?.[permission] ?? false
}

export function canVerifyLog(role: UserRole, createdById: string, currentUserId: string): boolean {
  return hasPermission(role, "verify_log") && createdById !== currentUserId
}

export function canApproveLog(role: UserRole, createdById: string, currentUserId: string): boolean {
  return hasPermission(role, "approve_log") && createdById !== currentUserId
}

export function isLogEditable(status: string, createdById: string, currentUserId: string, role: UserRole): boolean {
  if (status === "locked") {
    return hasPermission(role, "reopen_locked")
  }
  if (status === "draft") {
    return createdById === currentUserId || role === "admin"
  }
  return role === "admin" || role === "qa"
}
