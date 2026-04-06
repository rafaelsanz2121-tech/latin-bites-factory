"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LogStatusBadge } from "@/components/logs/LogStatusBadge"
import { formatDate } from "@/lib/utils"
import { toast } from "sonner"
import { FileText, Download, Filter } from "lucide-react"
import Link from "next/link"

const MODULES = [
  { key: "receiving_logs", label: "Receiving Log", href: "/receiving" },
  { key: "thawing_logs", label: "Thawing Log", href: "/thawing" },
  { key: "cooking_chilling_logs", label: "Cooking / Chilling (CCP)", href: "/cooking" },
  { key: "calibration_logs", label: "Thermometer Calibration", href: "/calibration" },
  { key: "preop_sanitation_reports", label: "Pre-Op Sanitation", href: "/sanitation/preop" },
  { key: "operational_sanitation_logs", label: "Operational Sanitation", href: "/sanitation/operational" },
  { key: "preshipment_reviews", label: "Pre-Shipment Reviews", href: "/preshipment" },
  { key: "deviations", label: "Deviations", href: "/deviations" },
  { key: "corrective_actions", label: "Corrective Actions (CAPA)", href: "/corrective-actions" },
]

const DATE_FIELD: Record<string, string> = {
  receiving_logs: "received_date",
  thawing_logs: "date",
  cooking_chilling_logs: "cook_date",
  calibration_logs: "calibration_date",
  preop_sanitation_reports: "report_date",
  operational_sanitation_logs: "log_date",
  preshipment_reviews: "review_date",
  deviations: "date_identified",
  corrective_actions: "date_opened",
}

interface ReportRow {
  id: string
  date: string
  status?: string
  summary: string
  href: string
}

export function ReportsClient() {
  const supabase = createClient()
  const today = new Date().toISOString().split("T")[0]
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

  const [dateFrom, setDateFrom] = useState(thirtyDaysAgo)
  const [dateTo, setDateTo] = useState(today)
  const [selectedModule, setSelectedModule] = useState("all")
  const [results, setResults] = useState<Record<string, ReportRow[]>>({})
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const handleSearch = async () => {
    if (dateFrom > dateTo) {
      toast.error("'From' date must be before 'To' date")
      return
    }
    setLoading(true)
    setResults({})

    const modules = selectedModule === "all" ? MODULES : MODULES.filter((m) => m.key === selectedModule)
    const fetched: Record<string, ReportRow[]> = {}

    await Promise.all(modules.map(async (mod) => {
      const dateCol = DATE_FIELD[mod.key]
      const { data } = await supabase
        .from(mod.key)
        .select("id, status, " + dateCol)
        .gte(dateCol, dateFrom)
        .lte(dateCol, dateTo)
        .order(dateCol, { ascending: false })
        .limit(200)

      if (data) {
        fetched[mod.key] = data.map((row: any) => ({
          id: row.id,
          date: row[dateCol],
          status: row.status,
          summary: `${mod.label} — ${formatDate(row[dateCol])}`,
          href: `${mod.href}/${row.id}`,
        }))
      }
    }))

    setResults(fetched)
    setLoading(false)
    setSearched(true)
  }

  const totalCount = Object.values(results).reduce((sum, rows) => sum + rows.length, 0)

  const escapeCSV = (val: string) => `"${String(val).replace(/"/g, '""')}"`

  const handleExportCSV = () => {
    if (!totalCount) { toast.error("No data to export"); return }

    const rows: string[] = ["Module,Date,Status,ID"]
    for (const [moduleKey, moduleRows] of Object.entries(results)) {
      const mod = MODULES.find((m) => m.key === moduleKey)
      for (const row of moduleRows) {
        rows.push([escapeCSV(mod?.label ?? ""), escapeCSV(row.date), escapeCSV(row.status ?? ""), escapeCSV(row.id)].join(","))
      }
    }

    const blob = new Blob([rows.join("\n")], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `latin-bites-report-${dateFrom}-to-${dateTo}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("CSV exported")
  }

  return (
    <div className="space-y-4">
      {/* Print tip banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          💡 Tip: Para imprimir cualquier registro individual, abre el registro y usa el botón <strong>Imprimir</strong> en la esquina superior derecha.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">Search and export food safety records by date range</p>
        </div>
        {totalCount > 0 && (
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="w-4 h-4" />Export CSV
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)] flex items-center gap-2">
            <Filter className="w-4 h-4" />Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>From</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} max={dateTo} />
            </div>
            <div className="space-y-1.5">
              <Label>To</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} min={dateFrom} max={today} />
            </div>
            <div className="space-y-1.5">
              <Label>Module</Label>
              <select
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-[var(--border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              >
                <option value="all">All modules</option>
                {MODULES.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
            </div>
          </div>
          <Button onClick={handleSearch} loading={loading}>
            <FileText className="w-4 h-4" />Generate Report
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {searched && (
        <>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">{totalCount} record{totalCount !== 1 ? "s" : ""} found</h2>
            <span className="text-sm text-[var(--muted-foreground)]">{formatDate(dateFrom)} – {formatDate(dateTo)}</span>
          </div>

          {totalCount === 0 ? (
            <Card><CardContent className="py-12 text-center text-[var(--muted-foreground)]">No records found for the selected filters.</CardContent></Card>
          ) : (
            MODULES
              .filter((mod) => results[mod.key]?.length > 0)
              .map((mod) => (
                <Card key={mod.key}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold">{mod.label}</CardTitle>
                      <Badge variant="secondary">{results[mod.key].length} records</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full">
                      <tbody>
                        {results[mod.key].map((row) => (
                          <tr key={row.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/30">
                            <td className="px-4 py-2.5 text-sm">{formatDate(row.date)}</td>
                            <td className="px-4 py-2.5">{row.status && <LogStatusBadge status={row.status as any} />}</td>
                            <td className="px-4 py-2.5 text-right">
                              <Link href={row.href} className="text-xs text-blue-600 hover:underline">View →</Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              ))
          )}
        </>
      )}
    </div>
  )
}
