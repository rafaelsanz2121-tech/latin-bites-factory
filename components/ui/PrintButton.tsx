"use client"
import { Printer } from "lucide-react"

interface Props {
  module: string
  id: string
  className?: string
}

export function PrintButton({ module, id, className = "" }: Props) {
  const handlePrint = () => {
    window.open(`/print/${module}/${id}`, "_blank")
  }
  return (
    <button
      onClick={handlePrint}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 transition-all ${className}`}
    >
      <Printer className="w-3.5 h-3.5" />
      Imprimir
    </button>
  )
}
