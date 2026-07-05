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

type UserProfile = {
  id: string
  email: string | null
  role: string
}

const roleLabels: Record<string, string> = {
  admin: "Admin",
  compliance: "Compliance",
  billing_coding: "Billing/Coding",
  analyst: "Analyst",
  developer: "Developer",
  viewer: "Viewer",
}

type RolePermissions = {
  canUpload: boolean
  canGenerateSummary: boolean
  canGenerateRules: boolean
  canExportRules: boolean
  canCompare: boolean
  canUpdateApproval: boolean
  canDelete: boolean
}

const ROLE_PERMISSIONS: Record<string, RolePermissions> = {
  admin: {
    canUpload: true,
    canGenerateSummary: true,
    canGenerateRules: true,
    canExportRules: true,
    canCompare: true,
    canUpdateApproval: true,
    canDelete: true,
  },
  compliance: {
    canUpload: false,
    canGenerateSummary: false,
    canGenerateRules: false,
    canExportRules: true,
    canCompare: true,
    canUpdateApproval: true,
    canDelete: false,
  },
  billing_coding: {
    canUpload: false,
    canGenerateSummary: false,
    canGenerateRules: true,
    canExportRules: true,
    canCompare: true,
    canUpdateApproval: false,
    canDelete: false,
  },
  analyst: {
    canUpload: true,
    canGenerateSummary: true,
    canGenerateRules: false,
    canExportRules: false,
    canCompare: true,
    canUpdateApproval: false,
    canDelete: false,
  },
  developer: {
    canUpload: false,
    canGenerateSummary: false,
    canGenerateRules: false,
    canExportRules: true,
    canCompare: false,
    canUpdateApproval: false,
    canDelete: false,
  },
  viewer: {
    canUpload: false,
    canGenerateSummary: false,
    canGenerateRules: false,
    canExportRules: false,
    canCompare: false,
    canUpdateApproval: false,
    canDelete: false,
  },
}

function getRolePermissions(role: string | null | undefined): RolePermissions {
  return ROLE_PERMISSIONS[role || "viewer"] || ROLE_PERMISSIONS.viewer
}

const inputClassName =
  "w-full rounded-xl border border-zinc-800/80 bg-black/60 px-4 py-3 text-sm text-zinc-200 transition placeholder:text-zinc-600 hover:border-zinc-700 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700/50"

const sectionCardClassName =
  "rounded-2xl border border-zinc-800/80 bg-zinc-950/90 shadow-sm shadow-black/20"

const primaryButtonClassName =
  "rounded-full bg-white px-4 py-2 text-xs font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-50"

const secondaryButtonClassName =
  "rounded-full border border-zinc-700/80 bg-zinc-950 px-4 py-2 text-xs font-semibold text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-900 disabled:opacity-50"

