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
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f8fafc" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "2rem", textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M2 20h20M12 4v8M8 8H4a2 2 0 0 0-2 2v8h20v-8a2 2 0 0 0-2-2h-4" />
            </svg>
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 8, color: "#0f172a" }}>
            Latin Bites Factory
          </h1>
          <p style={{ color: "#64748b", marginBottom: 8 }}>
            A critical error occurred. Please try again.
          </p>
          {error.digest && (
            <p style={{ fontSize: "0.75rem", color: "#94a3b8", fontFamily: "monospace", marginBottom: 24 }}>
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{ padding: "0.5rem 1.5rem", background: "#2563eb", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: "0.875rem", fontWeight: 600 }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  )
}
