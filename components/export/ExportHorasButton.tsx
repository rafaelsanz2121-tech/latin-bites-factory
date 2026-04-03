"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Download, FileSpreadsheet, FileText, Loader2, ChevronDown } from "lucide-react"

interface Props {
  /** ISO date strings e.g. "2026-03-30" */
  dateFrom?: string
  dateTo?:   string
  label?:    string
}

/* ── Shared header painter (same style as costos) ─────────── */
function paintPDFHeader(
  doc: InstanceType<typeof import("jspdf")["default"]>,
  title: string,
  subtitle: string,
) {
  const W = doc.internal.pageSize.getWidth()
  doc.setFillColor(8, 14, 28)
  doc.rect(0, 0, W, 28, "F")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.setTextColor(255, 255, 255)
  doc.text("Factor", 12, 12)
  doc.setTextColor(239, 68, 68)
  doc.text("OS", 12 + doc.getTextWidth("Factor"), 12)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  doc.text("Latin Bites Factory", W - 12, 9,  { align: "right" })
  doc.text("EST No. M/P2643 · USDA Inspeccionado", W - 12, 15, { align: "right" })

  doc.setFillColor(239, 68, 68)
  doc.rect(0, 28, W, 1.2, "F")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(13)
  doc.setTextColor(15, 23, 42)
  doc.text(title, 12, 40)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8.5)
  doc.setTextColor(100, 116, 139)
  doc.text(subtitle, 12, 47)

  const now = new Date().toLocaleString("es-US", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  })
  doc.setFontSize(7.5)
  doc.text(`Generado: ${now}`, W - 12, 47, { align: "right" })

  return 53
}

function paintKPIRow(
  doc: InstanceType<typeof import("jspdf")["default"]>,
  y: number,
  kpis: { label: string; value: string }[],
) {
  const W    = doc.internal.pageSize.getWidth()
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
    doc.text("FactorOS · Control de Horas de Producción · Documento confidencial", 12, H - 6)
    doc.text(`Pág. ${i} / ${total}`, W - 12, H - 6, { align: "right" })
  }
}

