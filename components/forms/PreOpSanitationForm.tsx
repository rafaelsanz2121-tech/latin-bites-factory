"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { TermTip } from "@/components/ui/TermTip"
import { toast } from "sonner"
import { CheckCircle, XCircle, MinusCircle, ChevronDown, ChevronRight } from "lucide-react"
import { PREOP_SECTIONS } from "@/constants/areas"
import { cn } from "@/lib/utils"

type CheckValue = "pass" | "fail" | "na" | ""
type ItemsState = Record<string, Record<string, CheckValue>>

function buildInitialItems(): ItemsState {
  const state: ItemsState = {}
  for (const section of PREOP_SECTIONS) {
    state[section.section] = {}
    for (const item of section.items) {
      if (section.hasDualPeriod) {
        state[section.section][`${item.key}_am`] = ""
        state[section.section][`${item.key}_pm`] = ""
      } else {
        state[section.section][item.key] = ""
      }
    }
  }
  return state
}

type ActiveCheckValue = "pass" | "fail" | "na"
function CheckButton({ value, target, onClick }: { value: CheckValue; target: ActiveCheckValue; onClick: () => void }) {
  const isActive = value === target
  const configs: Record<ActiveCheckValue, { icon: React.ElementType; active: string; inactive: string }> = {
    pass: { icon: CheckCircle, active: "bg-emerald-100 text-emerald-700 border-emerald-400", inactive: "text-[var(--muted-foreground)] border-[var(--border)] hover:bg-emerald-50 hover:text-emerald-600" },
    fail: { icon: XCircle, active: "bg-red-100 text-red-700 border-red-400", inactive: "text-[var(--muted-foreground)] border-[var(--border)] hover:bg-red-50 hover:text-red-600" },
    na: { icon: MinusCircle, active: "bg-slate-100 text-slate-600 border-slate-400", inactive: "text-[var(--muted-foreground)] border-[var(--border)] hover:bg-slate-50" },
  }
  const config = configs[target]
  const Icon = config.icon
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium transition-colors", isActive ? config.active : config.inactive)}
    >
      <Icon className="w-3.5 h-3.5" />
      {target === "na" ? "N/A" : target === "pass" ? "✓" : "✗"}
    </button>
  )
}

