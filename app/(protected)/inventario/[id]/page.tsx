import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, Boxes, Package, AlertTriangle, CheckCircle2,
  TrendingUp, TrendingDown, MapPin, Building2, Hash, Scale,
  ArrowUpRight, ArrowDownRight, RefreshCw, Trash2,
} from "lucide-react"
import { MovimientoForm } from "./MovimientoForm"

function fmt$(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 })
}
function fmtDate(d: string) {
  return new Date(d + (d.includes("T") ? "" : "T12:00:00")).toLocaleDateString("es-US", {
    day: "2-digit", month: "short", year: "numeric",
  })
}
function fmtDateTime(d: string) {
  return new Date(d).toLocaleString("es-US", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  })
}

function stockStatus(current: number, min: number, max: number) {
  if (current <= 0)          return { label: "Agotado",     color: "text-red-600",    bg: "bg-red-50",    bar: "bg-red-500",    pct: 0    }
  if (current <= min)        return { label: "Stock Bajo",  color: "text-orange-600", bg: "bg-orange-50", bar: "bg-orange-400", pct: Math.min(100, (current / Math.max(max, 1)) * 100) }
  if (current <= min * 1.5)  return { label: "Precaución",  color: "text-amber-600",  bg: "bg-amber-50",  bar: "bg-amber-400",  pct: Math.min(100, (current / Math.max(max, 1)) * 100) }
  return                           { label: "OK",           color: "text-green-600",  bg: "bg-green-50",  bar: "bg-green-500",  pct: Math.min(100, (current / Math.max(max, 1)) * 100) }
}

const MOV_TYPE: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  in:         { label: "Entrada",  icon: ArrowUpRight,   color: "text-green-700",  bg: "bg-green-50"  },
  out:        { label: "Salida",   icon: ArrowDownRight, color: "text-red-700",    bg: "bg-red-50"    },
  adjustment: { label: "Ajuste",   icon: RefreshCw,      color: "text-blue-700",   bg: "bg-blue-50"   },
  waste:      { label: "Merma",    icon: Trash2,         color: "text-amber-700",  bg: "bg-amber-50"  },
}

const CATEGORY_ES: Record<string, string> = {
  raw_material:  "Materia Prima",
  packaging:     "Empaque",
  finished_good: "Producto Terminado",
  supply:        "Insumos",
  chemical:      "Químicos / Sanitizantes",
}

