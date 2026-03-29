"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Plus, Trash2, CheckCircle, XCircle, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

interface InspectionBlock {
  area: string
  time: string
  cleaned_by: string
  verified_by: string
  notes: string
}

const SANITIZER_PPM_MIN = 100
const SANITIZER_PPM_MAX = 400

export default function NewOperationalSanitationPage() {
  const router = useRouter()
  const supabase = createClient()
  const today = new Date().toISOString().split("T")[0]
  const now = new Date().toTimeString().slice(0, 5)

  const [logDate, setLogDate] = useState(today)
  const [sanitizerPpm, setSanitizerPpm] = useState("")
  const [sanitizerTime, setSanitizerTime] = useState(now)
  const [bladesInspected, setBladesInspected] = useState<boolean | null>(null)
  const [bladesNotes, setBladesNotes] = useState("")
  const [generalNotes, setGeneralNotes] = useState("")
  const [blocks, setBlocks] = useState<InspectionBlock[]>([
    { area: "", time: now, cleaned_by: "", verified_by: "", notes: "" },
  ])
  const [loading, setLoading] = useState(false)

  const ppmValue = parseFloat(sanitizerPpm)
  const sanitizerPass = sanitizerPpm !== "" ? ppmValue >= SANITIZER_PPM_MIN && ppmValue <= SANITIZER_PPM_MAX : null

  const addBlock = () => setBlocks((p) => [...p, { area: "", time: now, cleaned_by: "", verified_by: "", notes: "" }])
  const removeBlock = (i: number) => setBlocks((p) => p.filter((_, idx) => idx !== i))
  const setBlock = (i: number, field: keyof InspectionBlock, val: string) => {
    setBlocks((p) => p.map((b, idx) => idx === i ? { ...b, [field]: val } : b))
  }

  const handleSubmit = async (submitForVerification: boolean) => {
    if (blocks.every((b) => !b.area.trim())) {
      toast.error("Add at least one inspection area")
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error("Not authenticated"); return }

    setLoading(true)

    const { data, error } = await supabase.from("operational_sanitation_logs").insert({
      log_date: logDate,
      status: submitForVerification ? "submitted" : "draft",
      created_by: user.id,
      sanitizer_ppm: sanitizerPpm !== "" ? ppmValue : null,
      sanitizer_time: sanitizerTime || null,
      sanitizer_pass: sanitizerPass,
      blades_inspected: bladesInspected,
      blades_notes: bladesNotes || null,
      general_notes: generalNotes || null,
      inspection_blocks: blocks.filter((b) => b.area.trim()),
      submitted_at: submitForVerification ? new Date().toISOString() : null,
      submitted_by: submitForVerification ? user.id : null,
    }).select("id").single()

    // Auto-flag deviation for out-of-range sanitizer
    if (!error && sanitizerPass === false) {
      await supabase.from("deviations").insert({
        severity: "major",
        status: "open",
        date_identified: logDate,
        identified_by: user.id,
        description: `Sanitizer concentration out of range: ${ppmValue} ppm (required ${SANITIZER_PPM_MIN}–${SANITIZER_PPM_MAX} ppm)`,
        source_log_type: "operational_sanitation_logs",
        source_log_id: data?.id,
      })
      toast.warning("Sanitizer PPM out of range — deviation created")
    }

    setLoading(false)
    if (error) { toast.error(error.message); return }
    toast.success(submitForVerification ? "Log submitted for verification" : "Log saved as draft")
    router.push(`/sanitation/operational/${data.id}`)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Operational Sanitation Log</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">Daily sanitation inspection and chemical concentration check</p>
      </div>

      <div className="bg-white rounded-xl border border-[var(--border)] divide-y divide-[var(--border)]">
        {/* Date */}
        <div className="p-6 space-y-1.5">
          <Label>Log Date</Label>
          <Input type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} max={today} className="max-w-[200px]" />
        </div>

        {/* Sanitizer PPM */}
        <div className="p-6 space-y-4">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-[var(--muted-foreground)]">Sanitizer Concentration Check</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Concentration (PPM) <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="e.g. 200"
                  value={sanitizerPpm}
                  onChange={(e) => setSanitizerPpm(e.target.value)}
                  className={cn(sanitizerPass === false ? "border-red-400 focus:ring-red-300" : sanitizerPass === true ? "border-emerald-400" : "")}
                />
                {sanitizerPass !== null && (
                  <div className="absolute right-2.5 top-2.5">
                    {sanitizerPass ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
                  </div>
                )}
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">Required: {SANITIZER_PPM_MIN}–{SANITIZER_PPM_MAX} ppm</p>
              {sanitizerPass === false && (
                <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 p-2 rounded">
                  <AlertTriangle className="w-3.5 h-3.5" />Out of range — a deviation will be created automatically
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Check Time</Label>
              <Input type="time" value={sanitizerTime} onChange={(e) => setSanitizerTime(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Blades */}
        <div className="p-6 space-y-4">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-[var(--muted-foreground)]">Blades Inspection</h2>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setBladesInspected(true)}
              className={cn("flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors", bladesInspected === true ? "bg-emerald-50 border-emerald-400 text-emerald-700" : "border-[var(--border)] hover:bg-[var(--muted)]")}
            >
              <CheckCircle className="w-4 h-4" />All blades inspected & clean
            </button>
            <button
              type="button"
              onClick={() => setBladesInspected(false)}
              className={cn("flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors", bladesInspected === false ? "bg-red-50 border-red-400 text-red-700" : "border-[var(--border)] hover:bg-[var(--muted)]")}
            >
              <XCircle className="w-4 h-4" />Issues found
            </button>
          </div>
          {bladesInspected === false && (
            <div className="space-y-1.5">
              <Label>Describe issues found</Label>
              <Textarea value={bladesNotes} onChange={(e) => setBladesNotes(e.target.value)} placeholder="Which blades? What issue?" />
            </div>
          )}
        </div>

        {/* Inspection blocks */}
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-[var(--muted-foreground)]">Area Inspections</h2>
            <Button variant="outline" size="sm" type="button" onClick={addBlock}>
              <Plus className="w-3.5 h-3.5" />Add Area
            </Button>
          </div>
          <div className="space-y-3">
            {blocks.map((block, i) => (
              <div key={i} className="p-4 rounded-lg border border-[var(--border)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--muted-foreground)] uppercase">Area {i + 1}</span>
                  {blocks.length > 1 && (
                    <button type="button" onClick={() => removeBlock(i)} className="text-[var(--muted-foreground)] hover:text-red-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Area / Location</Label>
                    <Input placeholder="e.g. Kitchen, Packing..." value={block.area} onChange={(e) => setBlock(i, "area", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Time</Label>
                    <Input type="time" value={block.time} onChange={(e) => setBlock(i, "time", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Cleaned By</Label>
                    <Input placeholder="Name" value={block.cleaned_by} onChange={(e) => setBlock(i, "cleaned_by", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Verified By</Label>
                    <Input placeholder="Name" value={block.verified_by} onChange={(e) => setBlock(i, "verified_by", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Notes</Label>
                  <Input placeholder="Any issues or remarks..." value={block.notes} onChange={(e) => setBlock(i, "notes", e.target.value)} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 space-y-1.5">
          <Label>General Notes</Label>
          <Textarea placeholder="Overall observations, corrective actions taken..." value={generalNotes} onChange={(e) => setGeneralNotes(e.target.value)} />
        </div>

        <div className="p-6 flex items-center justify-between gap-3">
          <Button variant="outline" onClick={() => router.back()} type="button">Cancel</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleSubmit(false)} loading={loading} type="button">Save Draft</Button>
            <Button onClick={() => handleSubmit(true)} loading={loading} type="button">Submit Log</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
