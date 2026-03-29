"use client"

import { VerificationBar } from "@/components/logs/VerificationBar"
import { createClient } from "@/lib/supabase/client"
import type { LogStatus, UserRole } from "@/types"
import { useRouter } from "next/navigation"

interface Props {
  log: {
    id: string
    status: LogStatus
    created_by: string
  }
  tableName: string
  currentUserId: string
  currentUserRole: UserRole
}

export function GenericActionButtons({ log, tableName, currentUserId, currentUserRole }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const handleVerify = async (id: string) => {
    const { error } = await supabase
      .from(tableName)
      .update({ status: "verified", verified_by: currentUserId, verified_at: new Date().toISOString() })
      .eq("id", id)
      .neq("created_by", currentUserId)
    if (error) throw error
    router.refresh()
  }

  const handleApprove = async (id: string) => {
    const { error } = await supabase
      .from(tableName)
      .update({ status: "locked", approved_by: currentUserId, approved_at: new Date().toISOString(), locked_at: new Date().toISOString() })
      .eq("id", id)
    if (error) throw error
    router.refresh()
  }

  const handleReopen = async (id: string) => {
    const { error } = await supabase
      .from(tableName)
      .update({ status: "reopened", locked_at: null })
      .eq("id", id)
    if (error) throw error
    router.refresh()
  }

  return (
    <VerificationBar
      logId={log.id}
      logType={tableName}
      status={log.status}
      createdById={log.created_by}
      currentUserId={currentUserId}
      currentUserRole={currentUserRole}
      onVerify={handleVerify}
      onApprove={handleApprove}
      onReopen={handleReopen}
    />
  )
}
