import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Briefcase, Plus, ArrowRight } from "lucide-react"

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const canCreate = profile?.role === "admin" || profile?.role === "supervisor"

  const { data: clients } = await supabase
    .from("clients")
    .select("id, company_name, contact_name, phone, email, is_active, recipes(id)")
    .order("company_name", { ascending: true })

  return (
    <div className="space-y-6 max-w-[1100px]">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Briefcase className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Clientes</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Empresas a quienes tu planta produce alimentos</p>
          </div>
        </div>
        {canCreate && (
          <Link
            href="/clients/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nuevo Cliente
          </Link>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] shadow-sm overflow-hidden">
        {!clients?.length ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
              <Briefcase className="w-8 h-8 text-slate-400 dark:text-slate-500" />
            </div>
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-200 mb-1">Sin clientes registrados</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-xs mb-6">
              Agrega tu primer cliente para empezar a gestionar recetas y órdenes de producción.
            </p>
            {canCreate && (
              <Link href="/clients/new" className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm">
                <Plus className="w-4 h-4" />
                Crear primer cliente
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                  {["Empresa", "Contacto", "Teléfono / Email", "Recetas", "Estado", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clients.map((client: any) => {
                  const recipeCount = Array.isArray(client.recipes) ? client.recipes.length : 0
                  return (
                    <tr
                      key={client.id}
                      className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{client.company_name}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                        {client.contact_name || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-700 dark:text-slate-300">{client.phone || "—"}</p>
                        {client.email && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">{client.email}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[11.5px] font-semibold">
                          {recipeCount}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={client.is_active ? "success" : "secondary"} className="text-xs">
                          {client.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/clients/${client.id}`}
                          className="inline-flex items-center gap-1 text-[12px] font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                        >
                          Ver
                          <ArrowRight className="w-3.5 h-3.5" />
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
