"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  Building2, ChevronLeft, Save, AlertCircle, CheckCircle2,
  FileText, ShieldCheck, Calendar,
} from "lucide-react"

const COMPANY_TYPES = [
  { value: "processor",   label: "Procesador"   },
  { value: "packer",      label: "Empacador"    },
  { value: "distributor", label: "Distribuidor"  },
  { value: "broker",      label: "Broker"        },
  { value: "farm",        label: "Granja"        },
  { value: "transporter", label: "Transportista" },
  { value: "other",       label: "Otro"          },
]

const RISK_OPTIONS = [
  { value: "low",    label: "Bajo",  desc: "Ingredientes no críticos, proveedor certificado.",      color: "border-green-300 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300" },
  { value: "medium", label: "Medio", desc: "Materias primas directas o sin certificación completa.", color: "border-amber-300 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300" },
  { value: "high",   label: "Alto",  desc: "Proteínas animales, ingredientes RTE, sin auditoría.",  color: "border-red-300 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300" },
]

const VERIF_TYPES = [
  { value: "coa_review",        label: "Revisión de COA"      },
  { value: "on_site_audit",     label: "Auditoría en planta"  },
  { value: "inspection",        label: "Inspección"           },
  { value: "questionnaire",     label: "Cuestionario"         },
  { value: "third_party_audit", label: "Auditoría tercera"    },
  { value: "document_review",   label: "Revisión documental"  },
]

const VERIF_RESULTS = [
  { value: "approved",    label: "Aprobado",    color: "bg-green-100 border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300" },
  { value: "conditional", label: "Condicional", color: "bg-amber-100 border-amber-300 text-amber-700 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300" },
  { value: "rejected",    label: "Rechazado",   color: "bg-red-100 border-red-300 text-red-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300" },
]

