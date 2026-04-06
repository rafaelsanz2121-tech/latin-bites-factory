// Minimal layout for print views — no sidebar, no topbar, no Toaster
const PRINT_STYLES = `
  * { box-sizing: border-box; }
  body {
    margin: 0 !important;
    padding: 40px !important;
    background: white !important;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 11px;
    color: #0f172a;
    line-height: 1.5;
  }
  [data-sonner-toaster] { display: none !important; }

  /* ── Header ───────────────────────────────────────── */
  .pb-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 3px solid #0f172a;
  }
  .pb-logo-row { display: flex; align-items: center; gap: 10px; }
  .pb-logo-icon {
    width: 36px; height: 36px; border-radius: 8px;
    background: linear-gradient(135deg, #dc2626, #991b1b);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .pb-logo-icon svg { width: 20px; height: 20px; fill: white; }
  .pb-logo-text { font-size: 22px; font-weight: 900; letter-spacing: -0.5px; }
  .pb-logo-text span { color: #dc2626; }
  .pb-logo-sub { font-size: 9px; color: #64748b; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; margin-top: 1px; }

  .pb-header-right { text-align: right; }
  .pb-doc-title { font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom: 4px; }
  .pb-doc-meta { font-size: 9.5px; color: #64748b; line-height: 1.6; }
  .pb-doc-id {
    display: inline-block; background: #f1f5f9; border: 1px solid #e2e8f0;
    border-radius: 4px; padding: 2px 8px; font-size: 9px; font-weight: 700;
    font-family: monospace; color: #334155; margin-top: 4px;
    letter-spacing: .06em;
  }

  /* ── Meta pills row ───────────────────────────────── */
  .pb-meta {
    display: flex; gap: 0; margin-bottom: 24px;
    border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;
  }
  .pb-meta-item {
    flex: 1; padding: 10px 14px;
    border-right: 1px solid #e2e8f0;
    background: #f8fafc;
  }
  .pb-meta-item:last-child { border-right: none; }
  .pb-meta-item label {
    font-size: 8.5px; font-weight: 700; text-transform: uppercase;
    letter-spacing: .08em; color: #94a3b8; display: block; margin-bottom: 3px;
  }
  .pb-meta-item span { font-size: 12px; font-weight: 700; color: #0f172a; }

  /* ── Data table ───────────────────────────────────── */
  .pb-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
  .pb-table thead tr { background: #0f172a; }
  .pb-table th {
    font-size: 8.5px; text-transform: uppercase; letter-spacing: .08em;
    font-weight: 700; color: #94a3b8; padding: 8px 12px; text-align: left;
  }
  .pb-table tbody tr:nth-child(even) td { background: #f8fafc; }
  .pb-table td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  .pb-table td:first-child {
    font-weight: 600; width: 32%; color: #475569;
    font-size: 9.5px; text-transform: uppercase; letter-spacing: .04em;
  }
  .pb-table td:last-child { font-size: 11px; font-weight: 500; color: #0f172a; }
  .pb-table pre {
    font-family: monospace; font-size: 10px; white-space: pre-wrap;
    margin: 0; background: #f1f5f9; padding: 6px 8px; border-radius: 4px;
  }

  /* ── Signature block ──────────────────────────────── */
  .pb-sigs {
    display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px;
    margin-top: 32px; padding-top: 20px; border-top: 2px solid #e2e8f0;
  }
  .pb-sig-block {
    border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px;
    background: #f8fafc;
  }
  .pb-sig-block label {
    font-size: 8.5px; font-weight: 700; text-transform: uppercase;
    color: #94a3b8; display: block; margin-bottom: 6px; letter-spacing: .08em;
  }
  .pb-sig-name  { font-size: 12px; font-weight: 700; color: #0f172a; min-height: 18px; }
  .pb-sig-line  { border-bottom: 1.5px solid #cbd5e1; margin-top: 28px; }
  .pb-sig-date  { font-size: 9px; color: #94a3b8; margin-top: 4px; }

  /* ── Footer ───────────────────────────────────────── */
  .pb-footer {
    margin-top: 24px; padding-top: 12px;
    border-top: 1px solid #f1f5f9;
    display: flex; justify-content: space-between; align-items: center;
    font-size: 8.5px; color: #94a3b8;
  }
  .pb-footer-center { text-align: center; color: #cbd5e1; font-size: 8px; }

  /* ── Alert banners ────────────────────────────────── */
  .pb-alert {
    padding: 10px 14px; border-radius: 6px; margin-bottom: 14px;
    font-size: 11px; font-weight: 700; border-left: 4px solid; display: flex; gap: 8px;
  }
  .pb-alert-red    { background: #fef2f2; color: #991b1b; border-color: #dc2626; }
  .pb-alert-amber  { background: #fffbeb; color: #92400e; border-color: #f59e0b; }
  .pb-alert-green  { background: #f0fdf4; color: #166534; border-color: #22c55e; }

  /* ── Screen-only styles (print button area) ───────── */
  .no-print {
    background: #0f172a; color: white; border-radius: 12px;
    padding: 16px 20px; margin-bottom: 24px;
    display: flex; justify-content: space-between; align-items: center;
  }

  @media print {
    body { padding: 0 !important; }
    @page { margin: 1.5cm; size: letter; }
    .no-print { display: none !important; }
  }
`

export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PRINT_STYLES }} />
      {children}
    </>
  )
}
