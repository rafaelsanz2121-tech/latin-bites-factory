"use client"

export function PrintNowButton() {
  return (
    <div style={{ textAlign: "center", padding: "16px 0", borderBottom: "1px solid #e2e8f0" }} className="no-print">
      <button
        onClick={() => window.print()}
        style={{ background: "#dc2626", color: "white", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
      >
        🖨 Imprimir / Guardar PDF
      </button>
      <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>Usa Ctrl+P o el botón de arriba para guardar como PDF</p>
    </div>
  )
}
