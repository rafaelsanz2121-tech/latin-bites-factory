"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Zap, Check, ChevronRight, ChevronLeft, ArrowRight } from "lucide-react"
import Link from "next/link"

const US_STATES = ["TX", "CA", "FL", "NY", "IL", "GA", "NC", "PA", "OH", "MI", "TN", "Otro"]

type Plan = "starter" | "professional"

export default function RegisterPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1 fields
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // Step 2 fields
  const [plantName, setPlantName] = useState("")
  const [estNumber, setEstNumber] = useState("")
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [plan, setPlan] = useState<Plan>("starter")

  const handleStep1Next = () => {
    setError(null)
    if (!fullName.trim()) { setError("El nombre completo es requerido."); return }
    if (!email.trim()) { setError("El email es requerido."); return }
    if (password.length < 8) { setError("La contraseña debe tener al menos 8 caracteres."); return }
    if (password !== confirmPassword) { setError("Las contraseñas no coinciden."); return }
    setStep(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!plantName.trim()) { setError("El nombre de la planta es requerido."); return }
    if (!estNumber.trim()) { setError("El número EST es requerido."); return }
    if (!city.trim()) { setError("La ciudad es requerida."); return }
    if (!state) { setError("El estado es requerido."); return }

    setLoading(true)

    const supabase = createClient()

    // 1. Sign up
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // 2. Insert organization (wrap in try/catch in case table not migrated)
    try {
      const slug = plantName.toLowerCase().replace(/\s+/g, "-")
      await supabase.from("organizations").insert({
        name: plantName,
        est_number: estNumber,
        city,
        state,
        plan,
        slug,
      })
    } catch {
      // Non-fatal — table may not exist yet
    }

    setLoading(false)
    setStep(3)
  }

  return (
    <div className="min-h-screen bg-[#080e1c] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center gap-2.5 mb-6 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg shadow-red-900/40">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-xl text-white tracking-tight">
              Factor<span className="text-red-500">OS</span>
            </span>
          </a>
          {step < 3 && (
            <>
              <h1 className="text-2xl font-black text-white">Crear cuenta</h1>
              <p className="text-slate-400 text-sm mt-1">
                Paso {step} de 2 — {step === 1 ? "Tu cuenta" : "Tu planta"}
              </p>
            </>
          )}
        </div>

        {/* Progress bar */}
        {step < 3 && (
          <div className="flex gap-2 mb-6">
            <div className="flex-1 h-1 rounded-full bg-red-600" />
            <div className={`flex-1 h-1 rounded-full ${step >= 2 ? "bg-red-600" : "bg-white/10"}`} />
          </div>
        )}

        {/* Step 1 */}
        {step === 1 && (
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl shadow-2xl p-8">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-white">Tu cuenta</h2>
              <p className="text-sm text-slate-400 mt-1">Información de acceso personal</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300">Nombre completo</label>
                <input
                  type="text"
                  placeholder="Juan Pérez"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 text-sm"
                  autoComplete="name"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300">Email</label>
                <input
                  type="email"
                  placeholder="juan@miplanta.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 text-sm"
                  autoComplete="email"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300">Contraseña</label>
                <input
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 text-sm"
                  autoComplete="new-password"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300">Confirmar contraseña</label>
                <input
                  type="password"
                  placeholder="Repite tu contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 text-sm"
                  autoComplete="new-password"
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                onClick={handleStep1Next}
                className="w-full mt-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg px-4 py-2.5 flex items-center justify-center gap-2 transition-colors text-sm"
              >
                Continuar
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <p className="text-center text-xs text-slate-600 mt-6">
              ¿Ya tienes cuenta?{" "}
              <Link href="/login" className="text-slate-400 hover:text-white hover:underline">
                Inicia sesión
              </Link>
            </p>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <form onSubmit={handleSubmit}>
            <div className="bg-white/[0.04] border border-white/10 rounded-2xl shadow-2xl p-8">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-white">Tu planta</h2>
                <p className="text-sm text-slate-400 mt-1">Información de tu operación</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-300">Nombre de la planta</label>
                  <input
                    type="text"
                    placeholder="Latin Bites Factory"
                    value={plantName}
                    onChange={(e) => setPlantName(e.target.value)}
                    className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-300">Número EST</label>
                  <input
                    type="text"
                    placeholder="M/P2643"
                    value={estNumber}
                    onChange={(e) => setEstNumber(e.target.value)}
                    className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-300">Ciudad</label>
                    <input
                      type="text"
                      placeholder="Dallas"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-300">Estado</label>
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full bg-[#0d1526] border border-white/10 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 text-sm"
                    >
                      <option value="" disabled>— Elige —</option>
                      {US_STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Plan selector */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Plan</label>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Starter */}
                    <button
                      type="button"
                      onClick={() => setPlan("starter")}
                      className={`relative border rounded-xl p-4 text-left transition-all ${
                        plan === "starter"
                          ? "border-red-500/70 bg-red-500/10"
                          : "border-white/10 bg-white/[0.03] hover:border-white/20"
                      }`}
                    >
                      <p className="text-sm font-bold text-white">Starter</p>
                      <p className="text-xs text-slate-400 mt-0.5">Para empezar</p>
                      <p className="text-lg font-black text-white mt-2">$199<span className="text-xs font-normal text-slate-400">/mes</span></p>
                      {plan === "starter" && (
                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-red-600 flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </button>

                    {/* Professional */}
                    <button
                      type="button"
                      onClick={() => setPlan("professional")}
                      className={`relative border rounded-xl p-4 text-left transition-all ${
                        plan === "professional"
                          ? "border-red-500/70 bg-red-500/10"
                          : "border-white/10 bg-white/[0.03] hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="text-sm font-bold text-white">Professional</p>
                        <span className="text-[10px] font-bold bg-red-600 text-white px-1.5 py-0.5 rounded-full">Popular</span>
                      </div>
                      <p className="text-xs text-slate-400">Escala tu planta</p>
                      <p className="text-lg font-black text-white mt-2">$399<span className="text-xs font-normal text-slate-400">/mes</span></p>
                      {plan === "professional" && (
                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-red-600 flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <div className="flex gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => { setStep(1); setError(null) }}
                    className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm font-medium px-4 py-2.5 border border-white/10 rounded-lg hover:border-white/20 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Atrás
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-4 py-2.5 flex items-center justify-center gap-2 transition-colors text-sm"
                  >
                    {loading ? "Creando cuenta…" : "Crear cuenta"}
                    {!loading && <ChevronRight className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* Step 3 — Success */}
        {step === 3 && (
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl shadow-2xl p-8 text-center">
            <div className="flex justify-center mb-5">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <Check className="w-8 h-8 text-emerald-400" />
              </div>
            </div>

            <h2 className="text-xl font-black text-white mb-1">¡Cuenta creada!</h2>
            <p className="text-slate-400 text-sm mb-6">Bienvenido a FactorOS</p>

            <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4 text-left mb-6 space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Próximos pasos</p>

              {[
                "Configura tu primer módulo HACCP",
                "Invita a tu equipo",
                "Ejecuta las migraciones de base de datos",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-red-600/20 border border-red-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-red-400">{i + 1}</span>
                  </div>
                  <p className="text-sm text-slate-300">{item}</p>
                </div>
              ))}
            </div>

            <a
              href="/dashboard"
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg px-4 py-2.5 flex items-center justify-center gap-2 transition-colors text-sm"
            >
              Ir al dashboard
              <ArrowRight className="w-4 h-4" />
            </a>

            <p className="text-xs text-slate-600 mt-4">
              FactorOS · HACCP Compliance Platform · USDA Ready
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
