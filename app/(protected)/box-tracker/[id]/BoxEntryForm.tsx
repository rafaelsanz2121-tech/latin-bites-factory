"use client"

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState, useRef, useEffect } from "react"
import { Plus, Scale } from "lucide-react"
import { toast } from "sonner"

interface Props {
  sessionId:     string
  nextBoxNumber: number
}

export function BoxEntryForm({ sessionId, nextBoxNumber }: Props) {
  const router  = useRouter()
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)

  const [weight,  setWeight]  = useState("")
  const [notes,   setNotes]   = useState("")
  const [loading, setLoading] = useState(false)

  // Auto-focus the weight input on mount
  useEffect(() => { inputRef.current?.focus() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const w = parseFloat(weight)
    if (!weight || isNaN(w) || w <= 0) {
      toast.error("Ingresa un peso válido mayor a 0")
      inputRef.current?.focus()
      return
    }

    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile }  = await supabase
      .from("profiles")
      .select("id, organization_id")
      .eq("id", user!.id)
      .single()

    const { error } = await supabase.from("box_entries").insert({
      session_id:      sessionId,
      organization_id: profile!.organization_id,
      box_number:      nextBoxNumber,
      weight_lbs:      w,
      logged_by:       profile!.id,
      notes:           notes.trim() || null,
    })

    if (error) {
      toast.error("Error al registrar caja: " + error.message)
      setLoading(false)
      return
    }

    toast.success(`✓ Caja #${nextBoxNumber} — ${w.toFixed(2)} lbs`, { duration: 2000 })
    setWeight("")
    setNotes("")
    setLoading(false)
    router.refresh()
    // Re-focus input for rapid entry
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  return (
    <div className="rounded-xl border-2 border-emerald-300 dark:border-emerald-700/60 bg-white dark:bg-[#111827] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-200 dark:border-emerald-800/40">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
            Registrar Caja <span className="font-black text-emerald-600 dark:text-emerald-300">#{nextBoxNumber}</span>
          </p>
        </div>
        <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
          Ingresa el peso de la báscula y presiona Enter o el botón
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-5">
        <div className="flex items-end gap-3">
          {/* Big weight input */}
          <div className="flex-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Peso (lbs) *
            </label>
            <input
              ref={inputRef}
              type="number"
              step="0.01"
              min="0.01"
              max="9999"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="0.00"
              required
              className="w-full px-4 py-4 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-3xl font-black text-slate-900 dark:text-white text-center tabular-nums placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Optional notes */}
          <div className="w-48 hidden sm:block">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Nota (opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: caja rota..."
              maxLength={80}
              className="w-full px-3 py-4 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="flex-shrink-0 h-[60px] px-6 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold rounded-xl transition-colors shadow-sm inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">{loading ? "..." : "Agregar"}</span>
          </button>
        </div>
      </form>
    </div>
  )
}
