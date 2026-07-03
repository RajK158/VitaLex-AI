"use client"

import { useEffect, useState } from "react"
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
}

export default function DashboardPage() {
  const [file, setFile] = useState<File | null>(null)
  const [documentType, setDocumentType] = useState("Billing Policy")
  const [payer, setPayer] = useState("")
  const [department, setDepartment] = useState("")
  const [documents, setDocuments] = useState<DocumentRow[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

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

  useEffect(() => {
    fetchDocuments()
  }, [])

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

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10">
          <p className="text-sm font-medium uppercase tracking-wider text-zinc-400">
            VitaLex Dashboard
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">
            Upload healthcare policy documents
          </h1>
          <p className="mt-3 max-w-2xl text-zinc-400">
            Upload billing policies, coding rules, payer contracts, clinical
            guidelines, and other healthcare documents for summarization and
            rule generation.
          </p>
        </div>

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
          <h2 className="mb-4 text-2xl font-semibold">
            Uploaded documents
          </h2>

          <div className="grid gap-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
              >
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div>
                    <h3 className="font-semibold">
                      {doc.file_name}
                    </h3>
                    <p className="mt-1 text-sm text-zinc-400">
                      {doc.document_type || "Unknown type"} •{" "}
                      {doc.payer || "No payer"} •{" "}
                      {doc.department || "No department"}
                    </p>
                  </div>

                  <span className="w-fit rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300">
                    {doc.status}
                  </span>
                </div>
              </div>
            ))}

            {documents.length === 0 && (
              <p className="text-zinc-400">
                No documents uploaded yet.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}