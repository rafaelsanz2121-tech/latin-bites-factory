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
    <div className="min-h-screen bg-[#080e1c] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to landing */}
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center gap-2.5 mb-6 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg shadow-red-900/40">
              <Factory className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-xl text-white tracking-tight">
              Factor<span className="text-red-500">OS</span>
            </span>
          </a>
          <h1 className="text-2xl font-black text-white">Bienvenido de vuelta</h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">Ingresa tus credenciales para continuar</p>
        </div>

        <div className="bg-white/[0.04] border border-white/10 rounded-2xl shadow-2xl p-8">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white">Iniciar sesión</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Usa tus credenciales de empleado para acceder al sistema
            </p>
          </div>

          <Suspense fallback={<div className="space-y-4 animate-pulse"><div className="h-9 bg-white/10 rounded" /><div className="h-9 bg-white/10 rounded" /><div className="h-9 bg-white/10 rounded" /></div>}>
            <LoginForm />
          </Suspense>

          <p className="text-center text-xs text-slate-600 mt-6">
            FactorOS · HACCP Compliance Platform · USDA Ready
          </p>
        </div>
      </div>
    </div>
  )
}
