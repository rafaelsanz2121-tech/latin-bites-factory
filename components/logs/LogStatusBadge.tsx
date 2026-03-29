import { cn } from "@/lib/utils"
import type { LogStatus } from "@/types"
import { CheckCircle2, Clock, FileEdit, Lock, RotateCcw, ShieldCheck } from "lucide-react"

const STATUS_CONFIG: Record<
  LogStatus,
  { label: string; className: string; icon: React.ElementType }
> = {
  draft: {
    label: "Draft",
    className: "bg-gray-100 text-gray-700 border-gray-200",
    icon: FileEdit,
  },
  submitted: {
    label: "Submitted",
    className: "bg-amber-100 text-amber-700 border-amber-200",
    icon: Clock,
  },
  verified: {
    label: "Verified",
    className: "bg-blue-100 text-blue-700 border-blue-200",
    icon: CheckCircle2,
  },
  approved: {
    label: "Approved",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: ShieldCheck,
  },
  locked: {
    label: "Locked",
    className: "bg-slate-100 text-slate-600 border-slate-200",
    icon: Lock,
  },
  reopened: {
    label: "Reopened",
    className: "bg-orange-100 text-orange-700 border-orange-200",
    icon: RotateCcw,
  },
}

interface LogStatusBadgeProps {
  status: LogStatus
  className?: string
  showIcon?: boolean
}

export function LogStatusBadge({ status, className, showIcon = true }: LogStatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  const Icon = config.icon

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border",
        config.className,
        className
      )}
    >
      {showIcon && <Icon className="w-3 h-3" />}
      {config.label}
    </span>
  )
}
