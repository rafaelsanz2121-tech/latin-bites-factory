import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import {
  Plus, Truck, AlertTriangle, CheckCircle2, XCircle,
  Thermometer, Package, Calendar,
} from "lucide-react"

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft:      { label: "Borrador",   color: "bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300" },
  dispatched: { label: "Despachado", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"     },
  received:   { label: "Recibido",   color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  disputed:   { label: "Disputado",  color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"         },
}

export default async function DespachoPage() {
  const supabase = await createClient()

  let logs: any[]   = []
  let tableExists   = true

  try {
    const since90 = new Date()
    since90.setDate(since90.getDate() - 90)
    const { data, error } = await supabase
      .from("dispatch_logs")
      .select("*")
      .gte("dispatch_date", since90.toISOString().split("T")[0])
      .order("dispatch_date", { ascending: false })
      .order("dispatch_time", { ascending: false })
      .limit(200)
    if (error?.code === "42P01") { tableExists = false } else { logs = data || [] }
  } catch { tableExists = false }

  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
  const weekStart = new Date()
  const day = weekStart.getDay()
  weekStart.setDate(weekStart.getDate() - day)
  const weekStartStr = weekStart.toISOString().split("T")[0]

  const totalDispatches  = logs.length
  const totalLbs         = logs.reduce((s, l) => s + (Number(l.quantity) || 0), 0)
  const thisWeek         = logs.filter((l) => l.dispatch_date >= weekStartStr).length
  const tempViolations   = logs.filter((l) => l.temp_acceptable === false).length

  const recentTempFails  = logs.filter((l) =>
    l.temp_acceptable === false &&
    new Date(l.dispatch_date).getTime() >= weekAgo.getTime()
  )

  const fmtDate = (d: string) =>
    new Date(d + "T12:00:00").toLocaleDateString("es-MX", { month: "short", day: "numeric" })

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center">
              <Truck className="w-4 h-4 text-sky-600" />
            </span>
            Registro de Despacho
          </h1>
          <p className="text-sm text-slate-400 mt-1">9 CFR 320 · Trazabilidad de envíos · Bills of Lading</p>
        </div>
        <Link
          href="/despacho/nuevo"
          className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Nuevo despacho
        </Link>
      </div>

      {/* Migration notice */}
      {!tableExists && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
          <p className="text-sm font-bold text-blue-800 dark:text-blue-200">Migración requerida</p>
          <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
            Ejecuta{" "}
            <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">014_metal_supplier_dispatch.sql</code>{" "}
            en Supabase para activar este módulo.
          </p>
        </div>
      )}

      {tableExists && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Despachos (90d)",   value: totalDispatches,                    icon: Truck,        color: "text-sky-600",    bg: "bg-sky-50 dark:bg-sky-900/20"       },
              { label: "Total enviado",      value: `${totalLbs.toLocaleString()} lbs`, icon: Package,      color: "text-slate-600 dark:text-slate-300", bg: "bg-slate-100 dark:bg-slate-800" },
              { label: "Esta semana",        value: thisWeek,                           icon: Calendar,     color: "text-blue-600",   bg: "bg-blue-50 dark:bg-blue-900/20"     },
              { label: "Violaciones de temp", value: tempViolations,                   icon: Thermometer,  color: tempViolations > 0 ? "text-red-600" : "text-slate-500 dark:text-slate-300", bg: tempViolations > 0 ? "bg-red-50 dark:bg-red-900/20" : "bg-slate-100 dark:bg-slate-800" },
            ].map((k) => (
              <div key={k.label} className={`rounded-xl p-4 ${k.bg}`}>
                <k.icon className={`w-4 h-4 ${k.color} mb-2`} />
                <p className={`text-2xl font-black ${k.color} tabular-nums`}>{k.value}</p>
                <p className="text-[10.5px] font-medium text-slate-500 dark:text-slate-400 mt-1">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Temp violation alerts */}
          {recentTempFails.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-sm font-bold text-red-800 dark:text-red-200">
                  {recentTempFails.length} despacho{recentTempFails.length > 1 ? "s" : ""} con temperatura fuera de rango (últimos 7 días)
                </p>
              </div>
              {recentTempFails.map((d) => (
                <div key={d.id} className="bg-white dark:bg-red-900/10 rounded-lg px-4 py-3 text-sm flex flex-wrap items-center gap-3">
                  <span className="font-bold text-red-700 dark:text-red-300">{fmtDate(d.dispatch_date)}</span>
                  <span className="text-slate-600 dark:text-slate-300 font-medium">{d.product_name}</span>
                  {d.temp_at_loading_f != null && (
                    <span className="text-red-600 font-bold">{d.temp_at_loading_f}°F al despachar</span>
                  )}
                  <span className="text-slate-400">→ {d.destination_name}</span>
                </div>
              ))}
            </div>
          )}

          {/* Table */}
          <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Registros — últimos 90 días</span>
              <span className="text-xs text-slate-400">{totalDispatches} despachos</span>
            </div>

            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Truck className="w-8 h-8 text-slate-200 dark:text-slate-700" />
                <p className="text-sm text-slate-400">Sin despachos registrados.</p>
                <Link href="/despacho/nuevo" className="text-sm text-sky-600 font-semibold hover:underline">
                  + Registrar primer despacho
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 dark:bg-slate-800">
                    <tr>
                      {["Fecha", "Bill of Lading", "Producto / Lotes", "Cantidad", "Destino", "Transportista", "Temp", "Sello", "Estado"].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                    {logs.map((log) => {
                      const st = STATUS_CONFIG[log.status] ?? STATUS_CONFIG.draft
                      const tempOk = log.temp_at_loading_f == null
                        ? null
                        : log.temp_acceptable !== false
                      return (
                        <tr key={log.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${log.temp_acceptable === false ? "bg-red-50/30 dark:bg-red-900/10" : ""}`}>
                          <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
                            {fmtDate(log.dispatch_date)}
                          </td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-mono text-xs">
                            {log.bill_of_lading || <span className="text-slate-300 dark:text-slate-600">—</span>}
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-[160px]">
                            <p className="font-medium truncate">{log.product_name}</p>
                            {log.lot_numbers && <p className="text-xs text-slate-400 truncate">{log.lot_numbers}</p>}
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300 tabular-nums whitespace-nowrap">
                            {Number(log.quantity).toLocaleString()} {log.unit}
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-[140px]">
                            <p className="truncate">{log.destination_name}</p>
                          </td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400 max-w-[120px]">
                            <p className="truncate">{log.carrier_name || "—"}</p>
                            {log.truck_plate && <p className="text-xs text-slate-400">{log.truck_plate}</p>}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {log.temp_at_loading_f == null ? (
                              <span className="text-slate-300 dark:text-slate-600">—</span>
                            ) : (
                              <div className="flex items-center gap-1">
                                {tempOk
                                  ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                  : <XCircle className="w-3.5 h-3.5 text-red-500" />
                                }
                                <span className={`text-xs font-bold ${tempOk ? "text-green-600" : "text-red-600"}`}>
                                  {log.temp_at_loading_f}°F
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 font-mono">
                            {log.seal_number || <span className="text-slate-300 dark:text-slate-600">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${st.color}`}>
                              {st.label}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
