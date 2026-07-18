"use client"

import { Suspense } from "react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { Factory } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import Link from "next/link"
import { translateAuthError } from "@/lib/auth-errors"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawRedirect = searchParams.get("redirect")
  // Only allow internal paths to prevent open redirects
  const redirect = rawRedirect && rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
    ? rawRedirect
    : "/dashboard"
  const supabase = createClient()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      toast.error(translateAuthError(error.message))
      setLoading(false)
      return
    }

    toast.success("¡Bienvenido de vuelta!")
    router.push(redirect)
    router.refresh()
  }

  // This page always sits on a dark background, so inputs/labels are styled
  // explicitly for dark — independent of the app's light/dark theme.
  const inputClass = "w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 text-sm"

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium text-slate-300">Email</label>
        <input
          id="email"
          type="email"
          placeholder="tu@planta.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium text-slate-300">Contraseña</label>
        <input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          className={inputClass}
        />
      </div>

      <Button type="submit" className="w-full mt-2 bg-red-600 hover:bg-red-500 text-white" loading={loading}>
        Iniciar sesión
      </Button>

      <div className="text-center mt-3">
        <Link href="/forgot-password" className="text-xs text-slate-400 hover:text-white hover:underline">
          ¿Olvidaste tu contraseña?
        </Link>
      </div>
    </form>
  )
}

export default function LoginPage() {
  return (
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
        <p className="text-slate-400 text-sm mt-1">Ingresa tus credenciales para continuar</p>
      </div>

      <div className="bg-white/[0.04] border border-white/10 rounded-2xl shadow-2xl p-8">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-white">Iniciar sesión</h2>
          <p className="text-sm text-slate-400 mt-1">
            Usa tus credenciales de empleado para acceder al sistema
          </p>
        </div>

        <Suspense fallback={<div className="space-y-4 animate-pulse"><div className="h-9 bg-white/10 rounded" /><div className="h-9 bg-white/10 rounded" /><div className="h-9 bg-white/10 rounded" /></div>}>
          <LoginForm />
        </Suspense>

        <p className="text-center text-xs text-slate-500 mt-6">
          ¿No tienes cuenta?{" "}
          <Link href="/register" className="text-slate-400 hover:text-white hover:underline">
            Regístrate
          </Link>
        </p>

        <p className="text-center text-xs text-slate-600 mt-4">
          FactorOS · HACCP Compliance Platform · USDA Ready
        </p>
      </div>
    </div>
  )
}
