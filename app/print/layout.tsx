// Minimal layout for print views — no sidebar, no topbar, no Toaster
const PRINT_STYLES = `
  * { box-sizing: border-box; }
  body {
    margin: 0 !important;
    padding: 32px !important;
    background: white !important;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 11px;
    color: #111;
  }
  /* Hide anything injected by root layout */
  [data-sonner-toaster] { display: none !important; }

  /* ── Print-specific classes ───────────────────── */
  .pb-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #111;
    padding-bottom: 12px;
    margin-bottom: 20px;
  }
  .pb-header-left h1 { font-size: 18px; font-weight: 700; margin: 0; }
  .pb-header-left p  { font-size: 11px; color: #555; margin: 2px 0 0; }
  .pb-header-right   { text-align: right; font-size: 10px; color: #555; }
  .pb-header-right strong { display: block; font-size: 12px; color: #111; }
  .pb-header-right span   { display: block; margin-top: 2px; }

  .pb-meta { display: flex; gap: 32px; margin-bottom: 20px; }
  .pb-meta-item label {
    font-size: 9px; font-weight: 700; text-transform: uppercase;
    letter-spacing: .05em; color: #666; display: block;
  }
  .pb-meta-item span { font-size: 12px; font-weight: 600; }

  .pb-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  .pb-table th {
    background: #f3f4f6; font-size: 9px; text-transform: uppercase;
    letter-spacing: .05em; font-weight: 700; color: #444;
    padding: 6px 10px; text-align: left; border: 1px solid #e5e7eb;
  }
  .pb-table td { padding: 6px 10px; border: 1px solid #e5e7eb; vertical-align: top; }
  .pb-table td:first-child {
    font-weight: 600; width: 35%; background: #fafafa; color: #555;
    font-size: 10px; text-transform: uppercase; letter-spacing: .04em;
  }
  .pb-table pre {
    font-family: monospace; font-size: 10px; white-space: pre-wrap; margin: 0;
  }

  .pb-sigs {
    display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px;
    margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 16px;
  }
  .pb-sig-block label {
    font-size: 9px; font-weight: 700; text-transform: uppercase;
    color: #666; display: block; margin-bottom: 4px;
  }
  .pb-sig-name  { font-size: 11px; font-weight: 600; }
  .pb-sig-line  { border-bottom: 1px solid #999; margin-top: 20px; }

  .pb-footer {
    margin-top: 24px; padding-top: 10px;
    border-top: 1px solid #e5e7eb;
    display: flex; justify-content: space-between;
    font-size: 9px; color: #888;
  }

  .pb-alert {
    padding: 8px 12px; border-radius: 4px; margin-bottom: 12px;
    font-size: 10px; font-weight: 600; border: 1px solid;
  }
  .pb-alert-red    { background: #fef2f2; color: #991b1b; border-color: #fca5a5; }
  .pb-alert-amber  { background: #fffbeb; color: #92400e; border-color: #fcd34d; }
  .pb-alert-green  { background: #f0fdf4; color: #166534; border-color: #86efac; }

  @media print {
    body { padding: 0 !important; }
    @page { margin: 1.5cm; size: letter; }
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
