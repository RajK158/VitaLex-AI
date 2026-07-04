"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

type DocumentRow = {
  id: string
  file_name: string
  document_type: string | null
  summary: string | null
  extracted_text: string | null
}

type ComparisonResult = {
  summary: string
  added_content: string[]
  removed_content: string[]
  changed_rules: string[]
  billing_coding_impact: string
  compliance_impact: string
  risk_level: string
  suggested_actions: string[]
}

const riskBadgeStyles: Record<string, string> = {
  low: "border-emerald-500/40 text-emerald-400",
  medium: "border-amber-500/40 text-amber-400",
  high: "border-red-500/40 text-red-400",
}

function toList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is string => typeof item === "string" && item.trim() !== ""
    )
  }

  if (typeof value === "string" && value.trim() !== "") {
    return [value]
  }

  return []
}

function ListCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
      <h3 className="text-lg font-semibold">{title}</h3>
      {items.length > 0 ? (
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-6 text-zinc-300">
          {items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-zinc-500">None noted.</p>
      )}
    </div>
  )
}

export default function ComparePage() {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  const [documents, setDocuments] = useState<DocumentRow[]>([])
  const [oldDocumentId, setOldDocumentId] = useState("")
  const [newDocumentId, setNewDocumentId] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [comparison, setComparison] = useState<ComparisonResult | null>(null)

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
    async function fetchDocuments() {
      const { data, error } = await supabase
        .from("vitalex_documents")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        setMessage(error.message)
        return
      }

      const comparable = (data || []).filter(
        (doc: DocumentRow) =>
          (doc.extracted_text && doc.extracted_text.trim() !== "") ||
          (doc.summary && doc.summary.trim() !== "")
      )

      setDocuments(comparable)
    }

    fetchDocuments()
  }, [])

  async function handleCompare() {
    if (!oldDocumentId || !newDocumentId) {
      setMessage("Please select both an old and a new document.")
      return
    }

    if (oldDocumentId === newDocumentId) {
      setMessage("Please select two different documents to compare.")
      return
    }

    try {
      setLoading(true)
      setMessage("Comparing documents...")
      setComparison(null)

      const response = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldDocumentId, newDocumentId }),
      })

      const result = await response.json()

      if (!response.ok) {
        setMessage(result.error || "Failed to compare documents.")
        return
      }

      const comparisonData: ComparisonResult | undefined =
        result.comparison?.comparison_result || result.comparison

      if (!comparisonData) {
        setMessage("Comparison completed, but no result was returned.")
        return
      }

      setComparison(comparisonData)
      setMessage("Comparison completed successfully.")
    } catch {
      setMessage("Something went wrong while comparing documents.")
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

        <div className="mt-6">
          <p className="text-sm font-medium uppercase tracking-wider text-zinc-400">
            Vitalex
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Compare Documents
          </h1>
          <p className="mt-3 max-w-2xl text-zinc-400">
            Select two summarized documents to see what changed between
            versions — added content, removed content, and the billing,
            coding, and compliance impact.
          </p>
        </div>

        <section className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-zinc-300">
                Old document
              </label>
              <select
                value={oldDocumentId}
                onChange={(e) => setOldDocumentId(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-black p-3 text-sm text-zinc-300"
              >
                <option value="">Select a document</option>
                {documents.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.file_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-zinc-300">
                New document
              </label>
              <select
                value={newDocumentId}
                onChange={(e) => setNewDocumentId(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-black p-3 text-sm text-zinc-300"
              >
                <option value="">Select a document</option>
                {documents.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.file_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {documents.length === 0 && (
            <p className="mt-4 text-sm text-zinc-400">
              No summarized documents are available yet. Generate a summary
              for at least two documents before comparing them.
            </p>
          )}

          <button
            onClick={handleCompare}
            disabled={loading}
            className="mt-6 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-50"
          >
            {loading ? "Comparing..." : "Compare Documents"}
          </button>

          {message && (
            <p className="mt-4 text-sm text-zinc-300">{message}</p>
          )}
        </section>

        {comparison && (
          <div className="mt-8 grid gap-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">Comparison Summary</h2>
                <span
                  className={`rounded-full border px-3 py-1 text-xs ${
                    riskBadgeStyles[
                      (comparison.risk_level || "").toLowerCase()
                    ] || "border-zinc-700 text-zinc-300"
                  }`}
                >
                  {comparison.risk_level || "Unknown"} risk
                </span>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-zinc-300">
                {comparison.summary || "No summary was provided."}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <ListCard
                title="Added Content"
                items={toList(comparison.added_content)}
              />
              <ListCard
                title="Removed Content"
                items={toList(comparison.removed_content)}
              />
            </div>

            <ListCard
              title="Changed Rules"
              items={toList(comparison.changed_rules)}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
                <h3 className="text-lg font-semibold">
                  Billing / Coding Impact
                </h3>
                <p className="mt-3 whitespace-pre-line text-sm leading-6 text-zinc-300">
                  {comparison.billing_coding_impact || "No impact noted."}
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
                <h3 className="text-lg font-semibold">Compliance Impact</h3>
                <p className="mt-3 whitespace-pre-line text-sm leading-6 text-zinc-300">
                  {comparison.compliance_impact || "No impact noted."}
                </p>
              </div>
            </div>

            <ListCard
              title="Suggested Actions"
              items={toList(comparison.suggested_actions)}
            />
          </div>
        )}
      </div>
    </main>
  )
}