export default function NuevoProveedorPage() {
  const router   = useRouter()
  const supabase = createClient()
  const [isPending, startTransition] = useTransition()

  const today = new Date().toISOString().split("T")[0]

  const [form, setForm] = useState({
    name:              "",
    company_type:      "processor",
    contact_name:      "",
    phone:             "",
    email:             "",
    address:           "",
    est_number:        "",
    products_supplied: "",
    risk_level:        "medium",
    is_approved:       false,
    approval_date:     today,
    approval_expiry:   "",
    notes:             "",
  })

  const [addVerif, setAddVerif] = useState(false)
  const [verif, setVerif] = useState({
    verification_date: today,
    verification_type: "coa_review",
    result:            "approved",
    findings:          "",
    next_review_date:  "",
    notes:             "",
  })

  const [error,   setError]   = useState("")
  const [success, setSuccess] = useState(false)

  function setF(k: string, v: string | boolean) {
    setForm((p) => ({ ...p, [k]: v }))
  }
  function setV(k: string, v: string) {
    setVerif((p) => ({ ...p, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!form.name.trim()) return setError("El nombre del proveedor es requerido.")

    startTransition(async () => {
      const { data: newSupplier, error: sErr } = await supabase
        .from("suppliers")
        .insert({
          name:              form.name.trim(),
          company_type:      form.company_type,
          contact_name:      form.contact_name || null,
          phone:             form.phone        || null,
          email:             form.email        || null,
          address:           form.address      || null,
          est_number:        form.est_number   || null,
          products_supplied: form.products_supplied || null,
          risk_level:        form.risk_level,
          is_approved:       form.is_approved,
          approval_date:     form.is_approved ? form.approval_date || null : null,
          approval_expiry:   form.is_approved ? form.approval_expiry || null : null,
          notes:             form.notes || null,
        })
        .select("id")
        .single()

      if (sErr) { setError(sErr.message); return }

      if (addVerif && verif.verification_date) {
        const { error: vErr } = await supabase
          .from("supplier_verifications")
          .insert({
            supplier_id:       newSupplier.id,
            verification_date: verif.verification_date,
            verification_type: verif.verification_type,
            result:            verif.result,
            findings:          verif.findings  || null,
            next_review_date:  verif.next_review_date || null,
            notes:             verif.notes     || null,
          })
        if (vErr) { setError(vErr.message); return }
      }

      setSuccess(true)
      setTimeout(() => router.push("/proveedores"), 1000)
    })
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <p className="text-lg font-bold text-slate-800 dark:text-slate-100">Proveedor registrado</p>
        <p className="text-sm text-slate-500 dark:text-slate-300">Redirigiendo…</p>
      </div>
    )
  }

  const inputCls = "w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400"
  const cardCls  = "bg-white dark:bg-[#111827] rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden"

  return (
    <div className="max-w-[760px] space-y-6">

      <div className="flex items-start gap-4">
        <button onClick={() => router.back()} className="mt-0.5 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-teal-600" />
            </span>
            Nuevo Proveedor
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-300 mt-1">9 CFR 417.4 · Verificación de proveedores</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Info */}
        <div className={cardCls}>
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-500 dark:text-slate-300" />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Información del proveedor</span>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Nombre *</label>
              <input type="text" value={form.name} onChange={(e) => setF("name", e.target.value)} required placeholder="Nombre del proveedor o empresa" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Tipo de empresa</label>
              <select value={form.company_type} onChange={(e) => setF("company_type", e.target.value)} className={inputCls}>
                {COMPANY_TYPES.map((ct) => <option key={ct.value} value={ct.value}>{ct.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-300 mb-1.5 uppercase tracking-wide">No. EST (USDA)</label>
              <input type="text" value={form.est_number} onChange={(e) => setF("est_number", e.target.value)} placeholder="Solo si aplica" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Contacto</label>
              <input type="text" value={form.contact_name} onChange={(e) => setF("contact_name", e.target.value)} placeholder="Nombre del contacto" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Teléfono</label>
              <input type="tel" value={form.phone} onChange={(e) => setF("phone", e.target.value)} placeholder="+1 (555) 000-0000" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Email</label>
              <input type="email" value={form.email} onChange={(e) => setF("email", e.target.value)} placeholder="correo@empresa.com" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Dirección</label>
              <input type="text" value={form.address} onChange={(e) => setF("address", e.target.value)} placeholder="Ciudad, Estado" className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Productos que suministra</label>
              <textarea value={form.products_supplied} onChange={(e) => setF("products_supplied", e.target.value)} rows={2} placeholder="Ej. Panceta de cerdo, especias, empaques…" className={inputCls + " resize-none"} />
            </div>
          </div>
        </div>

        {/* Risk */}
        <div className={cardCls}>
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-500 dark:text-slate-300" />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Nivel de riesgo</span>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {RISK_OPTIONS.map((r) => (
              <button key={r.value} type="button" onClick={() => setF("risk_level", r.value)}
                className={`text-left p-4 rounded-xl border-2 transition-all ${form.risk_level === r.value ? r.color + " font-semibold shadow-sm" : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"}`}>
                <span className="block font-bold text-sm mb-1">{r.label}</span>
                <span className="text-[11px] opacity-80 leading-relaxed">{r.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Approval */}
        <div className={cardCls}>
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-300" />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Estado de aprobación</span>
          </div>
          <div className="p-5 space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.is_approved} onChange={(e) => setF("is_approved", e.target.checked)} className="w-4 h-4 accent-teal-600" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Proveedor aprobado</span>
            </label>
            {form.is_approved && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Fecha de aprobación</label>
                  <input type="date" value={form.approval_date} max={today} onChange={(e) => setF("approval_date", e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Vence el</label>
                  <input type="date" value={form.approval_expiry} min={today} onChange={(e) => setF("approval_expiry", e.target.value)} className={inputCls} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className={cardCls}>
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500 dark:text-slate-300" />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Notas</span>
          </div>
          <div className="p-5">
            <textarea value={form.notes} onChange={(e) => setF("notes", e.target.value)} rows={2} placeholder="Observaciones adicionales…" className={inputCls + " resize-none"} />
          </div>
        </div>

        {/* First verification */}
        <div className={cardCls}>
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={addVerif} onChange={(e) => setAddVerif(e.target.checked)} className="w-4 h-4 accent-teal-600" />
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Registrar primera verificación ahora</span>
            </label>
          </div>
          {addVerif && (
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Fecha</label>
                  <input type="date" value={verif.verification_date} max={today} onChange={(e) => setV("verification_date", e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Tipo</label>
                  <select value={verif.verification_type} onChange={(e) => setV("verification_type", e.target.value)} className={inputCls}>
                    {VERIF_TYPES.map((vt) => <option key={vt.value} value={vt.value}>{vt.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Resultado</label>
                <div className="flex gap-2 flex-wrap">
                  {VERIF_RESULTS.map((r) => (
                    <button key={r.value} type="button" onClick={() => setV("result", r.value)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-all ${verif.result === r.value ? r.color : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Hallazgos</label>
                <textarea value={verif.findings} onChange={(e) => setV("findings", e.target.value)} rows={2} placeholder="Resultados o hallazgos…" className={inputCls + " resize-none"} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Próxima revisión</label>
                <input type="date" value={verif.next_review_date} min={today} onChange={(e) => setV("next_review_date", e.target.value)} className={inputCls} />
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-between gap-4 pb-8">
          <button type="button" onClick={() => router.back()} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={isPending} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold shadow-sm transition-all">
            {isPending
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando…</>
              : <><Save className="w-4 h-4" />Guardar proveedor</>
            }
          </button>
        </div>
      </form>
    </div>
  )
}
