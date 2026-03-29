"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"
import Link from "next/link"

export default function ProtectedError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log to error tracking (e.g. Sentry) in production
    console.error("[App Error]", error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-6">
        <AlertTriangle className="w-8 h-8 text-red-600" />
      </div>

      <h1 className="text-xl font-bold text-[var(--foreground)] mb-2">Something went wrong</h1>
      <p className="text-sm text-[var(--muted-foreground)] max-w-md mb-2">
        An unexpected error occurred while loading this page. Your data is safe — this is a display issue only.
      </p>
      {error.digest && (
        <p className="text-xs text-[var(--muted-foreground)] font-mono mb-6 bg-[var(--muted)] px-3 py-1 rounded">
          Error ID: {error.digest}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={reset} variant="outline">
          <RefreshCw className="w-4 h-4" />
          Try Again
        </Button>
        <Link href="/dashboard">
          <Button>
            <Home className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  )
}
