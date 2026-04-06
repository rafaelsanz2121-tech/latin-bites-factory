import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, CheckCircle, XCircle, MinusCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LogStatusBadge } from "@/components/logs/LogStatusBadge"
import { SignatureBlock } from "@/components/logs/SignatureBlock"
import { GenericActionButtons } from "@/components/forms/GenericActionButtons"
import { formatDate } from "@/lib/utils"
import { PREOP_SECTIONS } from "@/constants/areas"

interface Props { params: Promise<{ id: string }> }

export default async function PreOpDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [{ data: profile }, { data: report }, { data: reportItems }] = await Promise.all([
    supabase.from("profiles").select("id, role").eq("id", user.id).single(),
    supabase.from("preop_sanitation_reports").select(`
      *,
      creator:profiles!preop_sanitation_reports_created_by_fkey(id, full_name, initials),
      verifier:profiles!preop_sanitation_reports_verified_by_fkey(full_name),
      approver:profiles!preop_sanitation_reports_approved_by_fkey(full_name)
    `).eq("id", id).single(),
    supabase.from("preop_sanitation_items").select("*").eq("report_id", id),
  ])

  if (!profile || !report) notFound()

  // Build a lookup: section -> itemKey+period -> value
  const itemMap: Record<string, Record<string, string>> = {}
  for (const item of reportItems || []) {
    if (!itemMap[item.section]) itemMap[item.section] = {}
    const k = item.period ? `${item.item_key}_${item.period}` : item.item_key
    itemMap[item.section][k] = item.value
  }

  const valueIcon = (val: string | undefined) => {
    if (val === "pass") return <CheckCircle className="w-4 h-4 text-emerald-600" />
    if (val === "fail") return <XCircle className="w-4 h-4 text-red-600" />
    if (val === "na") return <MinusCircle className="w-4 h-4  text-slate-600 dark:text-slate-300" />
    return <span className="w-4 h-4 rounded-full border-2 border-dashed border-slate-300 inline-block" />
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <Link href="/sanitation/preop" className="flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-3">
          <ArrowLeft className="w-3.5 h-3.5" />Pre-Op Reports
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Daily Pre-Op Sanitation Report</h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
              {formatDate(report.report_date)}
              {report.inspection_time && (
                <span className="ml-2">· {report.inspection_time.slice(0, 5)}</span>
              )}
            </p>
          </div>
          <LogStatusBadge status={report.status} />
        </div>
      </div>

      <GenericActionButtons
        log={{ id: report.id, status: report.status, created_by: report.created_by }}
        currentUserId={user.id}
        currentUserRole={profile.role}
        tableName="preop_sanitation_reports"
      />

      {/* Summary card */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-700">{report.pass_count} Pass</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-semibold text-red-700">{report.fail_count} Fail</span>
            </div>
            <div className="flex items-center gap-2">
              <MinusCircle className="w-4 h-4  text-slate-600 dark:text-slate-300" />
              <span className="text-sm text-slate-600">{report.na_count} N/A</span>
            </div>
            <span className="text-sm text-[var(--muted-foreground)] ml-auto">{report.total_items} total items</span>
          </div>
          {(report.general_notes || report.notes) && (
            <p className="text-sm mt-3 pt-3 border-t border-[var(--border)] text-[var(--foreground)]">
              {report.general_notes || report.notes}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Section detail */}
      {PREOP_SECTIONS.map((section) => {
        const sectionMap = itemMap[section.section] || {}
        const hasFail = Object.values(sectionMap).some((v) => v === "fail")
        return (
          <Card key={section.section} className={hasFail ? "border-red-200" : undefined}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                {section.label}
                {hasFail && <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded font-medium">Failures</span>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {section.hasDualPeriod ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-[var(--muted-foreground)] border-b border-[var(--border)]">
                      <th className="text-left pb-1.5">Item</th>
                      <th className="text-center pb-1.5 w-16">AM</th>
                      <th className="text-center pb-1.5 w-16">PM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.items.map((item) => (
                      <tr key={item.key} className="border-b border-[var(--border)] last:border-0">
                        <td className="py-2">{item.label}</td>
                        <td className="py-2 text-center">{valueIcon(sectionMap[`${item.key}_am`])}</td>
                        <td className="py-2 text-center">{valueIcon(sectionMap[`${item.key}_pm`])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="space-y-1.5">
                  {section.items.map((item) => (
                    <div key={item.key} className="flex items-center justify-between py-1 border-b border-[var(--border)] last:border-0">
                      <span>{item.label}</span>
                      {valueIcon(sectionMap[item.key])}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}

      <SignatureBlock
        status={report.status}
        creator={report.creator}
        submittedAt={report.submitted_at}
        verifier={report.verifier}
        verifiedAt={report.verified_at}
        approver={report.approver}
        approvedAt={report.approved_at}
        lockedAt={report.locked_at}
      />
    </div>
  )
}
