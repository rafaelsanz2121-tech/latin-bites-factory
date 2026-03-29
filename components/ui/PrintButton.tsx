"use client"
import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  module: string  // e.g. "thawing", "receiving", "cooking", etc.
  id: string
  className?: string
}

export function PrintButton({ module, id, className }: Props) {
  const handlePrint = () => {
    const url = `/print/${module}/${id}`
    const win = window.open(url, "_blank", "width=900,height=700")
    if (win) {
      win.onload = () => {
        win.focus()
        win.print()
      }
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handlePrint} className={className}>
      <Printer className="w-4 h-4" />
      Export PDF
    </Button>
  )
}
