"use client"

import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[Global Error]", error)
  }, [error])

  return (
    <html>
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#080e1c" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "2rem", textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: "linear-gradient(135deg, #ef4444, #b91c1c)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24, boxShadow: "0 8px 32px rgba(239,68,68,0.3)" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <p style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.15em", color: "#ef4444", marginBottom: 8, textTransform: "uppercase" }}>
            FactorOS
          </p>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: 8, color: "#f1f5f9" }}>
            Ocurrió un error crítico
          </h1>
          <p style={{ color: "#64748b", marginBottom: 8, maxWidth: 360 }}>
            El sistema encontró un error inesperado. Por favor intenta de nuevo.
          </p>
          {error.digest && (
            <p style={{ fontSize: "0.75rem", color: "#475569", fontFamily: "monospace", marginBottom: 24, background: "rgba(255,255,255,0.05)", padding: "6px 12px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)" }}>
              Error ID: {error.digest}
            </p>
          )}
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={reset}
              style={{ padding: "0.6rem 1.5rem", background: "#dc2626", color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontSize: "0.875rem", fontWeight: 700 }}
            >
              Intentar de nuevo
            </button>
            <a
              href="/dashboard"
              style={{ padding: "0.6rem 1.5rem", background: "rgba(255,255,255,0.06)", color: "#cbd5e1", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, cursor: "pointer", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none" }}
            >
              Ir al dashboard
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
