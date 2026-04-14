import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Boxes, AlertTriangle, Plus, ArrowUpRight, TrendingDown, CheckCircle2, Package } from "lucide-react"

const CATEGORY_ES: Record<string, string> = {
  raw_material:  "Materia Prima",
  packaging:     "Empaque",
  finished_good: "Producto Terminado",
  supply:        "Insumos",
  chemical:      "Químicos / Sanitizantes",
}
const CATEGORY_COLOR: Record<string, string> = {
  raw_material:  "bg-blue-50 text-blue-700 border-blue-100",
  packaging:     "bg-purple-50 text-purple-700 border-purple-100",
  finished_good: "bg-emerald-50 text-emerald-700 border-emerald-100",
  supply:        "bg-amber-50 text-amber-700 border-amber-100",
  chemical:      "bg-red-50 text-red-700 border-red-100",
}

function stockStatus(current: number, min: number) {
  if (current <= 0)        return { label: "Agotado",      color: "bg-red-100 text-red-700",    bar: "bg-red-500",    pct: 0 }
  if (current <= min)      return { label: "Stock Bajo",   color: "bg-orange-100 text-orange-700", bar: "bg-orange-400", pct: Math.min(100, (current/Math.max(min,1))*100) }
  if (current <= min * 1.5) return { label: "Precaución",  color: "bg-amber-100 text-amber-700", bar: "bg-amber-400",  pct: Math.min(100, (current/Math.max(min*2,1))*100) }
  return { label: "OK",            color: "bg-green-100 text-green-700",  bar: "bg-green-500",  pct: 100 }
}

