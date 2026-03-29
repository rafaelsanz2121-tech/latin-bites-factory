import type { UserRole } from "@/types"

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrator",
  supervisor: "Supervisor",
  qa: "Quality Assurance",
  operator: "Operator",
}

export const ROLE_COLORS: Record<UserRole, string> = {
  admin: "bg-purple-100 text-purple-800",
  supervisor: "bg-blue-100 text-blue-800",
  qa: "bg-green-100 text-green-800",
  operator: "bg-gray-100 text-gray-800",
}

// Permission matrix - what each role can do
export const PERMISSIONS = {
  admin: {
    create_log: true,
    edit_own_log: true,
    submit_log: true,
    verify_log: true,
    approve_log: true,
    flag_deviation: true,
    create_corrective_action: true,
    close_corrective_action: true,
    close_deviation: true,
    export_reports: true,
    manage_users: true,
    manage_settings: true,
    view_all_areas: true,
    reopen_locked: true,
  },
  supervisor: {
    create_log: true,
    edit_own_log: true,
    submit_log: true,
    verify_log: true,
    approve_log: false,
    flag_deviation: true,
    create_corrective_action: true,
    close_corrective_action: false,
    close_deviation: false,
    export_reports: true,
    manage_users: false,
    manage_settings: false,
    view_all_areas: true,
    reopen_locked: false,
  },
  qa: {
    create_log: true,
    edit_own_log: true,
    submit_log: true,
    verify_log: true,
    approve_log: true,
    flag_deviation: true,
    create_corrective_action: true,
    close_corrective_action: true,
    close_deviation: true,
    export_reports: true,
    manage_users: false,
    manage_settings: false,
    view_all_areas: true,
    reopen_locked: true,
  },
  operator: {
    create_log: true,
    edit_own_log: true,
    submit_log: true,
    verify_log: false,
    approve_log: false,
    flag_deviation: true,
    create_corrective_action: false,
    close_corrective_action: false,
    close_deviation: false,
    export_reports: false,
    manage_users: false,
    manage_settings: false,
    view_all_areas: false,
    reopen_locked: false,
  },
} as const

export type Permission = keyof (typeof PERMISSIONS)[UserRole]
