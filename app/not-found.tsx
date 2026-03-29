import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Factory, Home } from "lucide-react"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--background)] px-4 text-center">
      <div className="mb-8">
        <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4">
          <Factory className="w-8 h-8 text-white" />
        </div>
        <p className="text-6xl font-black text-[var(--muted-foreground)]/20 leading-none">404</p>
      </div>

      <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2">Page not found</h1>
      <p className="text-[var(--muted-foreground)] mb-8 max-w-sm">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>

      <Link href="/dashboard">
        <Button>
          <Home className="w-4 h-4" />
          Back to Dashboard
        </Button>
      </Link>
    </div>
  )
}
