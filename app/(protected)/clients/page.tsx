import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Briefcase, Plus } from "lucide-react"

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

  // Fetch clients with recipe count via join
  const { data: clients } = await supabase
    .from("clients")
    .select("id, company_name, contact_name, phone, email, is_active, recipes(id)")
    .order("company_name", { ascending: true })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
            Companies Latin Bites Factory produces food for
          </p>
        </div>
        {canCreate && (
          <Link href="/clients/new">
            <Button>
              <Plus className="w-4 h-4" />
              New Client
            </Button>
          </Link>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {!clients?.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-[var(--muted-foreground)]">
              <Briefcase className="w-10 h-10 mb-3 opacity-30" />
              <p className="font-medium">No clients yet</p>
              <p className="text-sm mt-1">Add your first client to start managing recipes</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)] text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
                    <th className="text-left px-4 py-3">Company</th>
                    <th className="text-left px-4 py-3">Contact</th>
                    <th className="text-left px-4 py-3">Phone / Email</th>
                    <th className="text-left px-4 py-3"># Recipes</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client: any) => {
                    const recipeCount = Array.isArray(client.recipes) ? client.recipes.length : 0
                    return (
                      <tr
                        key={client.id}
                        className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold">{client.company_name}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">
                          {client.contact_name || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm">{client.phone || "—"}</p>
                          {client.email && (
                            <p className="text-xs text-[var(--muted-foreground)]">{client.email}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">{recipeCount}</td>
                        <td className="px-4 py-3">
                          <Badge variant={client.is_active ? "success" : "secondary"} className="text-xs">
                            {client.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/clients/${client.id}`}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
