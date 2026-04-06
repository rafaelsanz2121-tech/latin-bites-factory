"use client"

export const dynamic = "force-dynamic"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Factory, Eye, EyeOff, CheckCircle2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [ready, setReady] = useState(false)

  // Supabase sends the session via hash fragment on redirect
  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return }
    if (password !== confirm) { toast.error("Passwords do not match"); return }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) { toast.error(error.message); return }
    setDone(true)
    setTimeout(() => router.push("/dashboard"), 2500)
  }

  return (
    <div className="w-full max-w-sm">
      <div className="flex flex-col items-center mb-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center mb-4 shadow-lg shadow-red-900/40">
          <Factory className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-xl font-black text-white tracking-tight">
          Factor<span className="text-red-500">OS</span>
        </h1>
        <p className="text-slate-400 text-sm mt-1">HACCP Compliance Platform</p>
      </div>

      <div className="bg-white/[0.04] border border-white/10 rounded-2xl shadow-2xl p-8">
        {done ? (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Contraseña actualizada</h2>
              <p className="text-sm text-slate-400 mt-1">Redirigiendo al dashboard…</p>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-lg font-bold text-white">Nueva contraseña</h2>
              <p className="text-sm text-slate-400 mt-1">Elige una contraseña segura para tu cuenta.</p>
            </div>

            {!ready && (
              <div className="text-sm text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-4">
                Verificando enlace… si tarda más de unos segundos, usa el enlace de tu email nuevamente.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-slate-300">Nueva contraseña</Label>
                <div className="relative">
                  <Input
                    type={showPw ? "text" : "password"}
                    placeholder="Mínimo 8 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={!ready}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-300">Confirmar contraseña</Label>
                <Input
                  type="password"
                  placeholder="Repite la contraseña"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  disabled={!ready}
                />
                {confirm && password !== confirm && (
                  <p className="text-xs text-red-400">Las contraseñas no coinciden</p>
                )}
              </div>

              <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" loading={loading} disabled={!ready}>
                Actualizar contraseña
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
