"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"

export default function NewCorrectiveActionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const deviationId = searchParams.get("deviation")
  const supabase = createClient()
  const today = new Date().toISOString().split("T")[0]
  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

  const [users, setUsers] = useState<any[]>([])
  const [form, setForm] = useState({
    capa_type: "corrective",
    assigned_to: "",
    root_cause: "",
    action_description: "",
    due_date: in30,
    preventive_measure: "",
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from("profiles").select("id, full_name, initials, role").eq("is_active", true).order("full_name").then(({ data }) => {
      if (data) setUsers(data)
    })
  }, [])

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))

  const handleSubmit = async () => {
    if (!form.assigned_to) { toast.error("Assign to someone"); return }
    if (!form.root_cause.trim()) { toast.error("Root cause required"); return }
    if (!form.action_description.trim()) { toast.error("Action description required"); return }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error("Not authenticated"); return }

    setLoading(true)
    const { data, error } = await supabase.from("corrective_actions").insert({
      capa_type: form.capa_type,
      status: "open",
      deviation_id: deviationId || null,
      date_opened: today,
      assigned_to: form.assigned_to,
      assigned_by: user.id,
      root_cause: form.root_cause,
      action_description: form.action_description,
      due_date: form.due_date,
      preventive_measure: form.preventive_measure || null,
    }).select("id").single()

    setLoading(false)
    if (error) { toast.error(error.message); return }

    // Update deviation status if linked
    if (deviationId) {
      await supabase.from("deviations").update({ status: "corrective_action_pending" }).eq("id", deviationId)
    }

    toast.success("CAPA created")
    router.push(`/corrective-actions/${data.id}`)
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold">New CAPA</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">Create a corrective or preventive action</p>
        {deviationId && <p className="text-xs text-blue-600 mt-1">Linked to deviation: {deviationId.slice(0, 8)}...</p>}
      </div>

      <div className="bg-white rounded-xl border border-[var(--border)] divide-y divide-[var(--border)]">
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>CAPA Type</Label>
              <Select value={form.capa_type} onValueChange={(v) => set("capa_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="corrective">🔧 Corrective</SelectItem>
                  <SelectItem value="preventive">🛡️ Preventive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Due Date <span className="text-red-500">*</span></Label>
              <Input type="date" value={form.due_date} onChange={(e) => set("due_date", e.target.value)} min={today} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Assign To <span className="text-red-500">*</span></Label>
            <Select value={form.assigned_to} onValueChange={(v) => set("assigned_to", v)}>
              <SelectTrigger><SelectValue placeholder="Select person responsible..." /></SelectTrigger>
              <SelectContent>
                {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.full_name} ({u.role})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <Label>Root Cause <span className="text-red-500">*</span></Label>
            <Textarea placeholder="What caused this issue?" value={form.root_cause} onChange={(e) => set("root_cause", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Action Description <span className="text-red-500">*</span></Label>
            <Textarea placeholder="What specific actions will be taken to correct this?" value={form.action_description} onChange={(e) => set("action_description", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Preventive Measure (optional)</Label>
            <Textarea placeholder="How will this be prevented from happening again?" value={form.preventive_measure} onChange={(e) => set("preventive_measure", e.target.value)} />
          </div>
        </div>

        <div className="p-6 flex items-center justify-between gap-3">
          <Button variant="outline" onClick={() => router.back()} type="button">Cancel</Button>
          <Button onClick={handleSubmit} loading={loading} type="button">Create CAPA</Button>
        </div>
      </div>
    </div>
  )
}
