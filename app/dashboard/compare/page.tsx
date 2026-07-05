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

const inputClassName =
  "w-full rounded-xl border border-zinc-800/80 bg-black/60 px-4 py-3 text-sm text-zinc-200 transition hover:border-zinc-700 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700/50"

const sectionCardClassName =
  "rounded-2xl border border-zinc-800/80 bg-zinc-950/90 shadow-sm shadow-black/20"

const primaryButtonClassName =
  "rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-50"

const headerButtonClassName =
  "rounded-full border border-zinc-800 bg-zinc-950/80 px-4 py-2 text-xs font-semibold text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900"

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
    <div className={`${sectionCardClassName} p-6 sm:p-7`}>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      {items.length > 0 ? (
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-zinc-300">
          {items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-zinc-500">None noted.</p>
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
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        router.push("/login")
        return
      }

      const { data, error } = await supabase
        .from("vitalex_documents")
        .select("*")
        .eq("user_id", user.id)
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
  }, [router])

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

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        setMessage("Please log in again.")
        router.push("/login")
        return
      }

      const response = await fetch("/api/compare", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
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
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 px-6 py-4 sm:px-8">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-zinc-400 transition hover:text-white"
          >
            ← Back to Dashboard
          </Link>
          <button onClick={handleLogout} className={headerButtonClassName}>
            Logout
          </button>
        </div>
      </header>

      <div className="relative mx-auto max-w-4xl px-6 py-10 sm:px-8">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Vitalex
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Compare Documents
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
            Select two summarized documents to see what changed between
            versions — added content, removed content, and the billing,
            coding, and compliance impact.
          </p>
        </div>

        <section className={`${sectionCardClassName} p-6 sm:p-7`}>
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white">
              Select documents
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Choose an older and newer version to compare
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Old document
              </label>
              <select
                value={oldDocumentId}
                onChange={(e) => setOldDocumentId(e.target.value)}
                className={inputClassName}
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
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                New document
              </label>
              <select
                value={newDocumentId}
                onChange={(e) => setNewDocumentId(e.target.value)}
                className={inputClassName}
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
            <div className="mt-5 rounded-xl border border-dashed border-zinc-800 bg-black/30 px-4 py-5">
              <p className="text-sm text-zinc-400">
                No summarized documents are available yet. Generate a summary
                for at least two documents before comparing them.
              </p>
            </div>
          )}

          <button
            onClick={handleCompare}
            disabled={loading}
            className={`mt-6 ${primaryButtonClassName}`}
          >
            {loading ? "Comparing..." : "Compare Documents"}
          </button>

          {message && (
            <p className="mt-4 rounded-xl border border-zinc-800/80 bg-black/40 px-4 py-3 text-sm text-zinc-300">
              {message}
            </p>
          )}
        </section>

        {comparison && (
          <div className="mt-8 grid gap-5">
            <div className={`${sectionCardClassName} p-6 sm:p-7`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Comparison Summary
                  </h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Overview of changes between versions
                  </p>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    riskBadgeStyles[
                      (comparison.risk_level || "").toLowerCase()
                    ] || "border-zinc-700 text-zinc-300"
                  }`}
                >
                  {comparison.risk_level || "Unknown"} risk
                </span>
              </div>
              <p className="mt-5 whitespace-pre-line text-sm leading-7 text-zinc-300">
                {comparison.summary || "No summary was provided."}
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
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

            <div className="grid gap-5 md:grid-cols-2">
              <div className={`${sectionCardClassName} p-6 sm:p-7`}>
                <h3 className="text-lg font-semibold text-white">
                  Billing / Coding Impact
                </h3>
                <p className="mt-4 whitespace-pre-line text-sm leading-7 text-zinc-300">
                  {comparison.billing_coding_impact || "No impact noted."}
                </p>
              </div>

              <div className={`${sectionCardClassName} p-6 sm:p-7`}>
                <h3 className="text-lg font-semibold text-white">
                  Compliance Impact
                </h3>
                <p className="mt-4 whitespace-pre-line text-sm leading-7 text-zinc-300">
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
