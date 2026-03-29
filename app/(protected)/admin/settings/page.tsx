import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Building2, Shield, Database } from "lucide-react"

export default async function AdminSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") redirect("/dashboard")

  const [{ count: userCount }, { count: logCount }, { count: deviationCount }] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("receiving_logs").select("*", { count: "exact", head: true }),
    supabase.from("deviations").select("*", { count: "exact", head: true }),
  ])

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">System configuration and establishment information</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            <Building2 className="w-4 h-4" />Establishment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: "Establishment Name", value: "Latin Bites Factory" },
            { label: "EST No.", value: "M/P2643" },
            { label: "Products", value: "Pork Belly, Chicharrón, Buñuelos" },
            { label: "HACCP Plan", value: "Active — CCP 1B, 1B-1, 1B-2, 2B, 2B-1" },
          ].map((item) => (
            <div key={item.label} className="flex justify-between py-1.5 border-b border-[var(--border)] last:border-0">
              <span className="text-sm text-[var(--muted-foreground)]">{item.label}</span>
              <span className="text-sm font-medium">{item.value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            <Database className="w-4 h-4" />System Stats
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: "Active Users", value: userCount ?? "—" },
            { label: "Total Log Records", value: logCount ?? "—" },
            { label: "Total Deviations", value: deviationCount ?? "—" },
          ].map((item) => (
            <div key={item.label} className="flex justify-between py-1.5 border-b border-[var(--border)] last:border-0">
              <span className="text-sm text-[var(--muted-foreground)]">{item.label}</span>
              <span className="text-sm font-semibold">{item.value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            <Shield className="w-4 h-4" />Roles & Permissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { role: "Operator", badge: "secondary", perms: "Create and submit logs, flag deviations" },
              { role: "Supervisor", badge: "warning", perms: "Verify logs (not own), assign CAPAs, export reports" },
              { role: "QA", badge: "info", perms: "Approve logs (not own), close deviations, verify CAPAs" },
              { role: "Admin", badge: "default", perms: "Full access — manage users, settings, reopen locked records" },
            ].map((r) => (
              <div key={r.role} className="flex items-start gap-3 py-2 border-b border-[var(--border)] last:border-0">
                <Badge variant={r.badge as any} className="mt-0.5 shrink-0">{r.role}</Badge>
                <p className="text-sm text-[var(--muted-foreground)]">{r.perms}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
