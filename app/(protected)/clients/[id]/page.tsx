import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Briefcase } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"
import { RecipeManager } from "./RecipeManager"

interface Props { params: Promise<{ id: string }> }

export default async function ClientDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const canManage = profile?.role === "admin" || profile?.role === "supervisor"

  const [{ data: client }, { data: recipes }, { data: products }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).single(),
    supabase
      .from("recipes")
      .select("id, recipe_name, packaging_spec, is_active, products(name, code)")
      .eq("client_id", id)
      .order("recipe_name", { ascending: true }),
    supabase
      .from("products")
      .select("id, name, code")
      .eq("is_active", true)
      .order("name"),
  ])

  if (!client) notFound()

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <Link
          href="/clients"
          className="flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Clients
        </Link>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
            <Briefcase className="w-6 h-6 text-slate-600 dark:text-slate-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{client.company_name}</h1>
              <Badge variant={client.is_active ? "success" : "secondary"} className="text-xs">
                {client.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
            {client.contact_name && (
              <p className="text-sm text-[var(--muted-foreground)]">{client.contact_name}</p>
            )}
          </div>
        </div>
      </div>

      {/* Client Info Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            Client Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          {[
            { label: "Company", value: client.company_name },
            { label: "Contact", value: client.contact_name || "—" },
            { label: "Phone", value: client.phone || "—" },
            { label: "Email", value: client.email || "—" },
            { label: "Address", value: client.address || "—" },
            { label: "Added", value: formatDate(client.created_at) },
          ].map((item) => (
            <div
              key={item.label}
              className="flex justify-between py-2 border-b border-[var(--border)] last:border-0"
            >
              <span className="text-sm text-[var(--muted-foreground)]">{item.label}</span>
              <span className="text-sm font-medium text-right max-w-xs">{item.value}</span>
            </div>
          ))}
          {client.notes && (
            <div className="pt-3">
              <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm">{client.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recipes section — client component for interactivity */}
      <RecipeManager
        clientId={id}
        initialRecipes={(recipes || []) as any}
        products={products || []}
        canManage={canManage}
      />
    </div>
  )
}
