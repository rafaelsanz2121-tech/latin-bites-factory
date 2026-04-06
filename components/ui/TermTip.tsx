"use client"

/**
 * TermTip — pequeño ícono "?" que muestra una definición en español al pasar el mouse.
 * Uso:
 *   <TermTip term="CCP" />
 *   <TermTip term="CCP" label="Punto Crítico de Control" />
 */

import { GLOSSARY } from "@/constants/glossary"
import { HelpCircle } from "lucide-react"
import { useState } from "react"

interface TermTipProps {
  term: string          // clave en GLOSSARY
  label?: string        // si quieres sobreescribir el label del glosario
  side?: "top" | "bottom" | "right" | "left"
}

export function TermTip({ term, label, side = "top" }: TermTipProps) {
  const [open, setOpen] = useState(false)
  const entry = GLOSSARY[term]
  if (!entry) return null

  const posClass: Record<string, string> = {
    top:    "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    right:  "left-full top-1/2 -translate-y-1/2 ml-2",
    left:   "right-full top-1/2 -translate-y-1/2 mr-2",
  }

  const arrowClass: Record<string, string> = {
    top:    "top-full left-1/2 -translate-x-1/2 border-t-slate-800",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-b-slate-800",
    right:  "right-full top-1/2 -translate-y-1/2 border-r-slate-800",
    left:   "left-full top-1/2 -translate-y-1/2 border-l-slate-800",
  }

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        className="ml-1 text-[var(--muted-foreground)] hover:text-blue-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-full"
        aria-label={`Qué es ${label ?? entry.title}`}
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div
          role="tooltip"
          className={`absolute z-50 w-64 ${posClass[side]}`}
        >
          {/* Flecha */}
          <div
            className={`absolute w-0 h-0 border-4 border-transparent ${arrowClass[side]}`}
          />
          {/* Caja */}
          <div className="bg-slate-800 text-white text-xs rounded-lg shadow-xl p-3 space-y-1">
            <p className="font-bold text-blue-300 text-[11px] uppercase tracking-wide">
              {label ?? entry.title}
            </p>
            <p className="leading-relaxed text-slate-200">{entry.definition}</p>
            {entry.example && (
              <p className="text-slate-600 dark:text-slate-400 italic text-[11px]">Ej: {entry.example}</p>
            )}
          </div>
        </div>
      )}
    </span>
  )
}
