"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
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
  extracted_text: string | null
  approval_status: string | null
  approved_at: string | null
  published_at: string | null
  approval_notes: string | null
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

const EXTRACTED_TEXT_PREVIEW_LENGTH = 3000

const APPROVAL_STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "in_review", label: "In Review" },
  { value: "approved", label: "Approved" },
  { value: "published", label: "Published" },
]

const approvalStatusLabels: Record<string, string> = {
  draft: "Draft",
  in_review: "In Review",
  approved: "Approved",
  published: "Published",
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

export default function DocumentDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params?.id

  const [authChecked, setAuthChecked] = useState(false)
  const [doc, setDoc] = useState<DocumentRow | null>(null)
  const [rules, setRules] = useState<GeneratedRule[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [showFullText, setShowFullText] = useState(false)
  const [exportingFormat, setExportingFormat] = useState<
    RuleExportFormat | null
  >(null)
  const [exportMessage, setExportMessage] = useState("")
  const [approvalStatusInput, setApprovalStatusInput] = useState("draft")
  const [approvalNotesInput, setApprovalNotesInput] = useState("")
  const [approvalUpdating, setApprovalUpdating] = useState(false)
  const [approvalMessage, setApprovalMessage] = useState("")

  async function updateApprovalStatus() {
    if (!doc) return

    try {
      setApprovalUpdating(true)
      setApprovalMessage("")

      const response = await fetch(`/api/documents/${doc.id}/approval`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalStatus: approvalStatusInput,
          approvalNotes: approvalNotesInput,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setApprovalMessage(
          result.error || "Failed to update approval status."
        )
        return
      }

      setDoc(result.document)
      setApprovalNotesInput(result.document?.approval_notes || "")
      setApprovalMessage("Approval status updated successfully.")
    } catch {
      setApprovalMessage("Failed to update approval status.")
    } finally {
      setApprovalUpdating(false)
    }
  }

  async function exportRulesInFormat(
    documentToExport: DocumentRow,
    format: RuleExportFormat
  ) {
    try {
      setExportingFormat(format)
      setExportMessage(`Exporting ${ruleExportFormatLabels[format]}...`)

      const response = await fetch(
        `/api/documents/${documentToExport.id}/export-rules`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ exportFormat: format }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        setExportMessage(
          result.error ||
            `Failed to export ${ruleExportFormatLabels[format]}.`
        )
        return
      }

      downloadRulesExportFile(
        documentToExport.file_name,
        format,
        result.content || ""
      )
      setExportMessage(
        `${ruleExportFormatLabels[format]} export downloaded successfully.`
      )
    } catch {
      setExportMessage(`Failed to export ${ruleExportFormatLabels[format]}.`)
    } finally {
      setExportingFormat(null)
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
    if (!id) return

    async function fetchDocument() {
      setLoading(true)
      setMessage("")

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        router.push("/login")
        return
      }

      const { data: docData, error: docError } = await supabase
        .from("vitalex_documents")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single()

      if (docError || !docData) {
        setMessage(docError?.message || "Document not found.")
        setDoc(null)
        setLoading(false)
        return
      }

      setDoc(docData)
      setApprovalStatusInput(docData.approval_status || "draft")
      setApprovalNotesInput(docData.approval_notes || "")

      try {
        const response = await fetch("/api/rules")
        const result = await response.json()

        if (response.ok) {
          const documentRules = (result.rules || [])
            .filter(
              (row: { document_id: string; user_id?: string | null }) =>
                row.document_id === id &&
                (row.user_id === undefined || row.user_id === user.id)
            )
            .map((row: { rule_json: GeneratedRule }) => row.rule_json)

          setRules(documentRules)
        }
      } catch {
        // Non-fatal: the document itself still renders without rules.
      }

      setLoading(false)
    }

    fetchDocument()
  }, [id, router])

  if (!authChecked) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-zinc-400">Checking authentication...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="text-sm text-zinc-400 transition hover:text-white"
          >
            ← Back to Dashboard
          </Link>
          <button
            onClick={handleLogout}
            className="rounded-full border border-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-300 transition hover:bg-zinc-800"
          >
            Logout
          </button>
        </div>

        {loading && (
          <p className="mt-8 text-zinc-400">Loading document...</p>
        )}

        {!loading && !doc && (
          <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-zinc-300">
              {message || "This document could not be found."}
            </p>
          </div>
        )}

        {!loading && doc && (
          <>
            <div className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
              <p className="text-sm font-medium uppercase tracking-wider text-zinc-400">
                Document Detail
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">
                {doc.file_name}
              </h1>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300">
                  {doc.document_type || "Unknown type"}
                </span>
                <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300">
                  Payer: {doc.payer || "None"}
                </span>
                <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300">
                  Department: {doc.department || "None"}
                </span>
                <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300">
                  {doc.status}
                </span>
              </div>

              <p className="mt-4 text-sm text-zinc-500">
                Uploaded {new Date(doc.created_at).toLocaleString()}
              </p>
            </div>

            <div className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
              <h2 className="text-xl font-semibold">Approval Workflow</h2>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300">
                  Status:{" "}
                  {approvalStatusLabels[doc.approval_status || "draft"] ||
                    "Draft"}
                </span>
                {doc.approved_at && (
                  <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300">
                    Approved: {new Date(doc.approved_at).toLocaleString()}
                  </span>
                )}
                {doc.published_at && (
                  <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300">
                    Published: {new Date(doc.published_at).toLocaleString()}
                  </span>
                )}
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-zinc-300">
                    Approval status
                  </label>
                  <select
                    value={approvalStatusInput}
                    onChange={(e) => setApprovalStatusInput(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-black p-3 text-sm text-zinc-300"
                  >
                    {APPROVAL_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-zinc-300">
                    Approval notes
                  </label>
                  <textarea
                    value={approvalNotesInput}
                    onChange={(e) => setApprovalNotesInput(e.target.value)}
                    placeholder="Optional notes about this approval decision"
                    rows={3}
                    className="w-full rounded-xl border border-zinc-800 bg-black p-3 text-sm text-zinc-300"
                  />
                </div>
              </div>

              <button
                onClick={updateApprovalStatus}
                disabled={approvalUpdating}
                className="mt-4 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-50"
              >
                {approvalUpdating ? "Updating..." : "Update Status"}
              </button>

              {approvalMessage && (
                <p className="mt-3 text-sm text-zinc-300">
                  {approvalMessage}
                </p>
              )}
            </div>

            <div className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
              <h2 className="text-xl font-semibold">Summary</h2>
              {doc.summary ? (
                <div className="mt-4 rounded-xl border border-zinc-800 bg-black p-4">
                  <p className="whitespace-pre-line text-sm leading-6 text-zinc-300">
                    {doc.summary}
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-zinc-400">
                  No summary has been generated for this document yet.
                </p>
              )}
            </div>

            <div className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">Generated Rules</h2>
                {rules.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => exportRulesInFormat(doc, "json")}
                      disabled={exportingFormat !== null}
                      className="rounded-full border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-800 disabled:opacity-50"
                    >
                      {exportingFormat === "json"
                        ? "Exporting..."
                        : "Export JSON"}
                    </button>
                    <button
                      onClick={() => exportRulesInFormat(doc, "pseudocode")}
                      disabled={exportingFormat !== null}
                      className="rounded-full border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-800 disabled:opacity-50"
                    >
                      {exportingFormat === "pseudocode"
                        ? "Exporting..."
                        : "Export Pseudocode"}
                    </button>
                    <button
                      onClick={() => exportRulesInFormat(doc, "sql")}
                      disabled={exportingFormat !== null}
                      className="rounded-full border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-800 disabled:opacity-50"
                    >
                      {exportingFormat === "sql"
                        ? "Exporting..."
                        : "Export SQL"}
                    </button>
                    <button
                      onClick={() => exportRulesInFormat(doc, "python")}
                      disabled={exportingFormat !== null}
                      className="rounded-full border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-800 disabled:opacity-50"
                    >
                      {exportingFormat === "python"
                        ? "Exporting..."
                        : "Export Python"}
                    </button>
                  </div>
                )}
              </div>
              {exportMessage && (
                <p className="mt-3 text-sm text-zinc-400">{exportMessage}</p>
              )}
              {rules.length > 0 ? (
                <div className="mt-4 grid gap-3">
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
                              riskBadgeStyles[
                                rule.risk_level?.toLowerCase()
                              ] || "border-zinc-700 text-zinc-300"
                            }`}
                          >
                            {rule.risk_level} risk
                          </span>
                        </div>
                      </div>

                      <p className="mt-3 text-sm leading-6 text-zinc-300">
                        <span className="font-medium text-zinc-400">
                          If:{" "}
                        </span>
                        {rule.condition}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-zinc-300">
                        <span className="font-medium text-zinc-400">
                          Then:{" "}
                        </span>
                        {rule.action}
                      </p>
                      <p className="mt-2 text-xs text-zinc-500">
                        Source: {rule.source_reference}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-zinc-400">
                  No rules have been generated for this document yet.
                </p>
              )}
            </div>

            <div className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">
                  {showFullText
                    ? "Extracted Text (Full)"
                    : "Extracted Text Preview"}
                </h2>

                {doc.extracted_text &&
                  doc.extracted_text.length > EXTRACTED_TEXT_PREVIEW_LENGTH && (
                    <button
                      onClick={() => setShowFullText((prev) => !prev)}
                      className="rounded-full border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-800"
                    >
                      {showFullText ? "Show Preview" : "View Full Text"}
                    </button>
                  )}
              </div>

              {doc.extracted_text ? (
                <>
                  <div className="mt-4 max-h-96 overflow-y-auto rounded-xl border border-zinc-800 bg-black p-4">
                    <p className="whitespace-pre-line text-sm leading-6 text-zinc-300">
                      {showFullText
                        ? doc.extracted_text
                        : doc.extracted_text.slice(
                            0,
                            EXTRACTED_TEXT_PREVIEW_LENGTH
                          ) +
                          (doc.extracted_text.length >
                          EXTRACTED_TEXT_PREVIEW_LENGTH
                            ? "..."
                            : "")}
                    </p>
                  </div>
                  {!showFullText &&
                    doc.extracted_text.length >
                      EXTRACTED_TEXT_PREVIEW_LENGTH && (
                      <p className="mt-2 text-xs text-zinc-500">
                        Showing first 3,000 characters of extracted text.
                      </p>
                    )}
                </>
              ) : (
                <p className="mt-3 text-sm text-zinc-400">
                  No extracted text is available for this document yet.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
