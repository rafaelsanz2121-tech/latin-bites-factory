import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Package } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDate, formatDateTime } from "@/lib/utils"

interface Props { params: Promise<{ id: string }> }

export default async function LotDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [{ data: lot }, { data: preshipments }] = await Promise.all([
    supabase.from("lots").select("*, products(name, code)").eq("id", id).single(),
    supabase.from("preshipment_reviews").select("id, review_date, disposition, status").eq("lot_id", id).order("created_at", { ascending: false }),
  ])

  if (!lot) notFound()

  const dispositionColors: Record<string, any> = {
    approved_for_shipment: "success",
    hold: "warning",
    rejected: "destructive",
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <Link href="/lots" className="flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-3">
          <ArrowLeft className="w-3.5 h-3.5" />Raw Material Lots
        </Link>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
            <Package className="w-6 h-6 text-slate-600 dark:text-slate-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-mono">{lot.lot_number}</h1>
            <p className="text-sm text-[var(--muted-foreground)]">{lot.products?.name}</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Lot Details</CardTitle></CardHeader>
        <CardContent>
          {[
            { label: "Product", value: lot.products?.name || "—" },
            { label: "Received Date", value: lot.received_date ? formatDate(lot.received_date) : "—" },
            { label: "Quantity", value: lot.quantity_lbs ? `${Number(lot.quantity_lbs).toLocaleString()} lbs` : "—" },
            { label: "Supplier", value: lot.supplier || "—" },
            { label: "Registered", value: formatDateTime(lot.created_at) },
          ].map((item) => (
            <div key={item.label} className="flex justify-between py-2 border-b border-[var(--border)] last:border-0">
              <span className="text-sm text-[var(--muted-foreground)]">{item.label}</span>
              <span className="text-sm font-medium">{item.value}</span>
            </div>
          ))}
          {lot.notes && (
            <div className="pt-3">
              <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm">{lot.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Pre-Shipment Reviews</CardTitle>
            <Link href={`/preshipment/new`} className="text-xs text-blue-600 hover:underline">+ New Review</Link>
          </div>
        </CardHeader>
        <CardContent>
          {!preshipments?.length ? (
            <p className="text-sm text-[var(--muted-foreground)] italic">No pre-shipment reviews for this lot yet.</p>
          ) : (
            <div className="space-y-2">
              {preshipments.map((ps: any) => (
                <Link key={ps.id} href={`/preshipment/${ps.id}`} className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)] hover:bg-[var(--muted)] transition-colors">
                  <p className="text-sm font-medium">{formatDate(ps.review_date)}</p>
                  <div className="flex gap-2">
                    <Badge variant={dispositionColors[ps.disposition] || "secondary"} className="text-xs">
                      {ps.disposition?.replace(/_/g, " ") || "—"}
                    </Badge>
                    <Badge variant={ps.status === "approved" ? "success" : "secondary"} className="text-xs">{ps.status}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