export function ExportHorasButton({ dateFrom, dateTo, label = "Exportar" }: Props) {
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState<"pdf" | "excel" | null>(null)
  const supabase              = createClient()

  async function fetchData() {
    let q = supabase
      .from("labor_entries")
      .select(`
        id, work_date, hours_worked, hourly_rate, total_pay, area, task_description, is_overtime, created_at,
        profiles!employee_id(full_name, employee_id),
        production_orders(order_number, products(name))
      `)
      .order("work_date", { ascending: false })
      .order("created_at", { ascending: false })

    if (dateFrom) q = q.gte("work_date", dateFrom)
    if (dateTo)   q = q.lte("work_date", dateTo)

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
      const entries = await fetchData()

      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" })
      const W   = doc.internal.pageSize.getWidth()
      const fmt$  = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" })
      const fmt2d = (n: number) => n.toFixed(2)

      const periodLabel =
        dateFrom && dateTo ? `${dateFrom} → ${dateTo}` : "Todos los períodos"

      let y = paintPDFHeader(doc, "Control de Horas de Producción (MOD)", `Período: ${periodLabel}`)

      /* Aggregate KPIs */
      const totalHours  = entries.reduce((s, e) => s + Number(e.hours_worked ?? 0), 0)
      const totalPay    = entries.reduce((s, e) => s + Number(e.total_pay ?? 0), 0)
      const otHours     = entries.filter((e) => e.is_overtime).reduce((s, e) => s + Number(e.hours_worked), 0)
      const uniqueEmps  = new Set(entries.map((e: any) => e.profiles?.full_name)).size

      y = paintKPIRow(doc, y + 2, [
        { label: "Total horas",   value: `${fmt2d(totalHours)} h` },
        { label: "Costo MOD",     value: fmt$(totalPay) },
        { label: "Overtime",      value: `${fmt2d(otHours)} h` },
        { label: "Empleados",     value: String(uniqueEmps) },
        { label: "Registros",     value: String(entries.length) },
      ])

      /* ── Employee summary mini-table ── */
      const byEmp: Record<string, { name: string; hours: number; pay: number; ot: number; recs: number }> = {}
      entries.forEach((e: any) => {
        const name = e.profiles?.full_name ?? "Desconocido"
        if (!byEmp[name]) byEmp[name] = { name, hours: 0, pay: 0, ot: 0, recs: 0 }
        byEmp[name].hours += Number(e.hours_worked ?? 0)
        byEmp[name].pay   += Number(e.total_pay   ?? 0)
        byEmp[name].recs  += 1
        if (e.is_overtime) byEmp[name].ot += Number(e.hours_worked)
      })
      const empRows = Object.values(byEmp)
        .sort((a, b) => b.hours - a.hours)
        .map((r) => [r.name, `${r.hours.toFixed(2)} h`, `${r.ot.toFixed(2)} h`, fmt$(r.pay), String(r.recs)])

      y += 2
      doc.setFont("helvetica", "bold")
      doc.setFontSize(8)
      doc.setTextColor(30, 41, 59)
      doc.text("RESUMEN POR EMPLEADO", 12, y)
      y += 2

      autoTable(doc, {
        startY: y,
        head:   [["Empleado", "Horas Reg.", "Horas OT", "Costo MOD", "Registros"]],
        body:   empRows,
        theme:  "plain",
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [21, 128, 61], textColor: 255, fontStyle: "bold", fontSize: 7.5 },
        alternateRowStyles: { fillColor: [240, 253, 244] },
        columnStyles: {
          0: { cellWidth: 55 },
          1: { halign: "right", cellWidth: 24 },
          2: { halign: "right", cellWidth: 20 },
          3: { halign: "right", cellWidth: 28 },
          4: { halign: "center", cellWidth: 20 },
        },
        tableWidth: 152,
        margin: { left: 12 },
        didParseCell: (data) => {
          if (data.column.index === 3 && data.section === "body") {
            data.cell.styles.textColor = [21, 128, 61]
            data.cell.styles.fontStyle = "bold"
          }
        },
      })

      /* ── Entries detail table ── */
      const entriesY = (doc as any).lastAutoTable.finalY + 8
      doc.setFont("helvetica", "bold")
      doc.setFontSize(8)
      doc.setTextColor(30, 41, 59)
      doc.text("DETALLE DE REGISTROS", 12, entriesY - 3)

      const detailRows = entries.map((e: any) => [
        e.profiles?.full_name ?? "—",
        e.production_orders?.order_number ?? "Sin orden",
        e.production_orders?.products?.name ?? "—",
        new Date(e.work_date + "T12:00:00").toLocaleDateString("es-US"),
        `${Number(e.hours_worked).toFixed(2)} h`,
        `$${Number(e.hourly_rate).toFixed(2)}/h`,
        fmt$(Number(e.total_pay)),
        e.area || "—",
        e.is_overtime ? "SÍ" : "No",
        e.task_description || "—",
      ])

      autoTable(doc, {
        startY: entriesY,
        head: [["Empleado", "Orden", "Producto", "Fecha", "Horas", "Tasa", "Total", "Área", "OT", "Descripción"]],
        body: detailRows,
        theme: "striped",
        styles: { fontSize: 7, cellPadding: 2.5, overflow: "linebreak" },
        headStyles: { fillColor: [8, 14, 28], textColor: 255, fontStyle: "bold", fontSize: 6.5 },
        alternateRowStyles: { fillColor: [240, 253, 244] },
        columnStyles: {
          0: { cellWidth: 38 },
          1: { cellWidth: 20, fontStyle: "bold" },
          2: { cellWidth: 24 },
          3: { halign: "center", cellWidth: 18 },
          4: { halign: "right", cellWidth: 16 },
          5: { halign: "right", cellWidth: 18 },
          6: { halign: "right", cellWidth: 20, fontStyle: "bold" },
          7: { cellWidth: 22 },
          8: { halign: "center", cellWidth: 10 },
          9: { cellWidth: "auto" },
        },
        margin: { left: 12, right: 12 },
        didParseCell: (data) => {
          if (data.column.index === 6 && data.section === "body") {
            data.cell.styles.textColor = [21, 128, 61]
          }
          if (data.column.index === 8 && data.section === "body") {
            const val = String(data.cell.raw)
            if (val === "SÍ") {
              data.cell.styles.textColor = [234, 88, 12]
              data.cell.styles.fontStyle = "bold"
            }
          }
        },
      })

      addFooters(doc)

      const filename = `horas_MOD_${(dateFrom ?? "").replace(/-/g, "") || "all"}_${Date.now()}.pdf`
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
      const XLSX    = await import("xlsx")
      const entries = await fetchData()

      const wb = XLSX.utils.book_new()

      /* ─ Sheet 1: Resumen por empleado ─ */
      const byEmp: Record<string, {
        name: string; empId: string; hours: number; ot: number; pay: number; recs: number;
      }> = {}
      entries.forEach((e: any) => {
        const name = e.profiles?.full_name ?? "Desconocido"
        const id   = e.profiles?.employee_id ?? "—"
        if (!byEmp[name]) byEmp[name] = { name, empId: id, hours: 0, ot: 0, pay: 0, recs: 0 }
        byEmp[name].hours += Number(e.hours_worked ?? 0)
        byEmp[name].pay   += Number(e.total_pay   ?? 0)
        byEmp[name].recs  += 1
        if (e.is_overtime) byEmp[name].ot += Number(e.hours_worked)
      })

      const empData = Object.values(byEmp).sort((a, b) => b.hours - a.hours).map((r) => ({
        "Empleado":              r.name,
        "Employee ID":           r.empId,
        "Horas Regulares":       +(r.hours - r.ot).toFixed(2),
        "Horas Overtime":        +r.ot.toFixed(2),
        "Total Horas":           +r.hours.toFixed(2),
        "Costo MOD ($)":         +r.pay.toFixed(2),
        "Registros":             r.recs,
        "Costo Prom / hora ($)": r.hours > 0 ? +(r.pay / r.hours).toFixed(2) : 0,
      }))

      const ws1 = XLSX.utils.json_to_sheet(empData)
      ws1["!cols"] = [
        { wch: 28 }, { wch: 14 }, { wch: 18 }, { wch: 16 },
        { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 20 },
      ]
      XLSX.utils.book_append_sheet(wb, ws1, "Resumen por Empleado")

      /* ─ Sheet 2: Detalle de entradas ─ */
      const detailData = entries.map((e: any) => ({
        "Empleado":          e.profiles?.full_name ?? "—",
        "Employee ID":       e.profiles?.employee_id ?? "—",
        "Orden Producción":  e.production_orders?.order_number ?? "Sin orden",
        "Producto":          e.production_orders?.products?.name ?? "—",
        "Fecha Trabajo":     e.work_date,
        "Horas Trabajadas":  Number(e.hours_worked),
        "Tasa Horaria ($)":  Number(e.hourly_rate),
        "Total Pago ($)":    Number(e.total_pay),
        "Overtime":          e.is_overtime ? "Sí" : "No",
        "Área":              e.area ?? "—",
        "Descripción":       e.task_description ?? "—",
        "Fecha Registro":    new Date(e.created_at).toLocaleDateString("es-US"),
      }))

      const ws2 = XLSX.utils.json_to_sheet(detailData)
      ws2["!cols"] = [
        { wch: 28 }, { wch: 14 }, { wch: 18 }, { wch: 22 }, { wch: 14 },
        { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 10 }, { wch: 22 },
        { wch: 36 }, { wch: 14 },
      ]
      XLSX.utils.book_append_sheet(wb, ws2, "Detalle de Entradas")

      /* ─ Sheet 3: Resumen por orden ─ */
      const byOrder: Record<string, { order: string; product: string; hours: number; pay: number }> = {}
      entries.forEach((e: any) => {
        const key = e.production_orders?.order_number ?? "Sin orden"
        if (!byOrder[key]) byOrder[key] = {
          order:   key,
          product: e.production_orders?.products?.name ?? "—",
          hours: 0, pay: 0,
        }
        byOrder[key].hours += Number(e.hours_worked ?? 0)
        byOrder[key].pay   += Number(e.total_pay   ?? 0)
      })
      const orderData = Object.values(byOrder).sort((a, b) => b.pay - a.pay).map((r) => ({
        "Orden":             r.order,
        "Producto":          r.product,
        "Total Horas (h)":   +r.hours.toFixed(2),
        "Costo MOD ($)":     +r.pay.toFixed(2),
      }))
      const ws3 = XLSX.utils.json_to_sheet(orderData)
      ws3["!cols"] = [{ wch: 18 }, { wch: 26 }, { wch: 16 }, { wch: 16 }]
      XLSX.utils.book_append_sheet(wb, ws3, "Resumen por Orden")

      const filename = `horas_MOD_${(dateFrom ?? "").replace(/-/g, "") || "all"}_${Date.now()}.xlsx`
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
      <div className="flex items-stretch rounded-lg border border-green-200 overflow-hidden shadow-sm">
        <button
          onClick={exportPDF}
          disabled={!!loading}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold transition-colors disabled:opacity-60"
        >
          {loading === "pdf"
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Download className="w-4 h-4" />}
          {loading === "pdf" ? "Generando…" : label}
        </button>

        <button
          onClick={() => setOpen((v) => !v)}
          disabled={!!loading}
          className="flex items-center px-2 bg-green-600 hover:bg-green-700 text-white transition-colors border-l border-green-500 disabled:opacity-60"
          aria-label="Opciones de exportación"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

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
