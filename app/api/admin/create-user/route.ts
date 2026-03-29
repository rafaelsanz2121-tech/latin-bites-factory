import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(req: NextRequest) {
  // 1. Verify the caller is an admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 })
  }

  // 2. Parse body
  const body = await req.json()
  const { email, password, full_name, initials, employee_id, role } = body

  if (!email || !password || !full_name || !initials) {
    return NextResponse.json({ error: "email, password, full_name and initials are required" }, { status: 400 })
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
  }

  const validRoles = ["operator", "supervisor", "qa", "admin"]
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 })
  }

  // 3. Create auth user via service role client
  const admin = createAdminClient()
  const { data: newUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError || !newUser.user) {
    return NextResponse.json({ error: authError?.message || "Failed to create auth user" }, { status: 500 })
  }

  // 4. Update the profile (trigger auto-creates a basic one)
  const { error: profileError } = await admin
    .from("profiles")
    .update({
      full_name,
      initials: initials.toUpperCase().slice(0, 3),
      employee_id: employee_id || null,
      role,
      is_active: true,
    })
    .eq("id", newUser.user.id)

  if (profileError) {
    // Rollback: delete auth user to avoid orphans
    await admin.auth.admin.deleteUser(newUser.user.id)
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json({ id: newUser.user.id, email }, { status: 201 })
}
