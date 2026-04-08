"use client"

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

interface AiRule {
  id: string
  rule_type: string
  value: number
  action: string
  message: string | null
  is_active: boolean
}

interface Props {
  sessionId: string
  boxCount: number
  rules: AiRule[]
}

export function CloseSessionButton({ sessionId, boxCount, rules }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [confirm, setConfirm] = useState(false)

  const handleClose = async () => {
    // Check min_boxes_close rule before confirming
    const minBoxesRule = rules.find(
      (r) => r.is_active && r.rule_type === "min_boxes_close"
    )

    if (minBoxesRule && boxCount < minBoxesRule.value) {
      const msg =
        minBoxesRule.message ||
        `Mínimo ${minBoxesRule.value} cajas requeridas para cerrar. Actualmente: ${boxCount}`
      toast.error(msg, { duration: 5000 })
      return
    }

    if (!confirm) {
      setConfirm(true)
      return
    }

    setLoading(true)

    const { error } = await supabase
      .from("box_sessions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", sessionId)

    if (error) {
      toast.error("Error al cerrar la sesión: " + error.message)
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
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
        confirm
          ? "bg-red-600 hover:bg-red-700 text-white shadow-sm"
          : "bg-white/20 hover:bg-white/30 text-white"
      } disabled:opacity-60`}
      onBlur={() => setTimeout(() => setConfirm(false), 3000)}
    >
      <CheckCircle2 className="w-4 h-4" />
      {loading
        ? "Cerrando..."
        : confirm
        ? "¿Confirmar cierre?"
        : "Cerrar Producción"}
    </button>
  )
}
