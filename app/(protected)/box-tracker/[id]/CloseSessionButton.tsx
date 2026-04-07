"use client"

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

interface Props {
  sessionId: string
}

export function CloseSessionButton({ sessionId }: Props) {
  const router   = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [confirm, setConfirm] = useState(false)

  const handleClose = async () => {
    if (!confirm) { setConfirm(true); return }
    setLoading(true)

    const { error } = await supabase
      .from("box_sessions")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", sessionId)

    if (error) {
      toast.error("Error al cerrar sesión")
      setLoading(false)
      setConfirm(false)
      return
    }

    toast.success("¡Producción completada! Sesión cerrada.")
    router.refresh()
  }

  return (
    <button
      onClick={handleClose}
      disabled={loading}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
        confirm
          ? "bg-red-600 hover:bg-red-700 text-white shadow-sm"
          : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
      }`}
      onBlur={() => setTimeout(() => setConfirm(false), 3000)}
    >
      <CheckCircle2 className="w-4 h-4" />
      {loading ? "Cerrando..." : confirm ? "¿Confirmar cierre?" : "Cerrar Producción"}
    </button>
  )
}
