import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface PaginationProps {
  page: number
  pageSize: number
  total: number
  /** Base URL — pagination appends ?page=N (preserves other search params) */
  baseHref: string
}

export function Pagination({ page, pageSize, total, baseHref }: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null

  const hasPrev = page > 1
  const hasNext = page < totalPages

  // Build href preserving existing query params
  function buildHref(p: number) {
    const url = new URL(baseHref, "http://x")
    url.searchParams.set("page", String(p))
    return url.pathname + (url.search ? url.search : "")
  }

  // Generate page numbers to show (always show first, last, and ±1 around current)
  const pages: (number | "…")[] = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== "…") {
      pages.push("…")
    }
  }

  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)]">
      <p className="text-xs text-[var(--muted-foreground)]">
        Showing <span className="font-medium">{start}–{end}</span> of <span className="font-medium">{total}</span>
      </p>

      <div className="flex items-center gap-1">
        {hasPrev ? (
          <Link
            href={buildHref(page - 1)}
            className="flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Prev
          </Link>
        ) : (
          <span className="flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium text-[var(--muted-foreground)] opacity-40 cursor-not-allowed">
            <ChevronLeft className="w-3.5 h-3.5" /> Prev
          </span>
        )}

        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`ellipsis-${i}`} className="px-2 py-1.5 text-xs text-[var(--muted-foreground)]">…</span>
          ) : (
            <Link
              key={p}
              href={buildHref(p)}
              className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                p === page
                  ? "bg-blue-600 text-white"
                  : "text-[var(--foreground)] hover:bg-[var(--muted)]"
              }`}
            >
              {p}
            </Link>
          )
        )}

        {hasNext ? (
          <Link
            href={buildHref(page + 1)}
            className="flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
          >
            Next <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        ) : (
          <span className="flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium text-[var(--muted-foreground)] opacity-40 cursor-not-allowed">
            Next <ChevronRight className="w-3.5 h-3.5" />
          </span>
        )}
      </div>
    </div>
  )
}
