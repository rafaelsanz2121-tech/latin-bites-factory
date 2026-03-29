import { cn } from "@/lib/utils"
import { formatDateTime } from "@/lib/utils"
import type { LogStatus, Profile } from "@/types"
import { CheckCircle2, Lock, ShieldCheck, UserCheck } from "lucide-react"

interface SignatureBlockProps {
  status: LogStatus
  creator?: Partial<Profile> | null
  submittedAt?: string | null
  verifier?: Partial<Profile> | null
  verifiedAt?: string | null
  approver?: Partial<Profile> | null
  approvedAt?: string | null
  lockedAt?: string | null
  className?: string
}

interface SignatureStepProps {
  label: string
  name?: string | null
  initials?: string | null
  timestamp?: string | null
  icon: React.ElementType
  filled: boolean
  color: string
}

function SignatureStep({ label, name, initials, timestamp, icon: Icon, filled, color }: SignatureStepProps) {
  return (
    <div
      className={cn(
        "flex-1 rounded-lg border p-3 min-w-0",
        filled ? `border-current ${color}` : "border-[var(--border)] bg-[var(--muted)]/30"
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className={cn("w-3.5 h-3.5 flex-shrink-0", filled ? "opacity-100" : "opacity-30")} />
        <span className={cn("text-xs font-semibold uppercase tracking-wide", !filled && "text-[var(--muted-foreground)]")}>
          {label}
        </span>
      </div>
      {filled && name ? (
        <>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-current opacity-20 flex items-center justify-center text-xs font-bold">
              <span className="opacity-100">{initials}</span>
            </div>
            <span className="text-sm font-medium truncate">{name}</span>
          </div>
          {timestamp && (
            <p className="text-xs mt-1 opacity-70">{formatDateTime(timestamp)}</p>
          )}
        </>
      ) : (
        <p className="text-xs text-[var(--muted-foreground)] italic">Pending</p>
      )}
    </div>
  )
}

export function SignatureBlock({
  status,
  creator,
  submittedAt,
  verifier,
  verifiedAt,
  approver,
  approvedAt,
  lockedAt,
  className,
}: SignatureBlockProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-1.5 mb-3">
        {status === "locked" ? (
          <Lock className="w-4 h-4 text-slate-500" />
        ) : (
          <CheckCircle2 className="w-4 h-4 text-[var(--muted-foreground)]" />
        )}
        <h4 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
          Workflow & Signatures
        </h4>
      </div>
      <div className="flex gap-2 flex-wrap sm:flex-nowrap">
        <SignatureStep
          label="Submitted By"
          name={creator?.full_name}
          initials={creator?.initials}
          timestamp={submittedAt}
          icon={UserCheck}
          filled={!!submittedAt}
          color="text-amber-600 bg-amber-50 border-amber-200"
        />
        <SignatureStep
          label="Verified By"
          name={verifier?.full_name}
          initials={verifier?.initials}
          timestamp={verifiedAt}
          icon={CheckCircle2}
          filled={!!verifiedAt}
          color="text-blue-600 bg-blue-50 border-blue-200"
        />
        <SignatureStep
          label="Approved By"
          name={approver?.full_name}
          initials={approver?.initials}
          timestamp={approvedAt}
          icon={ShieldCheck}
          filled={!!approvedAt}
          color="text-emerald-600 bg-emerald-50 border-emerald-200"
        />
        {status === "locked" && (
          <SignatureStep
            label="Locked"
            name="Record Locked"
            initials="🔒"
            timestamp={lockedAt}
            icon={Lock}
            filled={true}
            color="text-slate-600 bg-slate-50 border-slate-200"
          />
        )}
      </div>
    </div>
  )
}
