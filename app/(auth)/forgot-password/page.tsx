"use client"

export const dynamic = "force-dynamic"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Factory, ArrowLeft, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) { toast.error("Enter your email"); return }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (error) { toast.error(error.message); return }
    setSent(true)
  }

  return (
    <div className="w-full max-w-sm">
      {/* Logo */}
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
        {sent ? (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Email enviado</h2>
              <p className="text-sm text-slate-400 mt-1">
                Revisa <strong className="text-white">{email}</strong> para el enlace de restablecimiento. Expira en 1 hora.
              </p>
            </div>
            <Link href="/login">
              <Button variant="outline" className="w-full border-white/10 text-slate-300 hover:bg-white/5">
                <ArrowLeft className="w-4 h-4" /> Volver al inicio de sesión
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-lg font-bold text-white">Restablecer contraseña</h2>
              <p className="text-sm text-slate-400 mt-1">
                Ingresa tu email y te enviaremos un enlace de restablecimiento.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-slate-300">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus
                />
              </div>

              <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" loading={loading}>
                Enviar enlace
              </Button>
            </form>

            <div className="mt-5 text-center">
              <Link href="/login" className="text-sm text-slate-500 hover:text-slate-300 flex items-center justify-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Volver al inicio de sesión
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