export default async function InventarioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  /* ── Item ── */
  const { data: item } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("id", id)
    .single()

  if (!item) notFound()

  /* ── Movements (last 60) ── */
  let movements: any[] = []
  let movError = false
  try {
    const { data, error } = await supabase
      .from("inventory_movements")
      .select("id, movement_type, quantity, reference, notes, created_at, profiles!created_by(full_name)")
      .eq("inventory_item_id", id)
      .order("created_at", { ascending: false })
      .limit(60)

    if (error) movError = true
    else movements = data || []
  } catch { movError = true }

  /* ── Aggregates from movements ── */
  const totalIn    = movements.filter((m) => m.quantity > 0).reduce((s, m) => s + Number(m.quantity), 0)
  const totalOut   = movements.filter((m) => m.quantity < 0).reduce((s, m) => s + Math.abs(Number(m.quantity)), 0)

  const status     = stockStatus(item.current_stock, item.min_stock ?? 0, item.max_stock ?? (item.min_stock ? item.min_stock * 3 : 100))
  const totalValue = Number(item.current_stock) * Number(item.cost_per_unit ?? 0)
  const maxStock   = item.max_stock || (item.min_stock ? item.min_stock * 3 : 100)

  return (
    <div className="space-y-5 max-w-[1000px]">

      {/* Back + header */}
      <div>
        <Link href="/inventario" className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-600 mb-3 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Volver a Inventario
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                <Boxes className="w-4 h-4 text-blue-600" />
              </span>
              {item.name}
            </h1>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {item.sku && (
                <span className="flex items-center gap-1 text-xs  text-slate-600 dark:text-slate-300">
                  <Hash className="w-3 h-3" /> {item.sku}
                </span>
              )}
              <span className="text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">
                {CATEGORY_ES[item.category] ?? item.category}
              </span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
                {status.label}
              </span>
            </div>
          </div>
          {/* Edit button */}
          <Link
            href={`/inventario/${id}/editar`}
            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-600 text-sm font-semibold text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors"
          >
            Editar artículo
          </Link>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Stock Actual",
            value: `${Number(item.current_stock).toLocaleString()} ${item.unit}`,
            icon: Scale,
            bg: status.bg, text: status.color,
          },
          {
            label: "Valor en Planta",
            value: totalValue > 0 ? fmt$(totalValue) : "—",
            icon: TrendingUp,
            bg: "bg-white dark:bg-[#111827]", text: "text-slate-900 dark:text-slate-100",
          },
          {
            label: "Entradas (hist.)",
            value: `+${totalIn.toLocaleString()} ${item.unit}`,
            icon: ArrowUpRight,
            bg: "bg-white dark:bg-[#111827]", text: "text-slate-900 dark:text-slate-100",
          },
          {
            label: "Salidas (hist.)",
            value: `-${totalOut.toLocaleString()} ${item.unit}`,
            icon: ArrowDownRight,
            bg: "bg-white dark:bg-[#111827]", text: "text-slate-900 dark:text-slate-100",
          },
        ].map((k) => (
          <div key={k.label} className={`rounded-xl border p-4 ${k.bg} border-transparent`}>
            <div className={`w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700/60 flex items-center justify-center mb-3`}>
              <k.icon className={`w-3.5 h-3.5 ${k.iconText ?? k.text}`} />
            </div>
            <p className={`text-xl font-black leading-none ${k.iconText ?? k.text}`}>{k.value}</p>
            <p className="text-[10.5px] font-medium text-slate-600 dark:text-slate-400 mt-1.5">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Stock gauge + item details */}
        <div className="space-y-4">

          {/* Stock level bar */}
          <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">Nivel de Stock</h3>

            <div className="flex items-end justify-between mb-2">
              <div>
                <span className="text-3xl font-black text-slate-800 dark:text-slate-100 tabular-nums">
                  {Number(item.current_stock).toLocaleString()}
                </span>
                <span className="text-sm text-slate-600 dark:text-slate-300 ml-1.5">{item.unit}</span>
              </div>
              <span className={`text-sm font-bold ${status.color} ${status.bg} px-2 py-0.5 rounded-full`}>
                {status.label}
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden relative">
              <div
                className={`h-full ${status.bar} rounded-full transition-all duration-500`}
                style={{ width: `${status.pct}%` }}
              />
              {/* Min stock marker */}
              {item.min_stock > 0 && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-orange-400 opacity-70"
                  style={{ left: `${(item.min_stock / maxStock) * 100}%` }}
                  title={`Mínimo: ${item.min_stock}`}
                />
              )}
            </div>

            <div className="flex items-center justify-between mt-2 text-[10.5px]  text-slate-600 dark:text-slate-300">
              <span>0</span>
              <span className="text-orange-500 font-semibold">mín {item.min_stock?.toLocaleString() ?? "—"}</span>
              <span>{maxStock.toLocaleString()} {item.unit}</span>
            </div>

            {item.current_stock <= (item.min_stock ?? 0) && (
              <div className="mt-3 flex items-center gap-2 bg-white dark:bg-[#111827] rounded-lg px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">Reabastecer pronto</span>
              </div>
            )}
          </div>

          {/* Item details */}
          <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">Detalles del Artículo</h3>
            {[
              { label: "Categoría",      value: CATEGORY_ES[item.category] ?? item.category, icon: Package },
              { label: "Unidad de medida", value: item.unit,               icon: Scale },
              { label: "Costo unitario",   value: item.cost_per_unit ? fmt$(Number(item.cost_per_unit)) : "—", icon: TrendingUp },
              { label: "Proveedor",        value: item.supplier ?? "No especificado", icon: Building2 },
              { label: "Ubicación",        value: item.location ?? "No especificada", icon: MapPin },
            ].map((row) => (
              <div key={row.label} className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-slate-50 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                  <row.icon className="w-3.5 h-3.5  text-slate-600 dark:text-slate-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">{row.label}</p>
                  <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 truncate">{row.value}</p>
                </div>
              </div>
            ))}
            {item.notes && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">Notas</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{item.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Movement history */}
        <div className="lg:col-span-2 space-y-4">

          {/* Register movement form */}
          <MovimientoForm
            itemId={id}
            itemName={item.name}
            unit={item.unit}
            currentStock={Number(item.current_stock)}
          />

          {/* History table */}
          <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Historial de Movimientos</h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">{movements.length} registros</p>
              </div>
              {movError && (
                <span className="text-[11px] text-amber-600 font-semibold bg-amber-50 px-2 py-1 rounded-lg">
                  Ejecutar migración 012
                </span>
              )}
            </div>

            {movements.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-slate-300">
                <Boxes className="w-8 h-8 mb-2" />
                <p className="text-sm font-medium  text-slate-600 dark:text-slate-300">Sin movimientos registrados</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">Usa el formulario de arriba para registrar el primer movimiento</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {movements.map((mov) => {
                  const mt   = MOV_TYPE[mov.movement_type] ?? MOV_TYPE.in
                  const qty  = Math.abs(Number(mov.quantity))
                  const sign = Number(mov.quantity) > 0 ? "+" : "-"
                  return (
                    <div key={mov.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                      <div className={`w-8 h-8 rounded-lg ${mt.bg} flex items-center justify-center flex-shrink-0`}>
                        <mt.icon className={`w-4 h-4 ${mt.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-bold ${mt.color} ${mt.bg} px-2 py-0.5 rounded-full`}>
                            {mt.label}
                          </span>
                          {mov.reference && (
                            <span className="text-xs text-slate-600 dark:text-slate-300 font-mono">{mov.reference}</span>
                          )}
                        </div>
                        {mov.notes && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 truncate">{mov.notes}</p>
                        )}
                        <p className="text-[10.5px] text-slate-600 dark:text-slate-300 mt-0.5">
                          {fmtDateTime(mov.created_at)}
                          {(mov.profiles as any)?.full_name && ` · ${(mov.profiles as any).full_name}`}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className={`text-[15px] font-black tabular-nums ${
                          Number(mov.quantity) > 0 ? "text-green-600" : "text-red-500"
                        }`}>
                          {sign}{qty.toLocaleString()}
                        </span>
                        <p className="text-[10px]  text-slate-600 dark:text-slate-300">{item.unit}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
