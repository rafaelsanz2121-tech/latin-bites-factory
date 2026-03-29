import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ThawingLogForm } from "@/components/forms/ThawingLogForm"

export default async function NewThawingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [{ data: profile }, { data: products }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("products").select("id, name, code").eq("is_active", true).order("name"),
  ])

  if (!profile) redirect("/login")

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold">New Thawing Log</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
          Record a product thawing entry · Establishment M/P2643
        </p>
      </div>
      <ThawingLogForm
        userId={user.id}
        userInitials={profile.initials}
        products={products || []}
      />
    </div>
  )
}
