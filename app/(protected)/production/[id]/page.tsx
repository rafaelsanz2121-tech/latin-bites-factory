import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ClipboardList } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDate, formatDateTime } from "@/lib/utils"
import ProductionPhaseTracker from "@/components/production/ProductionPhaseTracker"

interface Props {
  params: Promise<{ id: string }>
}

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

const STATUS_LABELS: Record<ProductionStatus, string> = {
  planned: "Planned",
  in_production: "In Production",
  cooking: "Cooking",
  chilling: "Chilling",
  packaging: "Packaging",
  refrigerating: "Refrigerating",
  ready: "Ready",
  shipped: "Shipped",
  cancelled: "Cancelled",
}

const STATUS_BADGE_CLASS: Record<ProductionStatus, string> = {
  planned: "bg-blue-100 text-blue-800 border-blue-200",
  in_production: "bg-orange-100 text-orange-800 border-orange-200",
  cooking: "bg-orange-100 text-orange-800 border-orange-200",
  chilling: "bg-sky-100 text-sky-800 border-sky-200",
  packaging: "bg-cyan-100 text-cyan-800 border-cyan-200",
  refrigerating: "bg-indigo-100 text-indigo-800 border-indigo-200",
  ready: "bg-green-100 text-green-800 border-green-200",
  shipped: "bg-gray-100 text-gray-700 border-gray-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
}

export default async function ProductionOrderDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // Fetch profile for role check
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const { data: order } = await supabase
    .from("production_orders")
    .select(
      `
      id,
      order_number,
      quantity_lbs,
      order_date,
      scheduled_date,
      status,
      notes,
      internal_temp_final,
      created_at,
      production_started_at,
      cooking_started_at,
      chilling_started_at,
      packaging_started_at,
      refrigerating_started_at,
      ready_at,
      shipped_at,
      clients ( company_name ),
      products ( name, code ),
      recipes ( recipe_name ),
      lots ( lot_number )
    `
    )
    .eq("id", id)
    .single()

  if (!order) notFound()

  const status = order.status as ProductionStatus
  const role = profile?.role as string | undefined
  const canAdvance = role === "admin" || role === "supervisor"

  const timestamps: Record<string, string | null> = {
    production_started_at: order.production_started_at ?? null,
    cooking_started_at: order.cooking_started_at ?? null,
    chilling_started_at: order.chilling_started_at ?? null,
    packaging_started_at: order.packaging_started_at ?? null,
    refrigerating_started_at: order.refrigerating_started_at ?? null,
    ready_at: order.ready_at ?? null,
    shipped_at: order.shipped_at ?? null,
  }

  const client = order.clients as any
  const product = order.products as any
  const recipe = order.recipes as any
  const lot = order.lots as any

  const detailRows = [
    { label: "Order Number", value: order.order_number, mono: true },
    {
      label: "Quantity",
      value: order.quantity_lbs
        ? `${Number(order.quantity_lbs).toLocaleString()} lbs`
        : "—",
    },
    {
      label: "Order Date",
      value: order.order_date ? formatDate(order.order_date) : "—",
    },
    {
      label: "Scheduled Date",
      value: order.scheduled_date ? formatDate(order.scheduled_date) : "—",
    },
    { label: "Recipe", value: recipe?.recipe_name || "—" },
    { label: "Raw Material Lot", value: lot?.lot_number || "—", mono: true },
    {
      label: "Final Internal Temp",
      value: order.internal_temp_final
        ? `${order.internal_temp_final}°F`
        : "—",
    },
    { label: "Created", value: formatDateTime(order.created_at) },
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Back link */}
      <Link
        href="/production"
        className="flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Production Orders
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
          <ClipboardList className="w-6 h-6 text-slate-600 dark:text-slate-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold font-mono">{order.order_number}</h1>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                STATUS_BADGE_CLASS[status] ?? "bg-gray-100 text-gray-700 border-gray-200"
              }`}
            >
              {STATUS_LABELS[status] ?? status}
            </span>
          </div>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
            {client?.company_name || "—"} &middot;{" "}
            <Badge variant="secondary" className="text-xs">
              {product?.name || "—"}
            </Badge>
          </p>
        </div>
      </div>

      {/* Phase tracker */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            Production Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <ProductionPhaseTracker
            orderId={order.id}
            currentStatus={status}
            timestamps={timestamps}
            canAdvance={canAdvance}
          />
        </CardContent>
      </Card>

      {/* Order details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            Order Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          {detailRows.map((row) => (
            <div
              key={row.label}
              className="flex justify-between py-2 border-b border-[var(--border)] last:border-0"
            >
              <span className="text-sm text-[var(--muted-foreground)]">
                {row.label}
              </span>
              <span
                className={`text-sm font-medium ${
                  row.mono ? "font-mono" : ""
                }`}
              >
                {row.value}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Notes */}
      {order.notes && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{order.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
