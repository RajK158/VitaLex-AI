"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { X } from "lucide-react"
import { supabase } from "@/lib/supabase"

type DocumentRow = {
  id: string
  file_name: string
  file_path: string
  file_type: string | null
  file_size: number | null
  document_type: string | null
  payer: string | null
  department: string | null
  status: string | null
  created_at: string
  summary: string | null
  approval_status: string | null
}

const approvalStatusLabels: Record<string, string> = {
  draft: "Draft",
  in_review: "In Review",
  approved: "Approved",
  published: "Published",
}

const approvalStatusBadgeStyles: Record<string, string> = {
  draft: "border-zinc-700 text-zinc-300",
  in_review: "border-amber-500/40 text-amber-400",
  approved: "border-emerald-500/40 text-emerald-400",
  published: "border-sky-500/40 text-sky-400",
}

type GeneratedRule = {
  rule_id: string
  title: string
  condition: string
  action: string
  department: string
  risk_level: string
  source_reference: string
}

const riskBadgeStyles: Record<string, string> = {
  low: "border-emerald-500/40 text-emerald-400",
  medium: "border-amber-500/40 text-amber-400",
  high: "border-red-500/40 text-red-400",
}

type AuditLogRow = {
  id: string
  action: string
  entity_type: string | null
  entity_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

const auditActionLabels: Record<string, string> = {
  generated_summary: "Generated summary",
  generated_rules: "Generated rules",
  compared_documents: "Compared documents",
  exported_rules: "Exported rules",
  uploaded_document: "Uploaded document",
  deleted_document: "Deleted document",
  updated_approval_status: "Updated approval status",
}

const auditExportFormatLabels: Record<string, string> = {
  json: "JSON",
  sql: "SQL",
  python: "Python",
  pseudocode: "Pseudocode",
}

const RECENT_ACTIVITY_PREVIEW_COUNT = 2

function formatAuditMetadata(metadata: Record<string, unknown> | null) {
  if (!metadata) return null

  const parts: string[] = []

  if (typeof metadata.export_format === "string") {
    parts.push(
      `Format: ${
        auditExportFormatLabels[metadata.export_format] ||
        metadata.export_format
      }`
    )
  }

  if (typeof metadata.approval_status === "string") {
    parts.push(
      `Status: ${
        approvalStatusLabels[metadata.approval_status] ||
        metadata.approval_status
      }`
    )
  }

  if (
    typeof metadata.approval_notes === "string" &&
    metadata.approval_notes
  ) {
    parts.push(`Note: ${metadata.approval_notes}`)
  }

  if (typeof metadata.rule_count === "number") {
    parts.push(`Rules: ${metadata.rule_count}`)
  }

  if (typeof metadata.file_name === "string" && metadata.file_name) {
    parts.push(metadata.file_name)
  }

  if (metadata.old_document_id && metadata.new_document_id) {
    parts.push("Compared two documents")
  }

  return parts.length > 0 ? parts.join(" • ") : null
}

type RuleExportFormat = "json" | "pseudocode" | "sql" | "python"

const ruleExportFormatLabels: Record<RuleExportFormat, string> = {
  json: "JSON",
  pseudocode: "Pseudocode",
  sql: "SQL",
  python: "Python",
}

function downloadRulesExportFile(
  fileName: string,
  format: RuleExportFormat,
  content: string
) {
  const baseName = fileName.replace(/\.[^/.]+$/, "")
  const isJson = format === "json"
  const blob = new Blob([content], {
    type: isJson ? "application/json" : "text/plain",
  })
  const url = URL.createObjectURL(blob)

  const link = document.createElement("a")
  link.href = url
  link.download = isJson
    ? `vitalex-rules-${baseName}.json`
    : `vitalex-rules-${baseName}-${format}.txt`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default function DashboardPage() {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [documentType, setDocumentType] = useState("Billing Policy")
  const [payer, setPayer] = useState("")
  const [department, setDepartment] = useState("")
  const [documents, setDocuments] = useState<DocumentRow[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [summaryDoc, setSummaryDoc] = useState<DocumentRow | null>(null)
  const [rulesDoc, setRulesDoc] = useState<DocumentRow | null>(null)
  const [rules, setRules] = useState<GeneratedRule[]>([])
  const [rulesByDocument, setRulesByDocument] = useState<
    Record<string, GeneratedRule[]>
  >({})
  const [exportingFormat, setExportingFormat] = useState<
    RuleExportFormat | null
  >(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("All Types")
  const [statusFilter, setStatusFilter] = useState("All Statuses")
  const [approvalFilter, setApprovalFilter] = useState("All Approval Statuses")
  const [comparisonsCount, setComparisonsCount] = useState(0)
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([])
  const [showAllActivity, setShowAllActivity] = useState(false)

  async function fetchDocuments() {
    const { data, error } = await supabase
      .from("vitalex_documents")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      setMessage(error.message)
      return
    }

    setDocuments(data || [])
  }

  async function fetchComparisonsCount() {
    const { count, error } = await supabase
      .from("vitalex_comparisons")
      .select("*", { count: "exact", head: true })

    if (error) {
      setComparisonsCount(0)
      return
    }

    if (typeof count === "number") {
      setComparisonsCount(count)
      return
    }

    const { data: comparisonRows, error: fallbackError } = await supabase
      .from("vitalex_comparisons")
      .select("id")

    if (fallbackError) {
      setComparisonsCount(0)
      return
    }

    setComparisonsCount(comparisonRows?.length || 0)
  }

  async function fetchAuditLogs() {
    const { data, error } = await supabase
      .from("vitalex_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5)

    if (error) {
      return
    }

    setAuditLogs(data || [])
  }

  async function fetchRules() {
    try {
      const response = await fetch("/api/rules")
      const result = await response.json()

      if (!response.ok) {
        setMessage(result.error || "Failed to load rules.")
        return
      }

      const grouped: Record<string, GeneratedRule[]> = {}

      for (const row of result.rules || []) {
        const docId = row.document_id as string
        if (!grouped[docId]) grouped[docId] = []
        grouped[docId].push(row.rule_json as GeneratedRule)
      }

      setRulesByDocument(grouped)
    } catch {
      setMessage("Failed to load rules.")
    }
  }

  async function generateSummary(id: string) {
    try {
      setLoading(true)
      setMessage("Generating summary...")
  
      const response = await fetch(`/api/documents/${id}/summarize`, {
        method: "POST",
      })
  
      const result = await response.json()
  
      if (!response.ok) {
        setMessage(result.error || "Failed to generate summary.")
        return
      }
  
      setMessage("Summary generated successfully.")
      await fetchDocuments()
    } finally {
      setLoading(false)
    }
  }

  async function generateRules(doc: DocumentRow) {
    try {
      setLoading(true)
      setMessage("Generating rules...")

      const response = await fetch(`/api/documents/${doc.id}/rules`, {
        method: "POST",
      })

      const result = await response.json()

      if (!response.ok) {
        setMessage(result.error || "Failed to generate rules.")
        return
      }

      setRules(result.rules || [])
      setRulesDoc(doc)
      setMessage("Rules generated successfully.")
      await fetchRules()
    } finally {
      setLoading(false)
    }
  }

  function viewRules(doc: DocumentRow) {
    setRules(rulesByDocument[doc.id] || [])
    setRulesDoc(doc)
  }

  async function exportRulesInFormat(
    doc: DocumentRow,
    format: RuleExportFormat
  ) {
    try {
      setExportingFormat(format)
      setMessage(`Exporting ${ruleExportFormatLabels[format]}...`)

      const response = await fetch(
        `/api/documents/${doc.id}/export-rules`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ exportFormat: format }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        setMessage(
          result.error ||
            `Failed to export ${ruleExportFormatLabels[format]}.`
        )
        return
      }

      downloadRulesExportFile(doc.file_name, format, result.content || "")
      setMessage(
        `${ruleExportFormatLabels[format]} export downloaded successfully.`
      )
    } catch {
      setMessage(`Failed to export ${ruleExportFormatLabels[format]}.`)
    } finally {
      setExportingFormat(null)
    }
  }

  async function deleteDocument(doc: DocumentRow) {
    const confirmed = window.confirm(
      `Delete "${doc.file_name}"? This cannot be undone.`
    )

    if (!confirmed) return

    try {
      setLoading(true)
      setMessage("Deleting document...")

      const response = await fetch(`/api/documents/${doc.id}/delete`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (!response.ok) {
        setMessage(result.error || "Failed to delete document.")
        return
      }

      if (summaryDoc?.id === doc.id) {
        setSummaryDoc(null)
      }

      if (rulesDoc?.id === doc.id) {
        setRulesDoc(null)
      }

      setMessage("Document deleted successfully.")
      await fetchDocuments()
      await fetchRules()
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    async function checkAuth() {
      const { data } = await supabase.auth.getSession()

      if (!data.session) {
        router.push("/login")
        return
      }

      setAuthChecked(true)
    }

    checkAuth()
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  useEffect(() => {
    fetchDocuments()
    fetchRules()
    fetchComparisonsCount()
    fetchAuditLogs()
  }, [])

  useEffect(() => {
    if (!summaryDoc && !rulesDoc) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSummaryDoc(null)
        setRulesDoc(null)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [summaryDoc, rulesDoc])

  function clearFilters() {
    setSearchQuery("")
    setTypeFilter("All Types")
    setStatusFilter("All Statuses")
    setApprovalFilter("All Approval Statuses")
  }

  const filteredDocuments = documents.filter((doc) => {
    const query = searchQuery.trim().toLowerCase()
    const matchesQuery =
      !query ||
      [doc.file_name, doc.payer, doc.department, doc.document_type].some(
        (field) => field?.toLowerCase().includes(query)
      )

    const matchesType =
      typeFilter === "All Types" || doc.document_type === typeFilter

    const matchesStatus =
      statusFilter === "All Statuses" || doc.status === statusFilter

    const matchesApproval =
      approvalFilter === "All Approval Statuses" ||
      (doc.approval_status || "draft") === approvalFilter

    return matchesQuery && matchesType && matchesStatus && matchesApproval
  })

  const allGeneratedRules = Object.values(rulesByDocument).flat()

  const dashboardMetrics = [
    {
      label: "Documents Uploaded",
      value: documents.length,
    },
    {
      label: "Summaries Generated",
      value: documents.filter(
        (doc) => Boolean(doc.summary) || doc.status === "summarized"
      ).length,
    },
    {
      label: "Rules Generated",
      value: allGeneratedRules.length,
    },
    {
      label: "High-Risk Rules",
      value: allGeneratedRules.filter(
        (rule) => rule.risk_level?.toLowerCase() === "high"
      ).length,
    },
    {
      label: "Comparisons Run",
      value: comparisonsCount,
    },
  ]

  async function handleUpload() {
    if (!file) {
      setMessage("Please choose a file first.")
      return
    }

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ]

    if (!allowedTypes.includes(file.type)) {
      setMessage("Only PDF, DOCX, and TXT files are allowed.")
      return
    }

    try {
      setLoading(true)
      setMessage("")

      const safeFileName = file.name.replaceAll(" ", "_")
      const filePath = `${Date.now()}-${safeFileName}`

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file)

      if (uploadError) {
        setMessage(uploadError.message)
        return
      }

      const { error: insertError } = await supabase
        .from("vitalex_documents")
        .insert({
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          document_type: documentType,
          payer: payer || null,
          department: department || null,
          status: "uploaded",
        })

      if (insertError) {
        setMessage(insertError.message)
        return
      }

      setFile(null)
      setPayer("")
      setDepartment("")
      setMessage("Document uploaded successfully.")
      await fetchDocuments()
    } finally {
      setLoading(false)
    }
  }

  if (!authChecked) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-zinc-400">Checking authentication...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm font-medium uppercase tracking-wider text-zinc-400">
              VitaLex Dashboard
            </p>
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/compare"
                className="rounded-full border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-800"
              >
                Compare Documents
              </Link>
              <button
                onClick={handleLogout}
                className="rounded-full border border-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-300 transition hover:bg-zinc-800"
              >
                Logout
              </button>
            </div>
          </div>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">
            Upload healthcare policy documents
          </h1>
          <p className="mt-3 max-w-2xl text-zinc-400">
            Upload billing policies, coding rules, payer contracts, clinical
            guidelines, and other healthcare documents for summarization and
            rule generation.
          </p>
        </div>

        <section className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {dashboardMetrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4"
            >
              <p className="text-2xl font-bold tracking-tight text-white">
                {metric.value}
              </p>
              <p className="mt-1 text-xs text-zinc-400">{metric.label}</p>
            </div>
          ))}
        </section>

        <section className="mb-10 rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Recent Activity</h2>
            {auditLogs.length > RECENT_ACTIVITY_PREVIEW_COUNT && (
              <button
                onClick={() => setShowAllActivity((prev) => !prev)}
                className="rounded-full border border-zinc-700 px-3 py-1 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-800"
              >
                {showAllActivity ? "Show less" : "View all activity"}
              </button>
            )}
          </div>

          <div className="mt-4 grid gap-3">
            {(showAllActivity
              ? auditLogs
              : auditLogs.slice(0, RECENT_ACTIVITY_PREVIEW_COUNT)
            ).map((log) => {
              const metadataText = formatAuditMetadata(log.metadata)

              return (
                <div
                  key={log.id}
                  className="rounded-xl border border-zinc-800 bg-black p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-white">
                      {auditActionLabels[log.action] || log.action}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-400">
                    {log.entity_type || "Unknown entity"}
                    {metadataText ? ` • ${metadataText}` : ""}
                  </p>
                </div>
              )
            })}

            {auditLogs.length === 0 && (
              <p className="text-sm text-zinc-400">No recent activity yet.</p>
            )}
          </div>
        </section>

        <section className="mb-10 rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-zinc-300">
                Document file
              </label>
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full rounded-xl border border-zinc-800 bg-black p-3 text-sm text-zinc-300"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-zinc-300">
                Document type
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-black p-3 text-sm text-zinc-300"
              >
                <option>Billing Policy</option>
                <option>Coding Rule</option>
                <option>Clinical Guideline</option>
                <option>Payer-Provider Contract</option>
                <option>Compliance Policy</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-zinc-300">
                Payer
              </label>
              <input
                value={payer}
                onChange={(e) => setPayer(e.target.value)}
                placeholder="Example: CMS, Aetna, UnitedHealthcare"
                className="w-full rounded-xl border border-zinc-800 bg-black p-3 text-sm text-zinc-300"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-zinc-300">
                Department
              </label>
              <input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Example: Billing, Compliance, Clinical Ops"
                className="w-full rounded-xl border border-zinc-800 bg-black p-3 text-sm text-zinc-300"
              />
            </div>
          </div>

          <button
            onClick={handleUpload}
            disabled={loading}
            className="mt-6 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-50"
          >
            {loading ? "Uploading..." : "Upload Document"}
          </button>

          {message && (
            <p className="mt-4 text-sm text-zinc-300">
              {message}
            </p>
          )}
        </section>

        <section>
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <h2 className="text-2xl font-semibold">
              Uploaded documents
            </h2>
            <p className="text-sm text-zinc-400">
              Showing {filteredDocuments.length} of {documents.length} documents
            </p>
          </div>

          <div className="mb-6 grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 md:grid-cols-5">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm text-zinc-300">
                Search
              </label>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by file name, payer, or department"
                className="w-full rounded-xl border border-zinc-800 bg-black p-3 text-sm text-zinc-300"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-zinc-300">
                Document type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-black p-3 text-sm text-zinc-300"
              >
                <option>All Types</option>
                <option>Billing Policy</option>
                <option>Coding Rule</option>
                <option>Clinical Guideline</option>
                <option>Payer-Provider Contract</option>
                <option>Compliance Policy</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-zinc-300">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-black p-3 text-sm text-zinc-300"
              >
                <option>All Statuses</option>
                <option value="uploaded">uploaded</option>
                <option value="processing">processing</option>
                <option value="summarized">summarized</option>
                <option value="error">error</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-zinc-300">
                Approval status
              </label>
              <select
                value={approvalFilter}
                onChange={(e) => setApprovalFilter(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-black p-3 text-sm text-zinc-300"
              >
                <option>All Approval Statuses</option>
                <option value="draft">Draft</option>
                <option value="in_review">In Review</option>
                <option value="approved">Approved</option>
                <option value="published">Published</option>
              </select>
            </div>

            <button
              onClick={clearFilters}
              className="rounded-xl border border-zinc-800 px-4 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800 md:col-span-5 md:w-fit"
            >
              Clear Filters
            </button>
          </div>

          <div className="grid gap-4">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
              >
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">
                        {doc.file_name}
                      </h3>
                      <span
                        className={`rounded-full border px-3 py-1 text-xs ${
                          approvalStatusBadgeStyles[
                            doc.approval_status || "draft"
                          ] || "border-zinc-700 text-zinc-300"
                        }`}
                      >
                        {approvalStatusLabels[
                          doc.approval_status || "draft"
                        ] || "Draft"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-zinc-400">
                      {doc.document_type || "Unknown type"} •{" "}
                      {doc.payer || "No payer"} •{" "}
                      {doc.department || "No department"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {doc.status === "summarized" ? (
                      <>
                        <button
                          onClick={() => setSummaryDoc(doc)}
                          className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-black transition hover:bg-zinc-200"
                        >
                          View Summary
                        </button>
                        {rulesByDocument[doc.id]?.length ? (
                          <button
                            onClick={() => viewRules(doc)}
                            className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-black transition hover:bg-zinc-200"
                          >
                            View Rules
                          </button>
                        ) : (
                          <button
                            onClick={() => generateRules(doc)}
                            disabled={loading}
                            className="rounded-full border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-800 disabled:opacity-50"
                          >
                            Generate Rules
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        onClick={() => generateSummary(doc.id)}
                        disabled={loading}
                        className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-50"
                      >
                        Generate Summary
                      </button>
                    )}

                    {doc.status !== "summarized" && (
                      <span className="w-fit rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300">
                          {doc.status}
                      </span>
                    )}

                    <Link
                      href={`/dashboard/documents/${doc.id}`}
                      className="rounded-full border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-800"
                    >
                      Open
                    </Link>

                    <button
                      onClick={() => deleteDocument(doc)}
                      disabled={loading}
                      className="rounded-full border border-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-300 transition hover:border-red-500/50 hover:text-red-400 disabled:opacity-50"
                    >
                      Delete
                    </button>
                    </div>
                </div>
              </div>
            ))}

            {documents.length === 0 && (
              <p className="text-zinc-400">
                No documents uploaded yet.
              </p>
            )}

            {documents.length > 0 && filteredDocuments.length === 0 && (
              <p className="text-zinc-400">
                No documents found. Try changing your search or filters.
              </p>
            )}
          </div>
        </section>
      </div>

      {summaryDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setSummaryDoc(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="break-words font-semibold text-white">
                  {summaryDoc.file_name}
                </h3>
                <p className="mt-1 text-sm text-zinc-400">
                  {summaryDoc.document_type || "Unknown type"} •{" "}
                  {summaryDoc.payer || "No payer"} •{" "}
                  {summaryDoc.department || "No department"}
                </p>
              </div>
              <button
                onClick={() => setSummaryDoc(null)}
                aria-label="Close summary"
                className="shrink-0 rounded-full border border-zinc-800 p-2 text-zinc-300 transition hover:bg-zinc-800"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-5 rounded-xl border border-zinc-800 bg-black p-4">
              <p className="whitespace-pre-line text-sm leading-6 text-zinc-300">
                {summaryDoc.summary}
              </p>
            </div>
          </div>
        </div>
      )}

      {rulesDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setRulesDoc(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-4xl overflow-y-auto overflow-x-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="break-words font-semibold text-white">
                    Generated Rules — {rulesDoc.file_name}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-400">
                    {rulesDoc.document_type || "Unknown type"} •{" "}
                    {rulesDoc.payer || "No payer"} •{" "}
                    {rulesDoc.department || "No department"}
                  </p>
                </div>
                <button
                  onClick={() => setRulesDoc(null)}
                  aria-label="Close rules"
                  className="shrink-0 rounded-full border border-zinc-800 p-2 text-zinc-300 transition hover:bg-zinc-800"
                >
                  <X className="size-4" />
                </button>
              </div>

              {rules.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => exportRulesInFormat(rulesDoc, "json")}
                    disabled={exportingFormat !== null}
                    className="rounded-full border border-zinc-700 px-3 py-1 text-sm text-zinc-200 transition hover:bg-zinc-800 disabled:opacity-50"
                  >
                    {exportingFormat === "json"
                      ? "Exporting..."
                      : "Export JSON"}
                  </button>
                  <button
                    onClick={() =>
                      exportRulesInFormat(rulesDoc, "pseudocode")
                    }
                    disabled={exportingFormat !== null}
                    className="rounded-full border border-zinc-700 px-3 py-1 text-sm text-zinc-200 transition hover:bg-zinc-800 disabled:opacity-50"
                  >
                    {exportingFormat === "pseudocode"
                      ? "Exporting..."
                      : "Export Pseudocode"}
                  </button>
                  <button
                    onClick={() => exportRulesInFormat(rulesDoc, "sql")}
                    disabled={exportingFormat !== null}
                    className="rounded-full border border-zinc-700 px-3 py-1 text-sm text-zinc-200 transition hover:bg-zinc-800 disabled:opacity-50"
                  >
                    {exportingFormat === "sql"
                      ? "Exporting..."
                      : "Export SQL"}
                  </button>
                  <button
                    onClick={() => exportRulesInFormat(rulesDoc, "python")}
                    disabled={exportingFormat !== null}
                    className="rounded-full border border-zinc-700 px-3 py-1 text-sm text-zinc-200 transition hover:bg-zinc-800 disabled:opacity-50"
                  >
                    {exportingFormat === "python"
                      ? "Exporting..."
                      : "Export Python"}
                  </button>
                </div>
              )}
            </div>

            <div className="mt-5 grid gap-3">
              {rules.map((rule, index) => (
                <div
                  key={`${rule.rule_id}-${index}`}
                  className="rounded-xl border border-zinc-800 bg-black p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-white">
                      {rule.rule_id} — {rule.title}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300">
                        {rule.department}
                      </span>
                      <span
                        className={`rounded-full border px-3 py-1 text-xs ${
                          riskBadgeStyles[rule.risk_level?.toLowerCase()] ||
                          "border-zinc-700 text-zinc-300"
                        }`}
                      >
                        {rule.risk_level} risk
                      </span>
                    </div>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-zinc-300">
                    <span className="font-medium text-zinc-400">If: </span>
                    {rule.condition}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-zinc-300">
                    <span className="font-medium text-zinc-400">Then: </span>
                    {rule.action}
                  </p>
                  <p className="mt-2 text-xs text-zinc-500">
                    Source: {rule.source_reference}
                  </p>
                </div>
              ))}

              {rules.length === 0 && (
                <p className="text-sm text-zinc-400">
                  No rules were generated for this document.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}