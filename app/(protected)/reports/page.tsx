import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ReportsClient } from "./ReportsClient"

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile || !["supervisor", "qa", "admin"].includes(profile.role)) redirect("/dashboard")

  return <ReportsClient />
}
