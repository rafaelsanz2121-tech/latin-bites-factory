import { PreOpSanitationForm } from "@/components/forms/PreOpSanitationForm"

export default function NewPreOpReportPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Daily Pre-Op Sanitation Report</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">Complete before operations begin — Sections A–K</p>
      </div>
      <PreOpSanitationForm />
    </div>
  )
}
