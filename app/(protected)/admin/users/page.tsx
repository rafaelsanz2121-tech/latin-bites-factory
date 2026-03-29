import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AdminUsersClient } from "./AdminUsersClient"

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") redirect("/dashboard")

  const { data: users } = await supabase
    .from("profiles")
    .select("id, full_name, initials, employee_id, role, is_active, created_at")
    .order("full_name")

  return <AdminUsersClient users={users || []} currentUserId={user.id} />
}