function SectionGrid({
  section,
  items,
  onSet,
}: {
  section: typeof PREOP_SECTIONS[number]
  items: Record<string, CheckValue>
  onSet: (key: string, val: CheckValue) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const allKeys = Object.keys(items)
  const filled = allKeys.filter((k) => items[k] !== "").length
  const hasFail = allKeys.some((k) => items[k] === "fail")

  return (
    <div className="border border-[var(--border)] rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center justify-between p-4 bg-[var(--muted)]/40 hover:bg-[var(--muted)]/70 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown className="w-4 h-4 text-[var(--muted-foreground)]" /> : <ChevronRight className="w-4 h-4 text-[var(--muted-foreground)]" />}
          <span className="font-semibold text-sm">{section.label}</span>
          {hasFail && <span className="text-xs text-red-600 font-semibold bg-red-50 px-2 py-0.5 rounded">Tiene Fallas</span>}
        </div>
        <span className="text-xs text-[var(--muted-foreground)]">{filled}/{allKeys.length}</span>
      </button>

      {expanded && (
        <div className="divide-y divide-[var(--border)]">
          {section.hasDualPeriod ? (
            <>
              <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-4 py-2 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
                <span>Item</span>
                <span className="w-32 text-center">AM</span>
                <span className="w-32 text-center">PM</span>
              </div>
              {section.items.map((item) => (
                <div key={item.key} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center px-4 py-2.5">
                  <span className="text-sm">{item.label}</span>
                  <div className="flex gap-1 w-32 justify-center">
                    {(["pass", "fail", "na"] as ActiveCheckValue[]).map((v) => (
                      <CheckButton key={v} value={items[`${item.key}_am`]} target={v} onClick={() => onSet(`${item.key}_am`, v)} />
                    ))}
                  </div>
                  <div className="flex gap-1 w-32 justify-center">
                    {(["pass", "fail", "na"] as ActiveCheckValue[]).map((v) => (
                      <CheckButton key={v} value={items[`${item.key}_pm`]} target={v} onClick={() => onSet(`${item.key}_pm`, v)} />
                    ))}
                  </div>
                </div>
              ))}
            </>
          ) : (
            section.items.map((item) => (
              <div key={item.key} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-sm">{item.label}</span>
                <div className="flex gap-1">
                  {(["pass", "fail", "na"] as ActiveCheckValue[]).map((v) => (
                    <CheckButton key={v} value={items[item.key]} target={v} onClick={() => onSet(item.key, v)} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export function PreOpSanitationForm() {
  const router = useRouter()
  const supabase = createClient()
  const today = new Date().toISOString().split("T")[0]

  const [reportDate, setReportDate] = useState(today)
  const [inspectionTime, setInspectionTime] = useState(() => {
    const now = new Date()
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
  })
  const [generalNotes, setGeneralNotes] = useState("")
  const [items, setItems] = useState<ItemsState>(buildInitialItems)
  const [loading, setLoading] = useState(false)

  const setItem = (section: string, key: string, val: CheckValue) => {
    setItems((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: val },
    }))
  }

  const getTotals = () => {
    let pass = 0, fail = 0, na = 0, total = 0
    for (const section of Object.values(items)) {
      for (const val of Object.values(section)) {
        total++
        if (val === "pass") pass++
        else if (val === "fail") fail++
        else if (val === "na") na++
      }
    }
    return { pass, fail, na, total }
  }

  const handleSubmit = async (submitForVerification: boolean) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error("Not authenticated"); return }

    const { pass, fail, na, total } = getTotals()
    const filled = pass + fail + na
    if (filled < total * 0.5) {
      toast.error("Please complete at least half the checklist before submitting")
      return
    }

    setLoading(true)

    const { data: report, error } = await supabase
      .from("preop_sanitation_reports")
      .insert({
        report_date: reportDate,
        inspection_time: inspectionTime || null,
        status: submitForVerification ? "submitted" : "draft",
        created_by: user.id,
        general_notes: generalNotes || null,
        total_items: total,
        pass_count: pass,
        fail_count: fail,
        na_count: na,
        submitted_at: submitForVerification ? new Date().toISOString() : null,
        submitted_by: submitForVerification ? user.id : null,
      })
      .select("id")
      .single()

    if (error || !report) { toast.error(error?.message || "Failed to create report"); setLoading(false); return }

    // Insert all items
    const itemRows: any[] = []
    for (const section of PREOP_SECTIONS) {
      const sectionItems = items[section.section]
      for (const item of section.items) {
        if (section.hasDualPeriod) {
          const amVal = sectionItems[`${item.key}_am`]
          const pmVal = sectionItems[`${item.key}_pm`]
          if (amVal) itemRows.push({ report_id: report.id, section: section.section, item_key: item.key, item_label: item.label, value: amVal, period: "am" })
          if (pmVal) itemRows.push({ report_id: report.id, section: section.section, item_key: item.key, item_label: item.label, value: pmVal, period: "pm" })
        } else {
          const val = sectionItems[item.key]
          if (val) itemRows.push({ report_id: report.id, section: section.section, item_key: item.key, item_label: item.label, value: val, period: null })
        }
      }
    }

    if (itemRows.length > 0) {
      await supabase.from("preop_sanitation_items").insert(itemRows)
    }

    // Auto-create deviation for any failures
    if (fail > 0) {
      const failedItems = itemRows.filter((r) => r.value === "fail").map((r) => r.item_label).join(", ")
      await supabase.from("deviations").insert({
        severity: "minor",
        status: "open",
        date_identified: reportDate,
        identified_by: user.id,
        description: `Pre-Op sanitation failures on ${reportDate}: ${failedItems}`,
        source_log_type: "preop_sanitation_reports",
        source_log_id: report.id,
      })
      toast.warning(`${fail} sanitation failure(s) flagged as deviation`)
    }

    setLoading(false)
    toast.success(submitForVerification ? "Report submitted for verification" : "Report saved as draft")
    router.push(`/sanitation/preop/${report.id}`)
  }

  const { pass, fail, na, total } = getTotals()
  const filled = pass + fail + na

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-[var(--border)] p-6 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="flex items-center">
              Fecha de Inspección
              <TermTip term="preop" />
            </Label>
            <Input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} max={today} />
          </div>
          <div className="space-y-1.5">
            <Label>Hora de Inspección</Label>
            <Input
              type="time"
              value={inspectionTime}
              onChange={(e) => setInspectionTime(e.target.value)}
            />
          </div>
          <div className="flex items-end pb-0.5">
            <div className="text-sm text-[var(--muted-foreground)]">
              <span className="font-medium text-[var(--foreground)]">{filled}</span>/{total} items completed
              {fail > 0 && <span className="ml-2 text-red-600 font-semibold">· {fail} failures</span>}
            </div>
          </div>
        </div>
        <p className="text-xs text-[var(--muted-foreground)] flex items-center gap-1">
          Inspección diaria — debe completarse antes de iniciar operaciones
          <TermTip term="ssop" side="right" />
        </p>
      </div>

      {PREOP_SECTIONS.map((section) => (
        <SectionGrid
          key={section.section}
          section={section}
          items={items[section.section]}
          onSet={(key, val) => setItem(section.section, key, val)}
        />
      ))}

      <div className="bg-white rounded-xl border border-[var(--border)] p-6 space-y-1.5">
        <Label className="flex items-center">
          Notas Generales / Acciones Correctivas
          <TermTip term="capa" />
        </Label>
        <Textarea
          placeholder="Anota problemas encontrados, acciones correctivas tomadas o items de seguimiento..."
          value={generalNotes}
          onChange={(e) => setGeneralNotes(e.target.value)}
        />
      </div>

      <div className="flex items-center justify-between gap-3 pb-6">
        <Button variant="outline" onClick={() => router.back()} type="button">Cancelar</Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleSubmit(false)} loading={loading} type="button">Guardar borrador</Button>
          <Button onClick={() => handleSubmit(true)} loading={loading} type="button">Enviar reporte</Button>
        </div>
      </div>
    </div>
  )
}
