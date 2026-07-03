"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
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

const EXTRACTED_TEXT_PREVIEW_LENGTH = 2000

export default function DocumentDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id

  const [doc, setDoc] = useState<DocumentRow | null>(null)
  const [rules, setRules] = useState<GeneratedRule[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!id) return

    async function fetchDocument() {
      setLoading(true)
      setMessage("")

      const { data: docData, error: docError } = await supabase
        .from("vitalex_documents")
        .select("*")
        .eq("id", id)
        .single()

      if (docError || !docData) {
        setMessage(docError?.message || "Document not found.")
        setDoc(null)
        setLoading(false)
        return
      }

      setDoc(docData)

      try {
        const response = await fetch("/api/rules")
        const result = await response.json()

        if (response.ok) {
          const documentRules = (result.rules || [])
            .filter(
              (row: { document_id: string }) => row.document_id === id
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
  }, [id])

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/dashboard"
          className="text-sm text-zinc-400 transition hover:text-white"
        >
          ← Back to Dashboard
        </Link>

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
              <h2 className="text-xl font-semibold">Generated Rules</h2>
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
              <h2 className="text-xl font-semibold">Extracted Text Preview</h2>
              {doc.extracted_text ? (
                <>
                  <div className="mt-4 max-h-96 overflow-y-auto rounded-xl border border-zinc-800 bg-black p-4">
                    <p className="whitespace-pre-line text-sm leading-6 text-zinc-300">
                      {doc.extracted_text.slice(
                        0,
                        EXTRACTED_TEXT_PREVIEW_LENGTH
                      )}
                    </p>
                  </div>
                  {doc.extracted_text.length >
                    EXTRACTED_TEXT_PREVIEW_LENGTH && (
                    <p className="mt-2 text-xs text-zinc-500">
                      Showing a preview of the extracted text.
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
