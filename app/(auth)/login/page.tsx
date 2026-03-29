"use client"

import { Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { Factory } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import Link from "next/link"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get("redirect") || "/dashboard"
  const supabase = createClient()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      toast.error(error.message || "Invalid credentials")
      setLoading(false)
      return
    }

    toast.success("Welcome back!")
    router.push(redirect)
    router.refresh()
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@latinbitesfactory.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
      </div>

      <Button type="submit" className="w-full mt-2" loading={loading}>
        Sign In
      </Button>

      <div className="text-center mt-3">
        <Link href="/forgot-password" className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:underline">
          Forgot password?
        </Link>
      </div>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4 shadow-xl">
            <Factory className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Latin Bites Factory</h1>
          <p className="text-blue-300 text-sm mt-1">Operations & Quality Management</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-[var(--foreground)]">Sign In</h2>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              Use your employee credentials to access the system
            </p>
          </div>

          <Suspense fallback={<div className="space-y-4 animate-pulse"><div className="h-9 bg-slate-100 rounded" /><div className="h-9 bg-slate-100 rounded" /><div className="h-9 bg-slate-100 rounded" /></div>}>
            <LoginForm />
          </Suspense>

          <p className="text-center text-xs text-[var(--muted-foreground)] mt-6">
            EST No. M/P2643 · USDA-regulated facility
          </p>
        </div>
      </div>
    </div>
  )
}