export default async function InventarioPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>
}) {
  const { cat } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  let query = supabase
    .from("inventory_items")
    .select("id, name, sku, category, unit, current_stock, min_stock, max_stock, cost_per_unit, supplier, location, is_active")
    .eq("is_active", true)
    .order("name")

  if (cat && cat !== "all") query = query.eq("category", cat)

  const { data: items, error } = await query
  const allItems = items || []

  /* ── KPIs ── */
  const totalItems   = allItems.length
  const lowStock     = allItems.filter((i: any) => Number(i.current_stock) <= Number(i.min_stock) && Number(i.current_stock) > 0)
  const outOfStock   = allItems.filter((i: any) => Number(i.current_stock) <= 0)
  const totalValue   = allItems.reduce((s: number, i: any) =>
    s + (Number(i.current_stock) * Number(i.cost_per_unit ?? 0)), 0)

  const categories = [...new Set(allItems.map((i: any) => i.category))] as string[]

  const tableNotReady = !!error

  return (
    <div className="space-y-6 max-w-[1200px]">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Boxes className="w-4 h-4 text-blue-600" />
            </span>
            Control de Inventario
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Materia prima · Empaque · Producto terminado — en tiempo real</p>
        </div>
        <Link
          href="/inventario/nuevo"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> Nuevo Artículo
        </Link>
      </div>

      {/* Needs migration notice */}
      {tableNotReady && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <h3 className="text-sm font-bold text-blue-800 mb-1">Activar módulo de inventario</h3>
          <p className="text-sm text-blue-700">
            Ejecuta las migraciones <strong>011_multi_tenant.sql</strong> y <strong>012_enterprise_modules.sql</strong> en el SQL Editor de Supabase para habilitar este módulo.
          </p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total artículos",    value: String(totalItems), icon: Boxes,        bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-100" },
          { label: "Stock bajo",          value: String(lowStock.length), icon: TrendingDown, bg: lowStock.length > 0 ? "bg-orange-50" : "bg-slate-50", text: lowStock.length > 0 ? "text-orange-700" : "text-slate-600 dark:text-slate-400", border: lowStock.length > 0 ? "border-orange-100" : "border-slate-100" },
          { label: "Agotados",            value: String(outOfStock.length), icon: AlertTriangle, bg: outOfStock.length > 0 ? "bg-red-50" : "bg-slate-50", text: outOfStock.length > 0 ? "text-red-700" : "text-slate-600 dark:text-slate-400", border: outOfStock.length > 0 ? "border-red-100" : "border-slate-100" },
          { label: "Valor total stock",   value: totalValue > 0 ? totalValue.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }) : "—", icon: CheckCircle2, bg: "bg-green-50", text: "text-green-700", border: "border-green-100" },
        ].map((k) => (
          <div key={k.label} className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] p-4 overflow-hidden">
            <div className={`w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700/60 flex items-center justify-center mb-3`}>
              <k.icon className={`w-4 h-4 ${k.text}`} />
            </div>
            <p className="text-xl font-black text-slate-900 dark:text-slate-100 leading-none">{k.value}</p>
            <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400 mt-1.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Category filter pills */}
      {categories.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <Link href="/inventario" className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${!cat || cat === "all" ? "bg-slate-800 text-white border-slate-800" : "border-slate-200 text-slate-600 dark:text-slate-400 hover:border-slate-400"}`}>
            Todos ({allItems.length})
          </Link>
          {categories.map((c) => (
            <Link key={c} href={`/inventario?cat=${c}`} className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${cat === c ? "bg-slate-800 text-white border-slate-800" : `${CATEGORY_COLOR[c] ?? "border-slate-200 text-slate-600 dark:text-slate-400"} hover:opacity-80`}`}>
              {CATEGORY_ES[c] ?? c} ({allItems.filter((i: any) => i.category === c).length})
            </Link>
          ))}
        </div>
      )}

      {/* Items table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-800">Artículos en Inventario</h2>
        </div>

        {allItems.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-slate-300">
            <Package className="w-10 h-10 mb-3" />
            <p className="text-sm font-medium  text-slate-600 dark:text-slate-300">Sin artículos en inventario</p>
            <Link href="/inventario/nuevo" className="mt-3 text-sm text-blue-500 hover:underline font-semibold">
              Agregar primer artículo →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-50 text-[10.5px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Artículo</th>
                  <th className="text-left px-4 py-3">Categoría</th>
                  <th className="text-left px-4 py-3">Ubicación</th>
                  <th className="text-right px-4 py-3">Stock actual</th>
                  <th className="text-left px-4 py-3 min-w-[120px]">Nivel</th>
                  <th className="text-right px-4 py-3">Costo unit.</th>
                  <th className="text-right px-4 py-3">Valor stock</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {allItems.map((item: any) => {
                  const current = Number(item.current_stock)
                  const min     = Number(item.min_stock ?? 0)
                  const maxSt   = Number(item.max_stock ?? min * 4)
                  const status  = stockStatus(current, min)
                  const pct     = maxSt > 0 ? Math.min(100, Math.round((current / maxSt) * 100)) : 0
                  const value   = item.cost_per_unit ? current * Number(item.cost_per_unit) : null

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3">
                        <p className="text-[12.5px] font-bold text-slate-700">{item.name}</p>
                        {item.sku && <p className="text-[10.5px] text-slate-600 dark:text-slate-300 font-mono">{item.sku}</p>}
                        {item.supplier && <p className="text-[10.5px]  text-slate-600 dark:text-slate-300">{item.supplier}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${CATEGORY_COLOR[item.category] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
                          {CATEGORY_ES[item.category] ?? item.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-slate-600 dark:text-slate-400">{item.location || "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <p className="text-[13px] font-black text-slate-700 tabular-nums">{current.toLocaleString()}</p>
                        <p className="text-[10px]  text-slate-600 dark:text-slate-300">{item.unit}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${status.bar}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-600 dark:text-slate-300 mt-0.5">Mín: {min.toLocaleString()} {item.unit}</p>
                      </td>
                      <td className="px-4 py-3 text-right text-[12px] tabular-nums text-slate-700 dark:text-slate-300">
                        {item.cost_per_unit ? `$${Number(item.cost_per_unit).toFixed(4)}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {value != null ? (
                          <span className="text-[12.5px] font-semibold text-green-700">
                            {value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 })}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/inventario/${item.id}`}
                          className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-blue-500 hover:text-blue-600"
                        >
                          Ver <ArrowUpRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
