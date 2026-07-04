import { NextResponse } from "next/server"
import { createRequire } from "module"
import { createClient } from "@supabase/supabase-js"
import { GoogleGenAI } from "@google/genai"

import mammoth from "mammoth"

const require = createRequire(import.meta.url)

const pdf = require("pdf-parse/lib/pdf-parse.js") as (
  buffer: Buffer
) => Promise<{ text: string }>
export const runtime = "nodejs"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const geminiApiKey = process.env.GEMINI_API_KEY!

const supabase = createClient(supabaseUrl, serviceRoleKey)
const genAI = new GoogleGenAI({ apiKey: geminiApiKey })
const GEMINI_MODEL = "gemini-3.5-flash"

async function getUserIdFromRequest(request: Request): Promise<string | null> {
  const authHeader = request.headers.get("authorization")
  const accessToken = authHeader?.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7)
    : null

  if (!accessToken) return null

  const { data, error } = await supabase.auth.getUser(accessToken)

  if (error || !data.user) return null

  return data.user.id
}

async function extractText(buffer: Buffer, fileType: string | null) {
  if (fileType === "text/plain") {
    return buffer.toString("utf-8")
  }

  if (fileType === "application/pdf") {
    const data = await pdf(buffer)
    return data.text
  }

  if (
    fileType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const data = await mammoth.extractRawText({ buffer })
    return data.value
  }

  throw new Error("Unsupported file type")
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const userId = await getUserIdFromRequest(request)

    const { data: document, error: documentError } = await supabase
      .from("vitalex_documents")
      .select("*")
      .eq("id", id)
      .single()

    if (documentError || !document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      )
    }

    await supabase
      .from("vitalex_documents")
      .update({ status: "processing" })
      .eq("id", id)

    const { data: fileData, error: downloadError } = await supabase.storage
      .from("documents")
      .download(document.file_path)

    if (downloadError || !fileData) {
      await supabase
        .from("vitalex_documents")
        .update({ status: "error" })
        .eq("id", id)

      return NextResponse.json(
        { error: "Could not download file" },
        { status: 500 }
      )
    }

    const arrayBuffer = await fileData.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const extractedText = await extractText(buffer, document.file_type)

    if (!extractedText.trim()) {
      await supabase
        .from("vitalex_documents")
        .update({ status: "error" })
        .eq("id", id)

      return NextResponse.json(
        { error: "No text could be extracted from this document" },
        { status: 400 }
      )
    }

    const limitedText = extractedText.slice(0, 12000)

    const geminiResponse = await genAI.models.generateContent({
      model: GEMINI_MODEL,
      contents: `Summarize this healthcare document in simple professional English.

Include:
1. Main purpose
2. Key rules or requirements
3. Billing, coding, compliance, or clinical impact
4. Important changes or risks if visible
5. Suggested next actions

Document:
${limitedText}`,
      config: {
        systemInstruction:
          "You summarize healthcare policy, billing, coding, clinical guideline, and payer-provider contract documents. Write clearly for healthcare admin, compliance, billing, and operations teams.",
      },
    })

    const summary = geminiResponse.text || "No summary generated."

    const { error: updateError } = await supabase
      .from("vitalex_documents")
      .update({
        extracted_text: extractedText,
        summary,
        status: "summarized",
      })
      .eq("id", id)

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }

    try {
      const { error: auditError } = await supabase
        .from("vitalex_audit_logs")
        .insert({
          action: "generated_summary",
          entity_type: "document",
          entity_id: id,
          user_id: userId,
          metadata: { file_name: document.file_name || null },
        })

      if (auditError) {
        console.error("Failed to write audit log:", auditError.message)
      }
    } catch (auditException) {
      console.error("Failed to write audit log:", auditException)
    }

    return NextResponse.json({
      success: true,
      summary,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Something went wrong"

    return NextResponse.json({ error: message }, { status: 500 })
  }
}