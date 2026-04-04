"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { PlusCircle, MinusCircle, RefreshCw, Trash2, ChevronDown, ChevronUp, Loader2 } from "lucide-react"

type MovType = "in" | "out" | "adjustment" | "waste"

interface Props {
  itemId:   string
  itemName: string
  unit:     string
  currentStock: number
}

const MOVEMENT_TYPES: { value: MovType; label: string; icon: React.ElementType; color: string; sign: string }[] = [
  { value: "in",         label: "Entrada",    icon: PlusCircle,  color: "text-green-600",  sign: "+" },
  { value: "out",        label: "Salida",     icon: MinusCircle, color: "text-red-500",    sign: "-" },
  { value: "adjustment", label: "Ajuste",     icon: RefreshCw,   color: "text-blue-600",   sign: "±" },
  { value: "waste",      label: "Merma",      icon: Trash2,      color: "text-amber-600",  sign: "-" },
]

export function MovimientoForm({ itemId, itemName, unit, currentStock }: Props) {
  const [open,      setOpen]      = useState(false)
  const [type,      setType]      = useState<MovType>("in")
  const [quantity,  setQuantity]  = useState("")
  const [reference, setReference] = useState("")
  const [notes,     setNotes]     = useState("")
  const [loading,   setLoading]   = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const selectedType = MOVEMENT_TYPES.find((t) => t.value === type)!

  // Preview new stock
  const qty = parseFloat(quantity) || 0
  let newStock = currentStock
  if (type === "in")                             newStock = currentStock + qty
  else if (type === "out" || type === "waste")   newStock = currentStock - qty
  else if (type === "adjustment")                newStock = qty

  const isAdjustment = type === "adjustment"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!quantity || qty <= 0) { toast.error("Ingresa una cantidad válida"); return }
    if (type === "out" && qty > currentStock) {
      toast.error(`No hay suficiente stock. Disponible: ${currentStock} ${unit}`)
      return
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { error } = await supabase.from("inventory_movements").insert({
        inventory_item_id: itemId,
        movement_type:     type,
        quantity:          isAdjustment ? qty : (type === "in" ? qty : -qty),
        reference:         reference || null,
        notes:             notes || null,
        created_by:        user?.id,
      })

      if (error) throw error

      toast.success(`Movimiento registrado · ${selectedType.label} ${qty} ${unit}`)
      setQuantity(""); setReference(""); setNotes("")
      setOpen(false)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message ?? "Error registrando movimiento")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <RefreshCw className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Registrar Movimiento</span>
          <span className="text-[10.5px] bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 font-semibold px-2 py-0.5 rounded-full">
            Stock actual: {currentStock.toLocaleString()} {unit}
          </span>
        </div>
        {open
          ? <ChevronUp   className="w-4 h-4 text-slate-400" />
          : <ChevronDown className="w-4 h-4 text-slate-400" />
        }
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="border-t border-slate-100 dark:border-slate-700 p-5 space-y-4">

          {/* Movement type selector */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tipo de movimiento</p>
            <div className="grid grid-cols-4 gap-2">
              {MOVEMENT_TYPES.map((mt) => (
                <button
                  key={mt.value}
                  type="button"
                  onClick={() => setType(mt.value)}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all text-center ${
                    type === mt.value
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                      : "border-slate-100 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500"
                  }`}
                >
                  <mt.icon className={`w-4 h-4 ${type === mt.value ? mt.color : "text-slate-400"}`} />
                  <span className={`text-[11px] font-bold ${type === mt.value ? mt.color : "text-slate-500"}`}>
                    {mt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Quantity + Reference row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                {isAdjustment ? "Nuevo stock total" : "Cantidad"} ({unit})
              </label>
              <div className="relative">
                <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold ${selectedType.color}`}>
                  {selectedType.sign}
                </span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0"
                  className="w-full pl-8 pr-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-400 transition-colors tabular-nums"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Referencia (opcional)
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Ej: ORD-2024-001, Factura #123"
                className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-300 focus:outline-none focus:border-blue-400 transition-colors"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Notas internas
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Motivo del movimiento, proveedor, observaciones..."
              rows={2}
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-300 focus:outline-none focus:border-blue-400 transition-colors resize-none"
            />
          </div>

          {/* Preview + Submit */}
          <div className="flex items-center justify-between gap-4 pt-1">
            {qty > 0 ? (
              <div className="flex items-center gap-3 text-sm">
                <span className="text-slate-400">Stock resultante:</span>
                <span className={`font-black text-base tabular-nums ${
                  newStock <= 0 ? "text-red-600" : newStock < currentStock ? "text-amber-600" : "text-green-600"
                }`}>
                  {newStock.toLocaleString()} {unit}
                </span>
                {!isAdjustment && (
                  <span className={`text-xs font-semibold ${
                    type === "in" ? "text-green-500" : "text-red-400"
                  }`}>
                    ({type === "in" ? "+" : "-"}{qty.toLocaleString()})
                  </span>
                )}
              </div>
            ) : (
              <div />
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-60"
              >
                {loading
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Guardando…</>
                  : <><selectedType.icon className="w-3.5 h-3.5" /> Confirmar {selectedType.label}</>
                }
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}
