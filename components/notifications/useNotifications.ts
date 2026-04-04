"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"

export type NotifSeverity = "critical" | "warning" | "info"

export interface AppNotification {
  id:          string
  type:        string
  severity:    NotifSeverity
  title:       string
  description: string
  href:        string
  createdAt?:  string
}

const REFRESH_MS = 60_000 // re-fetch every 60 s

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading]             = useState(true)
  const supabase                          = createClient()

  const fetch = useCallback(async () => {
    try {
      const today = new Date().toISOString().split("T")[0]
      const results: AppNotification[] = []

      /* ── 1. CAPAs vencidas — critical ── */
      const { data: overdueCAPAs } = await supabase
        .from("corrective_actions")
        .select("id, description, due_date, deviation_id")
        .lt("due_date", today)
        .in("status", ["open", "in_progress"])
        .order("due_date", { ascending: true })
        .limit(10)

      ;(overdueCAPAs || []).forEach((c) => {
        const days = Math.floor(
          (Date.now() - new Date(c.due_date).getTime()) / 86_400_000
        )
        results.push({
          id:          `capa-${c.id}`,
          type:        "capa_overdue",
          severity:    "critical",
          title:       `CAPA vencida hace ${days}d`,
          description: c.description?.slice(0, 80) || "Sin descripción",
          href:        "/corrective-actions",
          createdAt:   c.due_date,
        })
      })

      /* ── 2. Desvíos abiertos — warning ── */
      const { data: openDevs } = await supabase
        .from("deviations")
        .select("id, description, severity, date_identified")
        .in("status", ["open", "under_review"])
        .order("date_identified", { ascending: false })
        .limit(5)

      ;(openDevs || []).forEach((d) => {
        results.push({
          id:          `dev-${d.id}`,
          type:        "deviation_open",
          severity:    d.severity === "critical" ? "critical" : "warning",
          title:       `Desviación ${d.severity === "critical" ? "crítica" : "abierta"}`,
          description: d.description?.slice(0, 80) || "Sin descripción",
          href:        `/deviations/${d.id}`,
          createdAt:   d.date_identified,
        })
      })

      /* ── 3. Órdenes listas para envío — info ── */
      const { data: readyOrders } = await supabase
        .from("production_orders")
        .select("id, order_number, products(name)")
        .eq("status", "ready")
        .order("updated_at", { ascending: false })
        .limit(5)

      ;(readyOrders || []).forEach((o: any) => {
        results.push({
          id:          `order-${o.id}`,
          type:        "order_ready",
          severity:    "info",
          title:       `Orden ${o.order_number} lista`,
          description: o.products?.name || "Listo para despacho",
          href:        `/production/${o.id}`,
        })
      })

      /* ── 4. Stock bajo / agotado (graceful) ── */
      try {
        const { data: lowStock } = await supabase
          .from("inventory_items")
          .select("id, name, current_stock, min_stock, unit")
          .eq("is_active", true)
          .limit(200)

        // Filter client-side: current_stock <= min_stock
        const stockItems = (lowStock || []) as any[]
        stockItems
          .filter((i) => Number(i.current_stock) <= Number(i.min_stock ?? 0))
          .slice(0, 8)
          .forEach((i) => {
            const out = Number(i.current_stock) <= 0
            results.push({
              id:          `stock-${i.id}`,
              type:        out ? "stock_out" : "stock_low",
              severity:    out ? "critical" : "warning",
              title:       out ? `${i.name} — AGOTADO` : `${i.name} — Stock bajo`,
              description: out
                ? `Sin unidades en inventario`
                : `${Number(i.current_stock).toLocaleString()} ${i.unit} (mín: ${Number(i.min_stock).toLocaleString()})`,
              href:        `/inventario/${i.id}`,
            })
          })
      } catch { /* enterprise tables not migrated yet */ }

      /* ── 5. Logs pendientes de aprobación — info ── */
      const LOG_TABLES = [
        { table: "thawing_logs",               label: "Descongelado" },
        { table: "receiving_logs",              label: "Recepción" },
        { table: "cooking_chilling_logs",       label: "Cocción CCP" },
        { table: "preop_sanitation_reports",    label: "Pre-Op" },
        { table: "operational_sanitation_logs", label: "Sanitación" },
        { table: "preshipment_reviews",         label: "Pre-Embarque" },
      ]
      const pendingCounts = await Promise.all(
        LOG_TABLES.map((t) =>
          supabase.from(t.table as any).select("*", { count: "exact", head: true }).eq("status", "submitted")
        )
      )
      LOG_TABLES.forEach((t, i) => {
        const cnt = pendingCounts[i].count || 0
        if (cnt > 0) {
          results.push({
            id:          `log-${t.table}`,
            type:        "log_pending",
            severity:    "info",
            title:       `${cnt} registro${cnt > 1 ? "s" : ""} pendiente${cnt > 1 ? "s" : ""}`,
            description: `${t.label} — esperando aprobación`,
            href:        `/${t.table.replace(/_logs|_reports|_reviews/, "").replace("_", "-")}`,
          })
        }
      })

      /* Sort: critical first, then warning, then info */
      const ORDER: Record<NotifSeverity, number> = { critical: 0, warning: 1, info: 2 }
      results.sort((a, b) => ORDER[a.severity] - ORDER[b.severity])

      setNotifications(results)
    } catch (err) {
      console.error("useNotifications error:", err)
    } finally {
      setLoading(false)
    }
  }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetch()
    const interval = setInterval(fetch, REFRESH_MS)
    return () => clearInterval(interval)
  }, [fetch])

  return { notifications, loading, refetch: fetch }
}