const headerButtonClassName =
  "rounded-full border border-zinc-800 bg-zinc-950/80 px-4 py-2 text-xs font-semibold text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900"

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
  const [profile, setProfile] = useState<UserProfile | null>(null)

  async function getAccessToken() {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token || null
  }

  async function getCurrentUserId() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      router.push("/login")
      return null
    }

    return user.id
  }

  async function fetchDocuments() {
    const userId = await getCurrentUserId()
    if (!userId) return

    const { data, error } = await supabase
      .from("vitalex_documents")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      setMessage(error.message)
      return
    }

    setDocuments(data || [])
  }

  async function fetchComparisonsCount() {
    const userId = await getCurrentUserId()
    if (!userId) return

    const { count, error: comparisonsError } = await supabase
      .from("vitalex_comparisons")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)

    if (comparisonsError) {
      console.error("Comparisons count error:", comparisonsError)
    }

    setComparisonsCount(count || 0)
  }

  async function fetchAuditLogs() {
    const userId = await getCurrentUserId()
    if (!userId) return

    const { data, error: auditError } = await supabase
      .from("vitalex_audit_logs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5)

    if (auditError) {
      console.error("Audit logs fetch error:", auditError)
      return
    }

    setAuditLogs(data || [])
  }

  async function fetchRules() {
    try {
      const userId = await getCurrentUserId()
      if (!userId) return

      const { data: userDocuments, error: documentsError } = await supabase
        .from("vitalex_documents")
        .select("id")
        .eq("user_id", userId)

      if (documentsError) {
        setMessage(documentsError.message)
        return
      }

      const userDocumentIds = new Set(
        (userDocuments || []).map((userDoc) => userDoc.id)
      )

      const response = await fetch("/api/rules")
      const result = await response.json()

      if (!response.ok) {
        setMessage(result.error || "Failed to load rules.")
        return
      }

      const grouped: Record<string, GeneratedRule[]> = {}

      for (const row of result.rules || []) {
        const docId = row.document_id as string
        if (!userDocumentIds.has(docId)) continue
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

      const accessToken = await getAccessToken()

      const response = await fetch(`/api/documents/${id}/summarize`, {
        method: "POST",
        headers: accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : undefined,
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

      const accessToken = await getAccessToken()

      const response = await fetch(`/api/documents/${doc.id}/rules`, {
        method: "POST",
        headers: accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : undefined,
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

      const accessToken = await getAccessToken()

      const response = await fetch(
        `/api/documents/${doc.id}/export-rules`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken
              ? { Authorization: `Bearer ${accessToken}` }
              : {}),
          },
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

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        setMessage("Please log in again.")
        router.push("/login")
        return
      }

      const response = await fetch(`/api/documents/${doc.id}/delete`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
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

      setDocuments((prev) => prev.filter((d) => d.id !== doc.id))

      setMessage("Document deleted successfully.")
      await fetchDocuments()
      await fetchRules()
    } finally {
      setLoading(false)
    }
  }
  async function fetchOrCreateProfile(userId: string, email: string | null) {
    const { data: existingProfile, error: fetchError } = await supabase
      .from("vitalex_profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle()

    if (fetchError) {
      console.error("Profile fetch error:", fetchError)
      return
    }

    if (existingProfile) {
      setProfile(existingProfile)
      return
    }

    const { data: newProfile, error: insertError } = await supabase
      .from("vitalex_profiles")
      .insert({ id: userId, email, role: "admin" })
      .select()
      .single()

    if (insertError) {
      console.error("Profile create error:", insertError)
      return
    }

    setProfile(newProfile)
  }

  useEffect(() => {
    async function checkAuth() {
      const { data } = await supabase.auth.getSession()

      if (!data.session) {
        router.push("/login")
        return
      }

      await fetchOrCreateProfile(
        data.session.user.id,
        data.session.user.email ?? null
      )

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

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        setMessage("You must be logged in to upload documents.")
        router.push("/login")
        return
      }

      const safeFileName = file.name.replaceAll(" ", "_")
      const filePath = `${user.id}/${Date.now()}-${safeFileName}`

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file)

      if (uploadError) {
        setMessage(uploadError.message)
        return
      }

      const documentPayload = {
        file_name: file.name,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
        document_type: documentType,
        payer: payer || null,
        department: department || null,
        status: "uploaded",
        user_id: user.id,
      }

      const { error: insertError } = await supabase
        .from("vitalex_documents")
        .insert(documentPayload)

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

  const permissions = getRolePermissions(profile?.role)

  if (!authChecked) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Vitalex
          </p>
          <p className="mt-3 text-sm text-zinc-400">Checking authentication...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="relative min-h-screen bg-black text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-72 opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 0%, black 20%, transparent 80%)",
        }}
      />

      <header className="sticky top-0 z-40 border-b border-zinc-900/80 bg-black/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4 sm:px-8 lg:px-10">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Vitalex Dashboard
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              Healthcare policy intelligence workspace
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {profile && (
              <span className="rounded-full border border-zinc-800 bg-zinc-950/80 px-4 py-2 text-xs font-semibold text-zinc-300">
                Role: {roleLabels[profile.role] || profile.role}
              </span>
            )}
            {permissions.canCompare && (
              <Link
                href="/dashboard/compare"
                className={headerButtonClassName}
              >
                Compare Documents
              </Link>
            )}
            <button onClick={handleLogout} className={headerButtonClassName}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="relative mx-auto max-w-6xl px-6 py-10 sm:px-8 lg:px-10">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Upload healthcare policy documents
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
            Upload billing policies, coding rules, payer contracts, clinical
            guidelines, and other healthcare documents for summarization and
            rule generation.
          </p>
        </div>

        <section className="mb-10">
          <div className="mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Impact overview
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {dashboardMetrics.map((metric) => (
              <div
                key={metric.label}
                className={`${sectionCardClassName} p-5 transition hover:border-zinc-700/80`}
              >
                <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                  {metric.label}
                </p>
                <p className="mt-3 text-3xl font-bold tracking-tight text-white">
                  {metric.value}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className={`mb-10 ${sectionCardClassName} p-6 sm:p-7`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Recent Activity
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Latest actions across your workspace
              </p>
            </div>
            {auditLogs.length > RECENT_ACTIVITY_PREVIEW_COUNT && (
              <button
                onClick={() => setShowAllActivity((prev) => !prev)}
                className={secondaryButtonClassName}
              >
                {showAllActivity ? "Show less" : "View all activity"}
              </button>
            )}
          </div>

          <div className="mt-6 grid gap-3">
            {(showAllActivity
              ? auditLogs
              : auditLogs.slice(0, RECENT_ACTIVITY_PREVIEW_COUNT)
            ).map((log) => {
              const metadataText = formatAuditMetadata(log.metadata)

              return (
                <div
                  key={log.id}
                  className="rounded-xl border border-zinc-800/80 bg-black/40 p-4 pl-5 transition hover:border-zinc-700/80"
                  style={{
                    borderLeftWidth: "3px",
                    borderLeftColor: "rgb(244 244 245 / 0.15)",
                  }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-white">
                      {auditActionLabels[log.action] || log.action}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs leading-5 text-zinc-400">
                    {log.entity_type || "Unknown entity"}
                    {metadataText ? ` • ${metadataText}` : ""}
                  </p>
                </div>
              )
            })}

            {auditLogs.length === 0 && (
              <div className="rounded-xl border border-dashed border-zinc-800 bg-black/30 px-4 py-8 text-center">
                <p className="text-sm text-zinc-500">No recent activity yet.</p>
              </div>
            )}
          </div>
        </section>

        <section className={`mb-10 ${sectionCardClassName} p-6 sm:p-7`}>
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white">
              Upload Document
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              PDF, DOCX, and TXT files supported
            </p>
          </div>

          {permissions.canUpload ? (
            <>
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Document file
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className={`${inputClassName} file:mr-3 file:rounded-full file:border-0 file:bg-zinc-800 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-zinc-200`}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Document type
                  </label>
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    className={inputClassName}
                  >
                    <option>Billing Policy</option>
                    <option>Coding Rule</option>
                    <option>Clinical Guideline</option>
                    <option>Payer-Provider Contract</option>
                    <option>Compliance Policy</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Payer
                  </label>
                  <input
                    value={payer}
                    onChange={(e) => setPayer(e.target.value)}
                    placeholder="Example: CMS, Aetna, UnitedHealthcare"
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Department
                  </label>
                  <input
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Example: Billing, Compliance, Clinical Ops"
                    className={inputClassName}
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
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-800 bg-black/30 px-4 py-6">
              <p className="text-sm text-zinc-400">
                Your role does not allow document uploads.
              </p>
            </div>
          )}

          {message && (
            <p className="mt-4 rounded-xl border border-zinc-800/80 bg-black/40 px-4 py-3 text-sm text-zinc-300">
              {message}
            </p>
          )}
        </section>

        <section>
          <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white">
                Uploaded documents
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Manage summaries, rules, and approvals
              </p>
            </div>
            <p className="text-sm text-zinc-500">
              Showing {filteredDocuments.length} of {documents.length} documents
            </p>
          </div>

          <div
            className={`mb-6 ${sectionCardClassName} grid gap-4 p-5 md:grid-cols-5`}
          >
            <div className="md:col-span-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                Search &amp; filters
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Search
              </label>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by file name, payer, or department"
                className={inputClassName}
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Document type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className={inputClassName}
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
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={inputClassName}
              >
                <option>All Statuses</option>
                <option value="uploaded">uploaded</option>
                <option value="processing">processing</option>
                <option value="summarized">summarized</option>
                <option value="error">error</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Approval status
              </label>
              <select
                value={approvalFilter}
                onChange={(e) => setApprovalFilter(e.target.value)}
                className={inputClassName}
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
              className={`${secondaryButtonClassName} md:col-span-5 md:w-fit`}
            >
              Clear Filters
            </button>
          </div>

          <div className="grid gap-4">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className={`${sectionCardClassName} p-5 transition hover:border-zinc-700/80 sm:p-6`}
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-base font-semibold text-white">
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
                      {doc.status !== "summarized" && (
                        <span className="rounded-full bg-zinc-800/80 px-3 py-1 text-xs capitalize text-zinc-300">
                          {doc.status}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-zinc-400">
                      {doc.document_type || "Unknown type"} •{" "}
                      {doc.payer || "No payer"} •{" "}
                      {doc.department || "No department"}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Uploaded {new Date(doc.created_at).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 lg:max-w-xl lg:justify-end">
                    {doc.status === "summarized" ? (
                      <>
                        <button
                          onClick={() => setSummaryDoc(doc)}
                          className={primaryButtonClassName}
                        >
                          View Summary
                        </button>
                        {rulesByDocument[doc.id]?.length ? (
                          <button
                            onClick={() => viewRules(doc)}
                            className={primaryButtonClassName}
                          >
                            View Rules
                          </button>
                        ) : permissions.canGenerateRules ? (
                          <button
                            onClick={() => generateRules(doc)}
                            disabled={loading}
                            className={secondaryButtonClassName}
                          >
                            Generate Rules
                          </button>
                        ) : (
                          <span className="text-xs text-zinc-500">
                            Your role does not allow generating rules.
                          </span>
                        )}
                      </>
                    ) : permissions.canGenerateSummary ? (
                      <button
                        onClick={() => generateSummary(doc.id)}
                        disabled={loading}
                        className={primaryButtonClassName}
                      >
                        Generate Summary
                      </button>
                    ) : (
                      <span className="text-xs text-zinc-500">
                        Your role does not allow generating summaries.
                      </span>
                    )}

                    <Link
                      href={`/dashboard/documents/${doc.id}`}
                      className={secondaryButtonClassName}
                    >
                      Open
                    </Link>

                    {permissions.canDelete && (
                      <button
                        onClick={() => deleteDocument(doc)}
                        disabled={loading}
                        className="rounded-full border border-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-300 transition hover:border-red-500/50 hover:bg-red-950/20 hover:text-red-400 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {documents.length === 0 && (
              <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/50 px-6 py-12 text-center">
                <p className="text-sm text-zinc-400">
                  No documents uploaded yet.
                </p>
              </div>
            )}

            {documents.length > 0 && filteredDocuments.length === 0 && (
              <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/50 px-6 py-12 text-center">
                <p className="text-sm text-zinc-400">
                  No documents found. Try changing your search or filters.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      {summaryDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setSummaryDoc(null)}
        >
          <div
            className={`max-h-[80vh] w-full max-w-2xl overflow-y-auto ${sectionCardClassName} p-6 sm:p-7`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Summary
                </p>
                <h3 className="mt-1 break-words text-lg font-semibold text-white">
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
                className="shrink-0 rounded-full border border-zinc-800 p-2 text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-5 rounded-xl border border-zinc-800/80 bg-black/50 p-4">
              <p className="whitespace-pre-line text-sm leading-6 text-zinc-300">
                {summaryDoc.summary}
              </p>
            </div>
          </div>
        </div>
      )}

      {rulesDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setRulesDoc(null)}
        >
          <div
            className={`max-h-[80vh] w-full max-w-4xl overflow-y-auto overflow-x-hidden ${sectionCardClassName} p-6 sm:p-7`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                    Generated Rules
                  </p>
                  <h3 className="mt-1 break-words text-lg font-semibold text-white">
                    {rulesDoc.file_name}
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
                  className="shrink-0 rounded-full border border-zinc-800 p-2 text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900"
                >
                  <X className="size-4" />
                </button>
              </div>

              {rules.length > 0 && !permissions.canExportRules && (
                <p className="text-sm text-zinc-400">
                  Your role does not allow exporting rules.
                </p>
              )}

              {rules.length > 0 && permissions.canExportRules && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => exportRulesInFormat(rulesDoc, "json")}
                    disabled={exportingFormat !== null}
                    className={secondaryButtonClassName}
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
                    className={secondaryButtonClassName}
                  >
                    {exportingFormat === "pseudocode"
                      ? "Exporting..."
                      : "Export Pseudocode"}
                  </button>
                  <button
                    onClick={() => exportRulesInFormat(rulesDoc, "sql")}
                    disabled={exportingFormat !== null}
                    className={secondaryButtonClassName}
                  >
                    {exportingFormat === "sql"
                      ? "Exporting..."
                      : "Export SQL"}
                  </button>
                  <button
                    onClick={() => exportRulesInFormat(rulesDoc, "python")}
                    disabled={exportingFormat !== null}
                    className={secondaryButtonClassName}
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
                  className="rounded-xl border border-zinc-800/80 bg-black/50 p-4"
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