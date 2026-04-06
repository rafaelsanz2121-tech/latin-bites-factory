"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Loader2, Save, Building2 } from "lucide-react"

interface Org {
  id:         string
  name:       string
  slug:       string
  est_number: string | null
  phone:      string | null
  address:    string | null
  city:       string | null
  state:      string | null
  zip:        string | null
  logo_url:   string | null
  plan:       string
  subscription_status: string
  trial_ends_at: string
}

export function OrgSettingsForm({ org }: { org: Org }) {
  const [form, setForm] = useState({
    name:       org.name       ?? "",
    est_number: org.est_number ?? "",
    phone:      org.phone      ?? "",
    address:    org.address    ?? "",
    city:       org.city       ?? "",
    state:      org.state      ?? "",
    zip:        org.zip        ?? "",
  })
  const [loading, setLoading] = useState(false)
  const [dirty,   setDirty]   = useState(false)
  const supabase = createClient()

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
    setDirty(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!dirty) return
    setLoading(true)
    try {
      const { error } = await supabase
        .from("organizations")
        .update({ ...form, updated_at: new Date().toISOString() })
        .eq("id", org.id)

      if (error) throw error
      toast.success("Establecimiento actualizado ✓")
      setDirty(false)
    } catch (err: any) {
      toast.error(err.message ?? "Error al guardar")
    } finally {
      setLoading(false)
    }
  }

  const PLAN_LABEL: Record<string, string> = {
    starter: "Starter · $299/mo", pro: "Pro · $499/mo", enterprise: "Enterprise · $799/mo",
  }
  const PLAN_COLOR: Record<string, string> = {
    starter: "bg-slate-100 text-slate-700", pro: "bg-blue-100 text-blue-700", enterprise: "bg-purple-100 text-purple-700",
  }
  const STATUS_COLOR: Record<string, string> = {
    trial: "bg-amber-100 text-amber-700", active: "bg-green-100 text-green-700",
    past_due: "bg-red-100 text-red-700",  canceled: "bg-slate-100 text-slate-500",
  }
  const STATUS_ES: Record<string, string> = {
    trial: "Período de prueba", active: "Activo", past_due: "Pago vencido", canceled: "Cancelado",
  }

  const trialEnd = org.trial_ends_at
    ? new Date(org.trial_ends_at).toLocaleDateString("es-US", { day: "2-digit", month: "long", year: "numeric" })
    : null

  return (
    <form onSubmit={handleSave} className="space-y-6">

      {/* ── Plan card (read-only) ─────────────────────────────── */}
      <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Plan FactorOS</span>
        </div>
        <div className="px-5 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className={`text-xs font-bold px-3 py-1 rounded-full capitalize ${PLAN_COLOR[org.plan] ?? PLAN_COLOR.starter}`}>
              {PLAN_LABEL[org.plan] ?? org.plan}
            </span>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${STATUS_COLOR[org.subscription_status] ?? ""}`}>
              {STATUS_ES[org.subscription_status] ?? org.subscription_status}
            </span>
            {org.subscription_status === "trial" && trialEnd && (
              <span className="text-xs  text-slate-600 dark:text-slate-300">Prueba hasta: <strong>{trialEnd}</strong></span>
            )}
          </div>
          <a
            href="mailto:sales@factorios.com?subject=Upgrade%20FactorOS"
            className="text-xs font-semibold text-purple-600 hover:text-purple-700 underline underline-offset-2 transition-colors"
          >
            Actualizar plan →
          </a>
        </div>
      </div>

      {/* ── Establishment info (editable) ────────────────────── */}
      <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
          <Building2 className="w-4 h-4  text-slate-600 dark:text-slate-300" />
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Datos del Establecimiento</span>
        </div>
        <div className="p-5 space-y-4">

          {/* Name + EST row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Nombre de la empresa <span className="text-red-400">*</span>
              </label>
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                required
                placeholder="Latin Bites Factory"
                className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-300 focus:outline-none focus:border-blue-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                EST No. (USDA)
              </label>
              <input
                value={form.est_number}
                onChange={(e) => set("est_number", e.target.value)}
                placeholder="M/P2643"
                className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-300 focus:outline-none focus:border-blue-400 transition-colors font-mono"
              />
            </div>
          </div>

          {/* Phone + Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Teléfono
              </label>
              <input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+1 (305) 555-0100"
                type="tel"
                className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-300 focus:outline-none focus:border-blue-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Dirección
              </label>
              <input
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder="1234 NW 82nd Ave"
                className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-300 focus:outline-none focus:border-blue-400 transition-colors"
              />
            </div>
          </div>

          {/* City + State + ZIP */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Ciudad
              </label>
              <input
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                placeholder="Miami"
                className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-300 focus:outline-none focus:border-blue-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Estado
              </label>
              <input
                value={form.state}
                onChange={(e) => set("state", e.target.value)}
                placeholder="FL"
                maxLength={2}
                className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-300 focus:outline-none focus:border-blue-400 transition-colors uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                ZIP
              </label>
              <input
                value={form.zip}
                onChange={(e) => set("zip", e.target.value)}
                placeholder="33126"
                className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-300 focus:outline-none focus:border-blue-400 transition-colors font-mono"
              />
            </div>
          </div>
        </div>

        {/* Save bar */}
        <div className={`px-5 py-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between transition-colors ${
          dirty ? "bg-white dark:bg-[#111827]" : "bg-slate-50/60 dark:bg-white/[0.02]"
        }`}>
          <p className={`text-xs font-medium ${dirty ? "text-slate-900 dark:text-slate-100" : "text-slate-400"}`}>
            {dirty ? "Tienes cambios sin guardar" : "Información guardada"}
          </p>
          <button
            type="submit"
            disabled={!dirty || loading}
            className="inline-flex items-center gap-2 px-5 py-2 bg-slate-800 dark:bg-white hover:bg-slate-700 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-sm font-bold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Guardando…</>
              : <><Save className="w-3.5 h-3.5" /> Guardar cambios</>
            }
          </button>
        </div>
      </div>
    </form>
  )
}
