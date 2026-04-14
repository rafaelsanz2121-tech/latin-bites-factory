import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

// Uses SERVICE ROLE to bypass RLS — only for registration flow
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, fullName, plantName, estNumber, city, state, plan } = body

    // Validate required fields
    if (!email || !password || !fullName || !plantName || !estNumber || !city || !state) {
      return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 })
    }

    // Validate plan
    const validPlans = ["starter", "pro", "enterprise"]
    const safePlan = validPlans.includes(plan) ? plan : "starter"

    const supabase = getServiceClient()

    // 1. Create auth user
    const { data: authData, error: signUpError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm so they can login immediately
      user_metadata: { full_name: fullName },
    })

    if (signUpError) {
      // Handle duplicate email
      if (signUpError.message?.includes("already")) {
        return NextResponse.json({ error: "Este email ya está registrado. Intenta iniciar sesión." }, { status: 409 })
      }
      return NextResponse.json({ error: signUpError.message }, { status: 400 })
    }

    const userId = authData.user?.id
    if (!userId) {
      return NextResponse.json({ error: "Error creando usuario" }, { status: 500 })
    }

    // 2. Create organization
    const slug = plantName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({
        name: plantName,
        slug: `${slug}-${Date.now()}`, // Ensure unique slug
        plan: safePlan,
        subscription_status: "trial",
        est_number: estNumber,
        city,
        state,
      })
      .select("id")
      .single()

    if (orgError) {
      // Cleanup: delete the auth user if org creation fails
      await supabase.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: `Error creando organización: ${orgError.message}` }, { status: 500 })
    }

    // 3. Update the profile (created by trigger) to link org + set as admin
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        organization_id: org.id,
        role: "admin", // First user of an org is always admin
        full_name: fullName,
      })
      .eq("id", userId)

    if (profileError) {
      console.error("Profile update error:", profileError)
      // Non-fatal — profile was created by trigger, org link just failed
    }

    return NextResponse.json({
      success: true,
      message: "Cuenta creada exitosamente",
      organizationId: org.id,
    })
  } catch (err: any) {
    console.error("Registration error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
