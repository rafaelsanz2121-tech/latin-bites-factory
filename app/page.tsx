import Link from "next/link"
import {
  Zap, Truck, Snowflake, Flame, FlaskConical, CheckSquare,
  Package, Microscope, GraduationCap, ShieldAlert, Bug,
  RotateCcw, Droplets, ClipboardCheck, Heart, AlertTriangle,
  Wrench, BarChart3, DollarSign, Boxes, TrendingUp, Send,
  Building2, ShieldCheck, Bell, ArrowRight, Check,
} from "lucide-react"

const MODULES = [
  { label: "Recepción",       icon: Truck,         reg: "9 CFR 417",   color: "text-blue-400"    },
  { label: "Descongelado",    icon: Snowflake,      reg: "9 CFR 417",   color: "text-cyan-400"    },
  { label: "Cocción / CCP",   icon: Flame,          reg: "9 CFR 417",   color: "text-orange-400"  },
  { label: "Calibración",     icon: FlaskConical,   reg: "9 CFR 417",   color: "text-purple-400"  },
  { label: "Sanitación",      icon: CheckSquare,    reg: "9 CFR 416",   color: "text-green-400"   },
  { label: "Pre-Embarque",    icon: Package,        reg: "9 CFR 417",   color: "text-yellow-400"  },
  { label: "Listeria",        icon: Microscope,     reg: "9 CFR 430",   color: "text-red-400"     },
  { label: "Capacitación",    icon: GraduationCap,  reg: "9 CFR 417",   color: "text-indigo-400"  },
  { label: "Det. Metales",    icon: Zap,            reg: "9 CFR 417",   color: "text-yellow-300"  },
  { label: "Proveedores",     icon: Building2,      reg: "9 CFR 417",   color: "text-slate-300"   },
  { label: "Despacho",        icon: Send,           reg: "9 CFR 381",   color: "text-teal-400"    },
  { label: "Alérgenos",       icon: ShieldAlert,    reg: "FALCPA",      color: "text-pink-400"    },
  { label: "Plagas",          icon: Bug,            reg: "9 CFR 416",   color: "text-lime-400"    },
  { label: "Recall",          icon: RotateCcw,      reg: "9 CFR 418",   color: "text-red-300"     },
  { label: "Agua Retenida",   icon: Droplets,       reg: "9 CFR 441",   color: "text-cyan-300"    },
  { label: "Agua Potable",    icon: Droplets,       reg: "9 CFR 416.4", color: "text-blue-300"    },
  { label: "Auditoría HACCP", icon: ClipboardCheck, reg: "9 CFR 417.8", color: "text-indigo-300"  },
  { label: "Salud Personal",  icon: Heart,          reg: "9 CFR 416.8", color: "text-rose-400"    },
  { label: "Desviaciones",    icon: AlertTriangle,  reg: "9 CFR 417",   color: "text-amber-400"   },
  { label: "Acciones CAPA",   icon: Wrench,         reg: "9 CFR 417",   color: "text-orange-300"  },
  { label: "Reportes",        icon: BarChart3,      reg: "Todos",       color: "text-green-300"   },
  { label: "Costos",          icon: DollarSign,     reg: "Interno",     color: "text-emerald-400" },
  { label: "Inventario",      icon: Boxes,          reg: "Interno",     color: "text-violet-400"  },
  { label: "Finanzas",        icon: TrendingUp,     reg: "Interno",     color: "text-sky-400"     },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#080e1c] text-white overflow-x-hidden">

      {/* ── NAV ─────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.06] backdrop-blur-xl bg-[#080e1c]/80">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg shadow-red-900/40">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-lg tracking-tight">
              Factor<span className="text-red-500">OS</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-400">
            <a href="#modulos" className="hover:text-white transition-colors">Módulos</a>
            <a href="#caracteristicas" className="hover:text-white transition-colors">Características</a>
            <a href="#precios" className="hover:text-white transition-colors">Precios</a>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login"
              className="hidden sm:block text-sm font-semibold text-slate-300 hover:text-white transition-colors px-4 py-2">
              Iniciar sesión
            </Link>
            <Link href="/login"
              className="text-sm font-bold px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-colors shadow-lg shadow-red-900/30">
              Comenzar gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────── */}
      <section
        className="relative pt-24 pb-20 px-6 text-center overflow-hidden"
        style={{ background: "radial-gradient(ellipse at 50% -10%, rgba(239,68,68,0.18) 0%, transparent 65%)" }}
      >
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "60px 60px" }}
        />
        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-bold tracking-wide mb-8">
            <ShieldCheck className="w-3.5 h-3.5" />
            USDA INSPECTED · 9 CFR 417 COMPLIANT
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] mb-6">
            El sistema operativo<br />
            <span className="text-red-500">de tu planta de carnes</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            FactorOS digitaliza toda tu operación HACCP en una sola plataforma.
            Registros, trazabilidad, auditorías y alertas — listos para la inspección del día 1.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Link href="/login"
              className="flex items-center gap-2 px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-black text-base rounded-2xl transition-all shadow-2xl shadow-red-900/40 hover:-translate-y-0.5">
              Comenzar gratis <ArrowRight className="w-5 h-5" />
            </Link>
            <a href="#modulos"
              className="flex items-center gap-2 px-8 py-4 border border-white/20 hover:border-white/40 text-slate-300 hover:text-white font-bold text-base rounded-2xl transition-all">
              Ver todos los módulos
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-600 dark:text-slate-400">
            {["Sin tarjeta de crédito", "Setup en 5 minutos", "FSIS ready"].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-green-500" />{t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF ────────────────────────────────── */}
      <section className="py-10 px-6 border-y border-white/[0.06] bg-white/[0.02]">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-xs font-bold tracking-[2px] text-slate-600 uppercase mb-6">
            Confiado por plantas USDA inspeccionadas
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {["EST M/P2643", "EST M/P1847", "EST P/3201", "EST M/2985", "EST P/4417"].map((est) => (
              <span key={est}
                className="px-4 py-2 rounded-lg border border-white/10 bg-white/[0.04] text-slate-600 dark:text-slate-400 text-xs font-bold font-mono tracking-wide">
                {est}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── MODULES ─────────────────────────────────────── */}
      <section id="modulos" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-red-500 text-sm font-bold tracking-widest uppercase mb-3">Cobertura total</p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">
              24 módulos. Una plataforma.
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl mx-auto">
              Cada módulo cumple con una regulación federal específica. Sin parches, sin hojas de cálculo.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {MODULES.map((m) => (
              <div key={m.label}
                className="flex flex-col gap-3 p-4 rounded-xl border border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/20 transition-all">
                <m.icon className={`w-5 h-5 ${m.color}`} />
                <div>
                  <p className="text-sm font-bold text-slate-200 leading-tight">{m.label}</p>
                  <p className="text-[10px] font-bold text-slate-600 mt-1 font-mono">{m.reg}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────── */}
      <section id="caracteristicas" className="py-24 px-6 bg-white/[0.02] border-y border-white/[0.06]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-red-500 text-sm font-bold tracking-widest uppercase mb-3">Por qué FactorOS</p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight">
              Construido para pasar inspecciones
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: ShieldCheck, color: "text-green-400",  bg: "bg-green-500/10 border-green-500/20",  title: "Listo para USDA, siempre",         desc: "Todos los registros en formato digital aceptado por FSIS. Nunca más busques papeles cuando llegue el inspector federal." },
              { icon: RotateCcw,   color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/20",    title: "Trazabilidad en tiempo real",       desc: "Rastrea cualquier lote desde la materia prima hasta el despacho. Mock recalls ejecutados en segundos, no en horas." },
              { icon: Bell,        color: "text-amber-400",  bg: "bg-amber-500/10 border-amber-500/20",  title: "Alertas antes del problema",        desc: "Zonas de Listeria vencidas, capacitaciones por expirar, temperaturas fuera de límite. FactorOS te avisa antes que el inspector." },
            ].map((f) => (
              <div key={f.title}
                className="p-8 rounded-2xl border border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.05] transition-all">
                <div className={`w-12 h-12 rounded-xl border ${f.bg} flex items-center justify-center mb-6`}>
                  <f.icon className={`w-6 h-6 ${f.color}`} />
                </div>
                <h3 className="text-xl font-black text-white mb-3">{f.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── REGS BADGES ─────────────────────────────────── */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-bold tracking-[2px] text-slate-600 uppercase mb-8">Regulaciones cubiertas</p>
          <div className="flex flex-wrap justify-center gap-3">
            {["9 CFR 417 — HACCP","9 CFR 416 — SSOP","9 CFR 430 — Listeria","9 CFR 441 — Agua Retenida","9 CFR 381 — Aves","9 CFR 418 — Recall","FALCPA — Alérgenos","9 CFR 416.8 — Salud","9 CFR 416.4 — Agua","9 CFR 417.8 — Auditoría"].map((r) => (
              <span key={r} className="px-3 py-1.5 text-xs font-bold rounded-lg border border-white/10 bg-white/[0.04] text-slate-600 dark:text-slate-400">{r}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────── */}
      <section id="precios" className="py-24 px-6 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-red-500 text-sm font-bold tracking-widest uppercase mb-3">Precios</p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">Simple y transparente</h2>
            <p className="text-slate-600 dark:text-slate-400">Ahorra 20% con plan anual · Sin costos ocultos · Cancela cuando quieras</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Professional */}
            <div className="relative p-8 rounded-2xl border border-red-500/40 bg-red-500/5">
              <div className="absolute -top-3 left-8">
                <span className="px-3 py-1 bg-red-600 text-white text-xs font-black rounded-full uppercase tracking-wide">Más popular</span>
              </div>
              <p className="text-xs font-bold text-red-400 mb-2 uppercase tracking-widest">Professional</p>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-5xl font-black">$399</span>
                <span className="text-slate-400 mb-2 text-sm">/mes</span>
              </div>
              <p className="text-sm text-slate-400 mb-8">Todo lo que necesitas para digitalizar tu planta y pasar cualquier inspección USDA.</p>
              <ul className="space-y-3 mb-8">
                {[
                  "Hasta 25 usuarios",
                  "24 módulos HACCP + Empresariales",
                  "Dashboard de compliance en tiempo real",
                  "Producción inteligente con IA",
                  "Costos, Inventario y Finanzas",
                  "Exportación PDF ilimitada",
                  "Alertas automáticas (Listeria, CAPAs, temperaturas)",
                  "Soporte prioritario por email y chat",
                  "Onboarding guiado",
                  "14 días de prueba gratis",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-slate-300">
                    <Check className="w-4 h-4 text-red-400 flex-shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="block text-center py-3.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-900/30">
                Comenzar prueba gratis
              </Link>
            </div>
            {/* Enterprise */}
            <div className="relative p-8 rounded-2xl border border-white/[0.07] bg-white/[0.03]">
              <div className="absolute -top-3 left-8">
                <span className="px-3 py-1 bg-purple-600 text-white text-xs font-black rounded-full uppercase tracking-wide">Multi-planta</span>
              </div>
              <p className="text-xs font-bold text-purple-400 mb-2 uppercase tracking-widest">Enterprise</p>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-5xl font-black">$699</span>
                <span className="text-slate-400 mb-2 text-sm">/mes</span>
              </div>
              <p className="text-sm text-slate-400 mb-8">Para operaciones con múltiples plantas que necesitan control centralizado y compliance unificado.</p>
              <ul className="space-y-3 mb-8">
                {[
                  "Usuarios ilimitados",
                  "Todo lo de Professional incluido",
                  "Multi-planta ilimitado (1 dashboard, N plantas)",
                  "Reportes consolidados entre plantas",
                  "API para integraciones con ERP/SAP",
                  "Gerente de cuenta dedicado",
                  "Onboarding personalizado con tu equipo",
                  "SLA garantizado 99.9% uptime",
                  "Soporte telefónico 24/7",
                  "14 días de prueba gratis",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-slate-300">
                    <Check className="w-4 h-4 text-purple-400 flex-shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="block text-center py-3.5 border border-white/20 hover:border-white/40 text-white font-bold rounded-xl transition-all">
                Hablar con ventas
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────── */}
      <section className="py-24 px-6 mx-4 mb-12 rounded-3xl bg-gradient-to-br from-red-900/40 to-red-800/20 border border-red-500/20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-6">
            ¿Tu planta ya tiene<br />sistema HACCP digital?
          </h2>
          <p className="text-slate-300 text-lg mb-10 max-w-xl mx-auto">
            Configura FactorOS en 5 minutos y llega a tu próxima inspección USDA con todo en orden.
          </p>
          <Link href="/login"
            className="inline-flex items-center gap-2 px-10 py-4 bg-red-600 hover:bg-red-500 text-white font-black text-lg rounded-2xl transition-all shadow-2xl shadow-red-900/50 hover:-translate-y-0.5">
            Crear cuenta gratis <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-start justify-between gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="font-black">Factor<span className="text-red-500">OS</span></span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xs">El sistema operativo de las plantas de carne inspeccionadas por USDA.</p>
            </div>
            <div className="flex flex-wrap gap-8 text-sm text-slate-600 dark:text-slate-400">
              <div className="space-y-2">
                <p className="font-bold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wide">Producto</p>
                <a href="#modulos" className="block hover:text-white transition-colors">Módulos</a>
                <a href="#precios" className="block hover:text-white transition-colors">Precios</a>
                <a href="#caracteristicas" className="block hover:text-white transition-colors">Características</a>
              </div>
              <div className="space-y-2">
                <p className="font-bold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wide">Cuenta</p>
                <Link href="/login" className="block hover:text-white transition-colors">Iniciar sesión</Link>
                <Link href="/login" className="block hover:text-white transition-colors">Registrarse</Link>
              </div>
            </div>
          </div>
          <div className="pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <p>© 2026 FactorOS. Todos los derechos reservados.</p>
            <p>Para plantas USDA inspeccionadas bajo 9 CFR 417 · HACCP Compliant</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
