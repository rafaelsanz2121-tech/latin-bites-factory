"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Download, FileSpreadsheet, FileText, Loader2, ChevronDown } from "lucide-react"

interface Props {
  /** ISO date strings e.g. "2026-01-01" */
  dateFrom?: string
  dateTo?: string
  /** Optional single order id to export just one order */
  orderId?: string
  label?: string
}

/* ── Shared header painter ─────────────────────────────────── */
function paintPDFHeader(
  doc: InstanceType<typeof import("jspdf")["default"]>,
  title: string,
  subtitle: string,
  orgName = "Latin Bites Factory",
  estNum  = "M/P2643",
) {
  const W = doc.internal.pageSize.getWidth()

  // Dark navy banner
  doc.setFillColor(8, 14, 28)
  doc.rect(0, 0, W, 28, "F")

  // FactorOS wordmark
  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.setTextColor(255, 255, 255)
  doc.text("Factor", 12, 12)
  doc.setTextColor(239, 68, 68)
  doc.text("OS", 12 + doc.getTextWidth("Factor"), 12)

  // Org name + EST
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  doc.text(orgName, W - 12, 9, { align: "right" })
  doc.text(`EST No. ${estNum} · USDA Inspeccionado`, W - 12, 15, { align: "right" })

  // Red accent bar
  doc.setFillColor(239, 68, 68)
  doc.rect(0, 28, W, 1.2, "F")

  // Report title
  doc.setFont("helvetica", "bold")
  doc.setFontSize(13)
  doc.setTextColor(15, 23, 42)
  doc.text(title, 12, 40)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8.5)
  doc.setTextColor(100, 116, 139)
  doc.text(subtitle, 12, 47)

  // Generated timestamp (right side)
  doc.setFontSize(7.5)
  const now = new Date().toLocaleString("es-US", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  })
  doc.text(`Generado: ${now}`, W - 12, 47, { align: "right" })

  return 53 // y position after header
}

/* ── KPI pill row ──────────────────────────────────────────── */
function paintKPIRow(
  doc: InstanceType<typeof import("jspdf")["default"]>,
  y: number,
  kpis: { label: string; value: string }[],
) {
  const W = doc.internal.pageSize.getWidth()
  const pillW = (W - 24 - (kpis.length - 1) * 4) / kpis.length
  let x = 12

  kpis.forEach(({ label, value }) => {
    doc.setFillColor(248, 250, 252)
    doc.roundedRect(x, y, pillW, 16, 2, 2, "F")
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.3)
    doc.roundedRect(x, y, pillW, 16, 2, 2, "D")

    doc.setFont("helvetica", "bold")
    doc.setFontSize(10.5)
    doc.setTextColor(15, 23, 42)
    doc.text(value, x + pillW / 2, y + 7.5, { align: "center" })

    doc.setFont("helvetica", "normal")
    doc.setFontSize(6.5)
    doc.setTextColor(100, 116, 139)
    doc.text(label.toUpperCase(), x + pillW / 2, y + 13, { align: "center" })

    x += pillW + 4
  })

  return y + 21
}

/* ── Footer on every page ──────────────────────────────────── */
function addFooters(doc: InstanceType<typeof import("jspdf")["default"]>) {
  const total = doc.getNumberOfPages()
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.3)
    doc.line(12, H - 12, W - 12, H - 12)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7)
    doc.setTextColor(148, 163, 184)
    doc.text("FactorOS · Documento confidencial — uso interno", 12, H - 6)
    doc.text(`Pág. ${i} / ${total}`, W - 12, H - 6, { align: "right" })
  }
}

