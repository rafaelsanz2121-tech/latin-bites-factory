"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Loader2, Save, User, KeyRound, Eye, EyeOff } from "lucide-react"

interface Profile {
  id:          string
  full_name:   string | null
  initials:    string | null
  employee_id: string | null
  role:        string
  email:       string
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador", supervisor: "Supervisor", qa: "QA / Calidad", operator: "Operador",
}
const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-700", supervisor: "bg-amber-100 text-amber-700",
  qa: "bg-blue-100 text-blue-700",  operator: "bg-green-100 text-green-700",
}

export function ProfileForm({ profile }: { profile: Profile }) {
  const [form, setForm] = useState({
    full_name: profile.full_name ?? "",
    initials:  profile.initials  ?? "",
  })
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" })
  const [showPwd, setShowPwd]     = useState(false)
  const [loadingProfile, setLP]   = useState(false)
  const [loadingPwd,     setLPwd] = useState(false)
  const [dirtyProfile,   setDP]   = useState(false)
  const supabase = createClient()

  /* Auto-generate initials */
  function handleNameChange(name: string) {
    setForm((f) => {
      const auto = name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
      return { ...f, full_name: name, initials: f.initials || auto }
    })
    setDP(true)
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!dirtyProfile) return
    setLP(true)
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: form.full_name.trim(), initials: form.initials.trim().toUpperCase().slice(0, 2) })
        .eq("id", profile.id)
      if (error) throw error
      toast.success("Perfil actualizado ✓")
      setDP(false)
    } catch (err: any) {
      toast.error(err.message ?? "Error al guardar")
    } finally { setLP(false) }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault()
    if (pwd.next !== pwd.confirm) { toast.error("Las contraseñas no coinciden"); return }
    if (pwd.next.length < 8)      { toast.error("Mínimo 8 caracteres"); return }
    setLPwd(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: pwd.next })
      if (error) throw error
      toast.success("Contraseña actualizada ✓")
      setPwd({ current: "", next: "", confirm: "" })
    } catch (err: any) {
      toast.error(err.message ?? "Error al cambiar contraseña")
    } finally { setLPwd(false) }
  }

  const avatarLetter = form.initials || form.full_name?.slice(0, 2).toUpperCase() || "??"

  return (
    <div className="space-y-4">

      {/* ── Profile info ──────────────────────────────────────── */}
      <form onSubmit={saveProfile}>
        <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <User className="w-4 h-4  text-slate-600 dark:text-slate-300" />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Mi Perfil</span>
          </div>
          <div className="p-5 space-y-4">

            {/* Avatar preview + identity */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white text-lg font-black shadow-md flex-shrink-0">
                {avatarLetter}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${ROLE_COLORS[profile.role] ?? ""}`}>
                    {ROLE_LABELS[profile.role] ?? profile.role}
                  </span>
                  {profile.employee_id && (
                    <span className="text-xs text-slate-600 dark:text-slate-300 font-mono">ID: {profile.employee_id}</span>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{profile.email}</p>
              </div>
            </div>

            {/* Full name + Initials */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Nombre completo
                </label>
                <input
                  value={form.full_name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Tu nombre completo"
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-300 focus:outline-none focus:border-blue-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Iniciales (2)
                </label>
                <input
                  value={form.initials}
                  onChange={(e) => { setForm((f) => ({ ...f, initials: e.target.value })); setDP(true) }}
                  placeholder="AB"
                  maxLength={2}
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-300 focus:outline-none focus:border-blue-400 transition-colors font-mono text-center uppercase tracking-widest"
                />
              </div>
            </div>

            {/* Read-only fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Email (no editable)
                </label>
                <input
                  value={profile.email}
                  disabled
                  className="w-full px-3 py-2.5 border border-slate-100 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800/50 text-slate-400 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Rol (asignado por admin)
                </label>
                <input
                  value={ROLE_LABELS[profile.role] ?? profile.role}
                  disabled
                  className="w-full px-3 py-2.5 border border-slate-100 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800/50 text-slate-400 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <div className={`px-5 py-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between transition-colors ${
            dirtyProfile ? "bg-white dark:bg-[#111827]" : "bg-slate-50/60 dark:bg-white/[0.02]"
          }`}>
            <p className={`text-xs font-medium ${dirtyProfile ? "text-slate-900 dark:text-slate-100" : "text-slate-400"}`}>
              {dirtyProfile ? "Cambios sin guardar" : "Perfil guardado"}
            </p>
            <button
              type="submit"
              disabled={!dirtyProfile || loadingProfile}
              className="inline-flex items-center gap-2 px-5 py-2 bg-slate-800 dark:bg-white hover:bg-slate-700 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-sm font-bold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loadingProfile
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Guardando…</>
                : <><Save className="w-3.5 h-3.5" /> Guardar</>}
            </button>
          </div>
        </div>
      </form>

      {/* ── Change password ───────────────────────────────────── */}
      <form onSubmit={savePassword}>
        <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <KeyRound className="w-4 h-4  text-slate-600 dark:text-slate-300" />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Cambiar Contraseña</span>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Nueva contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPwd ? "text" : "password"}
                    value={pwd.next}
                    onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))}
                    placeholder="Mínimo 8 caracteres"
                    minLength={8}
                    className="w-full px-3 py-2.5 pr-10 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-300 focus:outline-none focus:border-blue-400 transition-colors"
                  />
                  <button type="button" onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Confirmar contraseña
                </label>
                <input
                  type={showPwd ? "text" : "password"}
                  value={pwd.confirm}
                  onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))}
                  placeholder="Repite la contraseña"
                  className={`w-full px-3 py-2.5 border rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-300 focus:outline-none transition-colors ${
                    pwd.confirm && pwd.next !== pwd.confirm
                      ? "border-red-300 dark:border-red-500 focus:border-red-400"
                      : "border-slate-200 dark:border-slate-600 focus:border-blue-400"
                  }`}
                />
                {pwd.confirm && pwd.next !== pwd.confirm && (
                  <p className="text-[10.5px] text-red-500 mt-1">Las contraseñas no coinciden</p>
                )}
              </div>
            </div>

            {/* Strength bar */}
            {pwd.next.length > 0 && (
              <div>
                <div className="flex gap-1 mt-1">
                  {[8, 12, 16].map((threshold, i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                      pwd.next.length >= threshold
                        ? i === 0 ? "bg-red-400" : i === 1 ? "bg-amber-400" : "bg-green-500"
                        : "bg-slate-100 dark:bg-slate-700"
                    }`} />
                  ))}
                </div>
                <p className="text-[10px] text-slate-600 dark:text-slate-300 mt-1">
                  {pwd.next.length < 8 ? "Muy corta" : pwd.next.length < 12 ? "Básica" : pwd.next.length < 16 ? "Buena" : "Fuerte ✓"}
                </p>
              </div>
            )}
          </div>

          <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700 flex justify-end bg-slate-50/60 dark:bg-white/[0.02]">
            <button
              type="submit"
              disabled={!pwd.next || !pwd.confirm || pwd.next !== pwd.confirm || loadingPwd}
              className="inline-flex items-center gap-2 px-5 py-2 bg-slate-800 dark:bg-white hover:bg-slate-700 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-sm font-bold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loadingPwd
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Cambiando…</>
                : <><KeyRound className="w-3.5 h-3.5" /> Cambiar contraseña</>}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
