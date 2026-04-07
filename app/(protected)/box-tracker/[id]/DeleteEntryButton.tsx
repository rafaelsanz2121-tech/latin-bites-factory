"use client"

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"

interface Props {
  entryId:   string
  boxNumber: number
}

export function DeleteEntryButton({ entryId, boxNumber }: Props) {
  const router   = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar la Caja #${boxNumber}? Esto no se puede deshacer.`)) return
    setLoading(true)

    const { error } = await supabase.from("box_entries").delete().eq("id", entryId)

    if (error) {
      toast.error("Error al eliminar")
      setLoading(false)
      return
    }

    toast.success(`Caja #${boxNumber} eliminada`)
    router.refresh()
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      title="Eliminar caja"
      className="inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-400 dark:text-slate-600 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  )
}
