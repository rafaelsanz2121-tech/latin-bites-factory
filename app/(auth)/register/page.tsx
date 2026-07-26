"use client"

import { useState } from "react"
import { Zap, Check, ArrowRight } from "lucide-react"
import Link from "next/link"

export default function RegisterPage() {
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [plantName, setPlantName] = useState("")

  const inputClass = "w-full bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 text-sm"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!fullName.trim()) { setError("El nombre completo es requerido."); return }
    if (!email.trim()) { setError("El email es requerido."); return }
    if (password.length < 8) { setError("La contraseña debe tener al menos 8 caracteres."); return }
    if (password !== confirmPassword) { setError("Las contraseñas no coinciden."); return }
    if (!plantName.trim()) { setError("El nombre de tu negocio es requerido."); return }

    setLoading(true)

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, fullName, plantName }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Error creando la cuenta")
        setLoading(false)
        return
      }

      setLoading(false)
      setDone(true)
    } catch {
      setError("Error de conexión. Intenta de nuevo.")
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      {/* Logo */}
      <div className="text-center mb-8">
        <a href="/" className="inline-flex items-center gap-2.5 mb-6 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg shadow-red-900/40">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="font-black text-xl text-slate-900 dark:text-white tracking-tight">
            Factor<span className="text-red-500">OS</span>
          </span>
        </a>
        {!done && (
          <>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Crear cuenta</h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">Gratis, en menos de un minuto</p>
          </>
        )}
      </div>

      {!done ? (
        <form onSubmit={handleSubmit}>
          <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-8">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nombre completo</label>
                <input
                  type="text"
                  placeholder="Juan Pérez"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={inputClass}
                  autoComplete="name"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                <input
                  type="email"
                  placeholder="juan@miplanta.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  autoComplete="email"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Contraseña</label>
                  <input
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass}
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Confirmar</label>
                  <input
                    type="password"
                    placeholder="Repítela"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={inputClass}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nombre de tu negocio o planta</label>
                <input
                  type="text"
                  placeholder="Ej: Latin Bites"
                  value={plantName}
                  onChange={(e) => setPlantName(e.target.value)}
                  className={inputClass}
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-4 py-2.5 flex items-center justify-center gap-2 transition-colors text-sm"
              >
                {loading ? "Creando cuenta…" : "Crear cuenta gratis"}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>

            <p className="text-center text-xs text-slate-500 dark:text-slate-500 mt-6">
              ¿Ya tienes cuenta?{" "}
              <Link href="/login" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:underline">
                Inicia sesión
              </Link>
            </p>
          </div>
        </form>
      ) : (
        /* Success */
        <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-8 text-center">
          <div className="flex justify-center mb-5">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <Check className="w-8 h-8 text-emerald-400" />
            </div>
          </div>

          <h2 className="text-xl font-black text-slate-900 dark:text-white mb-1">¡Cuenta creada!</h2>
          <p className="text-slate-400 text-sm mb-6">Todo listo. Inicia sesión para empezar.</p>

          <Link
            href="/login"
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg px-4 py-2.5 flex items-center justify-center gap-2 transition-colors text-sm"
          >
            Iniciar sesión
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  )
}
