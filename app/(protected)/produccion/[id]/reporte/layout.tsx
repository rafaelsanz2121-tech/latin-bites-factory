// This layout bypasses the main app shell (sidebar + topbar) so the page
// renders as a standalone print document — same pattern used by app/print/layout.tsx
export default function ReporteLayout({ children }: { children: React.ReactNode }) {
  return children
}
