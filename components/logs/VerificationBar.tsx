"use client"

import { Button } from "@/components/ui/button"
import { canApproveLog, canVerifyLog } from "@/lib/rbac"
import type { LogStatus, UserRole } from "@/types"
import { CheckCircle2, Lock, ShieldCheck } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

interface VerificationBarProps {
  logId: string
  logType: string
  status: LogStatus
  createdById: string
  currentUserId: string
  currentUserRole: UserRole
  onVerify?: (id: string) => Promise<void>
  onApprove?: (id: string) => Promise<void>
  onReopen?: (id: string) => Promise<void>
}

export function VerificationBar({
  logId,
  logType,
  status,
  createdById,
  currentUserId,
  currentUserRole,
  onVerify,
  onApprove,
  onReopen,
}: VerificationBarProps) {
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [approveLoading, setApproveLoading] = useState(false)
  const [reopenLoading, setReopenLoading] = useState(false)

  const canVerify = canVerifyLog(currentUserRole, createdById, currentUserId)
  const canApprove = canApproveLog(currentUserRole, createdById, currentUserId)

  const handleVerify = async () => {
    if (!onVerify) return
    setVerifyLoading(true)
    try {
      await onVerify(logId)
      toast.success("Record verified successfully")
    } catch {
      toast.error("Failed to verify record")
    } finally {
      setVerifyLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!onApprove) return
    setApproveLoading(true)
    try {
      await onApprove(logId)
      toast.success("Record approved and locked")
    } catch {
      toast.error("Failed to approve record")
    } finally {
      setApproveLoading(false)
    }
  }

  const handleReopen = async () => {
    if (!onReopen) return
    setReopenLoading(true)
    try {
      await onReopen(logId)
      toast.success("Record reopened for editing")
    } catch {
      toast.error("Failed to reopen record")
    } finally {
      setReopenLoading(false)
    }
  }

  if (status === "draft") return null

  if (status === "locked") {
    return (
      <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
        <div className="flex items-center gap-2 text-slate-600">
          <Lock className="w-4 h-4" />
          <span className="text-sm font-medium">This record is locked. Editing is disabled.</span>
        </div>
        {(currentUserRole === "admin" || currentUserRole === "qa") && onReopen && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleReopen}
            loading={reopenLoading}
          >
            Reopen Record
          </Button>
        )}
      </div>
    )
  }

  if (status === "submitted" && canVerify && onVerify) {
    return (
      <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
        <div className="flex items-center gap-2 text-amber-700">
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-sm font-medium">This record is awaiting verification.</span>
        </div>
        <Button
          variant="warning"
          size="sm"
          onClick={handleVerify}
          loading={verifyLoading}
        >
          <CheckCircle2 className="w-4 h-4" />
          Verify Record
        </Button>
      </div>
    )
  }

  if (status === "verified" && canApprove && onApprove) {
    return (
      <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
        <div className="flex items-center gap-2 text-blue-700">
          <ShieldCheck className="w-4 h-4" />
          <span className="text-sm font-medium">This record has been verified. Ready for final approval.</span>
        </div>
        <Button
          variant="success"
          size="sm"
          onClick={handleApprove}
          loading={approveLoading}
        >
          <ShieldCheck className="w-4 h-4" />
          Approve & Lock
        </Button>
      </div>
    )
  }

  if (status === "approved") {
    return (
      <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-emerald-700">
        <ShieldCheck className="w-4 h-4" />
        <span className="text-sm font-medium">This record has been approved. Awaiting final lock.</span>
      </div>
    )
  }

  return null
}
