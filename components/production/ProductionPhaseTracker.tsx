"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { formatDateTime } from "@/lib/utils"
import {
  Calendar,
  Factory,
  Flame,
  Snowflake,
  Package,
  Refrigerator,
  CheckCircle,
  Truck,
} from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

type ProductionStatus =
  | "planned"
  | "in_production"
  | "cooking"
  | "chilling"
  | "packaging"
  | "refrigerating"
  | "ready"
  | "shipped"
  | "cancelled"

interface Phase {
  status: ProductionStatus
  label: string
  icon: React.ComponentType<{ className?: string }>
  timestampField: string | null
}

const PHASES: Phase[] = [
  {
    status: "planned",
    label: "Planned",
    icon: Calendar,
    timestampField: null,
  },
  {
    status: "in_production",
    label: "In Production",
    icon: Factory,
    timestampField: "production_started_at",
  },
  {
    status: "cooking",
    label: "Cooking",
    icon: Flame,
    timestampField: "cooking_started_at",
  },
  {
    status: "chilling",
    label: "Chilling",
    icon: Snowflake,
    timestampField: "chilling_started_at",
  },
  {
    status: "packaging",
    label: "Packaging",
    icon: Package,
    timestampField: "packaging_started_at",
  },
  {
    status: "refrigerating",
    label: "Refrigerating",
    icon: Refrigerator,
    timestampField: "refrigerating_started_at",
  },
  {
    status: "ready",
    label: "Ready",
    icon: CheckCircle,
    timestampField: "ready_at",
  },
  {
    status: "shipped",
    label: "Shipped",
    icon: Truck,
    timestampField: "shipped_at",
  },
]

const STATUS_ORDER: ProductionStatus[] = [
  "planned",
  "in_production",
  "cooking",
  "chilling",
  "packaging",
  "refrigerating",
  "ready",
  "shipped",
]

const NEXT_STATUS: Partial<Record<ProductionStatus, ProductionStatus>> = {
  planned: "in_production",
  in_production: "cooking",
  cooking: "chilling",
  chilling: "packaging",
  packaging: "refrigerating",
  refrigerating: "ready",
  ready: "shipped",
}

const NEXT_LABEL: Partial<Record<ProductionStatus, string>> = {
  planned: "Start Production",
  in_production: "Advance to Cooking",
  cooking: "Advance to Chilling",
  chilling: "Advance to Packaging",
  packaging: "Advance to Refrigerating",
  refrigerating: "Mark as Ready",
  ready: "Mark as Shipped",
}

interface Props {
  orderId: string
  currentStatus: ProductionStatus
  timestamps: Record<string, string | null>
  canAdvance: boolean
}

export default function ProductionPhaseTracker({
  orderId,
  currentStatus,
  timestamps,
  canAdvance,
}: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [status, setStatus] = useState<ProductionStatus>(currentStatus)
  const [ts, setTs] = useState<Record<string, string | null>>(timestamps)
  const [loading, setLoading] = useState(false)

  const currentIndex = STATUS_ORDER.indexOf(status)
  const nextStatus = NEXT_STATUS[status]

  const handleAdvance = async () => {
    if (!nextStatus) return

    const now = new Date().toISOString()
    const nextPhase = PHASES.find((p) => p.status === nextStatus)

    // Optimistic update — advance UI immediately
    const prevStatus = status
    const prevTs = ts
    setStatus(nextStatus)
    if (nextPhase?.timestampField) {
      setTs((prev) => ({ ...prev, [nextPhase.timestampField!]: now }))
    }
    setLoading(true)

    const updatePayload: Record<string, string> = { status: nextStatus }
    if (nextPhase?.timestampField) {
      updatePayload[nextPhase.timestampField] = now
    }

    const { error } = await supabase
      .from("production_orders")
      .update(updatePayload)
      .eq("id", orderId)

    setLoading(false)

    if (error) {
      // Roll back optimistic update
      setStatus(prevStatus)
      setTs(prevTs)
      toast.error(error.message)
      return
    }

    toast.success(`Advanced to ${nextPhase?.label ?? nextStatus}`)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Timeline */}
      <div className="relative">
        {/* Connector line */}
        <div className="absolute top-6 left-6 right-6 h-0.5 bg-[var(--border)]" />

        <div className="relative flex items-start justify-between gap-1">
          {PHASES.map((phase, index) => {
            const phaseIndex = STATUS_ORDER.indexOf(phase.status)
            const isCompleted = phaseIndex < currentIndex
            const isCurrent = phase.status === status
            const isFuture = phaseIndex > currentIndex

            const Icon = phase.icon

            const circleClass = isCurrent
              ? `bg-blue-600 border-blue-600 text-white shadow-md ring-4 ring-blue-100${loading ? " animate-pulse" : ""}`
              : isCompleted
              ? "bg-green-500 border-green-500 text-white"
              : "bg-white border-[var(--border)] text-[var(--muted-foreground)]"

            const labelClass = isCurrent
              ? "text-blue-700 font-semibold"
              : isCompleted
              ? "text-green-700 font-medium"
              : "text-[var(--muted-foreground)]"

            const timestampValue =
              phase.timestampField ? ts[phase.timestampField] : null

            return (
              <div key={phase.status} className="flex flex-col items-center flex-1 min-w-0">
                {/* Circle */}
                <div
                  className={`relative z-10 w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${circleClass}`}
                >
                  <Icon className="w-5 h-5" />
                </div>

                {/* Label */}
                <p
                  className={`mt-2 text-xs text-center leading-tight ${labelClass}`}
                >
                  {phase.label}
                </p>

                {/* Timestamp */}
                {timestampValue ? (
                  <p className="mt-1 text-[10px] text-center text-[var(--muted-foreground)] leading-tight max-w-[80px]">
                    {formatDateTime(timestampValue)}
                  </p>
                ) : isCurrent ? (
                  <p className="mt-1 text-[10px] text-center text-blue-500 leading-tight font-medium">
                    Current
                  </p>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>

      {/* Advance button */}
      {canAdvance && nextStatus && status !== "shipped" && status !== "cancelled" && (
        <div className="flex justify-center pt-2">
          <Button
            onClick={handleAdvance}
            loading={loading}
            className="min-w-[200px]"
          >
            {NEXT_LABEL[status] ?? `Advance to ${nextStatus}`}
          </Button>
        </div>
      )}

      {status === "shipped" && (
        <p className="text-center text-sm text-green-700 font-medium">
          This order has been shipped.
        </p>
      )}

      {status === "cancelled" && (
        <p className="text-center text-sm text-red-600 font-medium">
          This order was cancelled.
        </p>
      )}
    </div>
  )
}