/* ── Main component ────────────────────────────────────────── */
export function ExportCostosButton({ dateFrom, dateTo, orderId, label = "Exportar" }: Props) {
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState<"pdf" | "excel" | null>(null)
  const supabase              = createClient()

  /* Fetch raw data */
  async function fetchData() {
    let q = supabase
      .from("cost_items")
      .select(`
        id, cost_type, description, quantity, unit_cost, total_cost, created_at,
        production_orders(id, order_number, quantity_lbs, order_date, status,
          products(name),
          clients(company_name)
        ),
        profiles(full_name)
      `)
      .order("created_at", { ascending: false })

    if (orderId)  q = q.eq("production_order_id", orderId)
    if (dateFrom) q = q.gte("created_at", dateFrom + "T00:00:00")
    if (dateTo)   q = q.lte("created_at", dateTo   + "T23:59:59")

    const { data, error } = await q
    if (error) throw error
    return (data || []) as any[]
  }

  /* ── PDF ──────────────────────────────────────────────────── */
  async function exportPDF() {
    setLoading("pdf")
    setOpen(false)
    try {
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ])
      const items = await fetchData()

      const doc  = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" })
      const W    = doc.internal.pageSize.getWidth()
      const fmt$ = (n: number) =>
        n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 })

      const periodLabel =
        dateFrom && dateTo
          ? `${dateFrom} → ${dateTo}`
          : orderId
          ? `Orden individual`
          : "Todos los períodos"

      let y = paintPDFHeader(doc, "Reporte de Costos de Producción", `Período: ${periodLabel}`)

      /* KPIs */
      const totalCOGS  = items.reduce((s, i) => s + Number(i.total_cost ?? 0), 0)
      const totalOrders = new Set(items.map((i) => i.production_orders?.id).filter(Boolean)).size
      const totalLbs   = [...new Set(items.map((i) => i.production_orders?.id).filter(Boolean))]
        .reduce((s, id) => {
          const o = items.find((i) => i.production_orders?.id === id)?.production_orders
          return s + Number(o?.quantity_lbs ?? 0)
        }, 0)
      const cpLb = totalLbs > 0 ? totalCOGS / totalLbs : 0

      const COST_TYPE_ES: Record<string, string> = {
        raw_material: "Materia Prima",
        labor:        "Mano de Obra",
        packaging:    "Empaque",
        overhead:     "Gastos Generales",
        other:        "Otros",
      }

      y = paintKPIRow(doc, y + 2, [
        { label: "Total COGS",    value: fmt$(totalCOGS) },
        { label: "Órdenes",       value: String(totalOrders) },
        { label: "Partidas",      value: String(items.length) },
        { label: "Costo / libra", value: cpLb > 0 ? fmt$(cpLb) : "—" },
      ])

      /* By type summary mini-table */
      const byType: Record<string, number> = {}
      items.forEach((i) => {
        byType[i.cost_type] = (byType[i.cost_type] ?? 0) + Number(i.total_cost ?? 0)
      })
      const typeSummary = Object.entries(byType)
        .sort((a, b) => b[1] - a[1])
        .map(([t, v]) => [COST_TYPE_ES[t] ?? t, fmt$(v), `${((v / totalCOGS) * 100).toFixed(1)}%`])

      // Section: Resumen por Tipo
      y += 3
      doc.setFont("helvetica", "bold")
      doc.setFontSize(8)
      doc.setTextColor(30, 41, 59)
      doc.text("RESUMEN POR TIPO DE COSTO", 12, y)
      y += 2

      autoTable(doc, {
        startY: y,
        head:   [["Tipo", "Total", "% del COGS"]],
        body:   typeSummary,
        theme:  "plain",
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles:  { fillColor: [30, 41, 59], textColor: 255, fontStyle: "bold", fontSize: 7.5 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: { 0: { cellWidth: 50 }, 1: { halign: "right", cellWidth: 35 }, 2: { halign: "right", cellWidth: 25 } },
        tableWidth: 115,
        margin: { left: 12 },
      })

      /* Main items table */
      const tableY = (doc as any).lastAutoTable.finalY + 8
      doc.setFont("helvetica", "bold")
      doc.setFontSize(8)
      doc.setTextColor(30, 41, 59)
      doc.text("DETALLE DE PARTIDAS", 12, tableY - 3)

      const rows = items.map((i) => [
        i.production_orders?.order_number ?? "Sin orden",
        i.production_orders?.products?.name ?? "—",
        i.production_orders?.clients?.company_name ?? "—",
        COST_TYPE_ES[i.cost_type] ?? i.cost_type,
        i.description,
        Number(i.quantity).toLocaleString(),
        fmt$(Number(i.unit_cost)),
        fmt$(Number(i.total_cost)),
        new Date(i.created_at).toLocaleDateString("es-US"),
      ])

      autoTable(doc, {
        startY: tableY,
        head: [["Orden", "Producto", "Cliente", "Tipo", "Descripción", "Cant.", "$ Unit.", "Total", "Fecha"]],
        body: rows,
        theme: "striped",
        styles: { fontSize: 7.5, cellPadding: 2.5, overflow: "linebreak" },
        headStyles: { fillColor: [8, 14, 28], textColor: 255, fontStyle: "bold", fontSize: 7 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 22, fontStyle: "bold" },
          1: { cellWidth: 28 },
          2: { cellWidth: 28 },
          3: { cellWidth: 22 },
          4: { cellWidth: "auto" },
          5: { halign: "right", cellWidth: 14 },
          6: { halign: "right", cellWidth: 18 },
          7: { halign: "right", cellWidth: 20, fontStyle: "bold" },
          8: { halign: "center", cellWidth: 18 },
        },
        margin: { left: 12, right: 12 },
        didParseCell: (data) => {
          // Highlight total column
          if (data.column.index === 7 && data.section === "body") {
            data.cell.styles.textColor = [180, 83, 9]
          }
        },
      })

      addFooters(doc)

      const filename = `costos_${(dateFrom ?? "").replace(/-/g, "") || "all"}_${Date.now()}.pdf`
      doc.save(filename)
      toast.success("PDF generado correctamente")
    } catch (err: any) {
      toast.error("Error generando PDF: " + err.message)
    } finally {
      setLoading(null)
    }
  }

  /* ── Excel ────────────────────────────────────────────────── */
  async function exportExcel() {
    setLoading("excel")
    setOpen(false)
    try {
      const XLSX  = await import("xlsx")
      const items = await fetchData()

      const COST_TYPE_ES: Record<string, string> = {
        raw_material: "Materia Prima", labor: "Mano de Obra",
        packaging:    "Empaque",       overhead: "Gastos Generales", other: "Otros",
      }

      const wb = XLSX.utils.book_new()

      /* ─ Sheet 1: Resumen por orden ─ */
      const byOrder: Record<string, {
        order: string; product: string; client: string; lbs: number;
        mp: number; labor: number; pkg: number; overhead: number; other: number; total: number;
      }> = {}
      items.forEach((i) => {
        const o   = i.production_orders
        const key = o?.id ?? "sin_orden"
        if (!byOrder[key]) {
          byOrder[key] = {
            order: o?.order_number ?? "Sin orden",
            product: o?.products?.name ?? "—",
            client:  o?.clients?.company_name ?? "—",
            lbs:     Number(o?.quantity_lbs ?? 0),
            mp: 0, labor: 0, pkg: 0, overhead: 0, other: 0, total: 0,
          }
        }
        const cost = Number(i.total_cost ?? 0)
        byOrder[key].total += cost
        if (i.cost_type === "raw_material") byOrder[key].mp       += cost
        else if (i.cost_type === "labor")   byOrder[key].labor    += cost
        else if (i.cost_type === "packaging") byOrder[key].pkg    += cost
        else if (i.cost_type === "overhead")  byOrder[key].overhead += cost
        else                                  byOrder[key].other  += cost
      })

      const summaryData = Object.values(byOrder).map((r) => ({
        "Orden":          r.order,
        "Producto":       r.product,
        "Cliente":        r.client,
        "Lbs Producidas": r.lbs,
        "Materia Prima":  r.mp,
        "Mano de Obra":   r.labor,
        "Empaque":        r.pkg,
        "Gastos Generales": r.overhead,
        "Otros":          r.other,
        "Total COGS":     r.total,
        "Costo / lb":     r.lbs > 0 ? +(r.total / r.lbs).toFixed(4) : 0,
      }))

      const ws1 = XLSX.utils.json_to_sheet(summaryData)
      ws1["!cols"] = [
        { wch: 16 }, { wch: 24 }, { wch: 24 }, { wch: 14 },
        { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 18 },
        { wch: 10 }, { wch: 14 }, { wch: 12 },
      ]
      XLSX.utils.book_append_sheet(wb, ws1, "Resumen por Orden")

      /* ─ Sheet 2: Detalle de partidas ─ */
      const detailData = items.map((i) => ({
        "Orden":        i.production_orders?.order_number ?? "Sin orden",
        "Producto":     i.production_orders?.products?.name ?? "—",
        "Cliente":      i.production_orders?.clients?.company_name ?? "—",
        "Tipo":         COST_TYPE_ES[i.cost_type] ?? i.cost_type,
        "Descripción":  i.description,
        "Cantidad":     Number(i.quantity),
        "Costo Unitario": Number(i.unit_cost),
        "Total":        Number(i.total_cost),
        "Registrado por": i.profiles?.full_name ?? "—",
        "Fecha":        new Date(i.created_at).toLocaleDateString("es-US"),
      }))

      const ws2 = XLSX.utils.json_to_sheet(detailData)
      ws2["!cols"] = [
        { wch: 16 }, { wch: 24 }, { wch: 24 }, { wch: 18 },
        { wch: 36 }, { wch: 10 }, { wch: 16 }, { wch: 14 },
        { wch: 22 }, { wch: 12 },
      ]
      XLSX.utils.book_append_sheet(wb, ws2, "Detalle de Partidas")

      /* ─ Sheet 3: Resumen por tipo ─ */
      const byType: Record<string, number> = {}
      items.forEach((i) => {
        byType[i.cost_type] = (byType[i.cost_type] ?? 0) + Number(i.total_cost ?? 0)
      })
      const totalCOGS = items.reduce((s, i) => s + Number(i.total_cost ?? 0), 0)
      const typeData  = Object.entries(byType)
        .sort((a, b) => b[1] - a[1])
        .map(([t, v]) => ({
          "Tipo":             COST_TYPE_ES[t] ?? t,
          "Total ($)":        +v.toFixed(2),
          "% del COGS":       +((v / totalCOGS) * 100).toFixed(2),
        }))
      typeData.push({ "Tipo": "TOTAL", "Total ($)": +totalCOGS.toFixed(2), "% del COGS": 100 })

      const ws3 = XLSX.utils.json_to_sheet(typeData)
      ws3["!cols"] = [{ wch: 22 }, { wch: 14 }, { wch: 14 }]
      XLSX.utils.book_append_sheet(wb, ws3, "Por Tipo de Costo")

      const filename = `costos_${(dateFrom ?? "").replace(/-/g, "") || "all"}_${Date.now()}.xlsx`
      XLSX.writeFile(wb, filename)
      toast.success("Excel generado correctamente")
    } catch (err: any) {
      toast.error("Error generando Excel: " + err.message)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="relative">
      <div className="flex items-stretch rounded-lg border border-amber-200 overflow-hidden shadow-sm">
        {/* Main button — defaults to PDF */}
        <button
          onClick={exportPDF}
          disabled={!!loading}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold transition-colors disabled:opacity-60"
        >
          {loading === "pdf"
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Download className="w-4 h-4" />}
          {loading === "pdf" ? "Generando…" : label}
        </button>

        {/* Dropdown toggle */}
        <button
          onClick={() => setOpen((v) => !v)}
          disabled={!!loading}
          className="flex items-center px-2 bg-amber-500 hover:bg-amber-600 text-white transition-colors border-l border-amber-400 disabled:opacity-60"
          aria-label="Opciones de exportación"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Dropdown menu */}
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1.5 w-48 bg-white dark:bg-[#1a2235] rounded-xl border border-slate-100 dark:border-slate-700 shadow-xl z-20 overflow-hidden">
            <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Formato de exportación
            </p>
            <button
              onClick={exportPDF}
              disabled={!!loading}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/[0.06] transition-colors font-medium"
            >
              <FileText className="w-4 h-4 text-red-500" />
              Exportar como PDF
            </button>
            <button
              onClick={exportExcel}
              disabled={!!loading}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/[0.06] transition-colors font-medium"
            >
              <FileSpreadsheet className="w-4 h-4 text-green-600" />
              Exportar como Excel
            </button>
          </div>
        </>
      )}
    </div>
  )
}
