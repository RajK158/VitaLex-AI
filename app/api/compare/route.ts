import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { GoogleGenAI, Type } from "@google/genai"

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

type DocumentWithContent = {
  file_name: string
  extracted_text: string | null
  summary: string | null
}

const comparisonSchema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    added_content: { type: Type.ARRAY, items: { type: Type.STRING } },
    removed_content: { type: Type.ARRAY, items: { type: Type.STRING } },
    changed_rules: { type: Type.ARRAY, items: { type: Type.STRING } },
    billing_coding_impact: { type: Type.STRING },
    compliance_impact: { type: Type.STRING },
    risk_level: { type: Type.STRING },
    suggested_actions: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: [
    "summary",
    "added_content",
    "removed_content",
    "changed_rules",
    "billing_coding_impact",
    "compliance_impact",
    "risk_level",
    "suggested_actions",
  ],
}

function stripCodeFences(text: string) {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim()
}

function getDocumentContent(doc: DocumentWithContent) {
  return doc.extracted_text || doc.summary
}

export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request)

    const body = await request.json().catch(() => null)
    const oldDocumentId = body?.oldDocumentId
    const newDocumentId = body?.newDocumentId

    if (!oldDocumentId || !newDocumentId) {
      return NextResponse.json(
        { error: "oldDocumentId and newDocumentId are required." },
        { status: 400 }
      )
    }

    const { data: oldDocument, error: oldError } = await supabase
      .from("vitalex_documents")
      .select("*")
      .eq("id", oldDocumentId)
      .single()

    if (oldError || !oldDocument) {
      return NextResponse.json(
        { error: "Old document not found." },
        { status: 404 }
      )
    }

    const { data: newDocument, error: newError } = await supabase
      .from("vitalex_documents")
      .select("*")
      .eq("id", newDocumentId)
      .single()

    if (newError || !newDocument) {
      return NextResponse.json(
        { error: "New document not found." },
        { status: 404 }
      )
    }

    const oldContent = getDocumentContent(oldDocument)
    const newContent = getDocumentContent(newDocument)

    if (!oldContent?.trim() || !newContent?.trim()) {
      return NextResponse.json(
        {
          error:
            "Both documents must be summarized before they can be compared. Please generate a summary first.",
        },
        { status: 400 }
      )
    }

    const limitedOldContent = oldContent.slice(0, 12000)
    const limitedNewContent = newContent.slice(0, 12000)

    const geminiResponse = await genAI.models.generateContent({
      model: GEMINI_MODEL,
      contents: `Compare these two versions of a healthcare policy document and identify what changed between them.

Old Document (${oldDocument.file_name}):
${limitedOldContent}

New Document (${newDocument.file_name}):
${limitedNewContent}

Return:
- summary: a short overview of the main changes
- added_content: new content or requirements added in the new document
- removed_content: content or requirements removed from the old document
- changed_rules: rules or requirements that changed between versions
- billing_coding_impact: how the changes affect billing or coding
- compliance_impact: how the changes affect compliance
- risk_level: overall risk of the changes ("low", "medium", or "high")
- suggested_actions: recommended next steps for healthcare teams`,
      config: {
        systemInstruction:
          "You compare healthcare billing, coding, clinical, and compliance policy documents and identify meaningful differences between versions. Respond only with the structured comparison.",
        responseMimeType: "application/json",
        responseSchema: comparisonSchema,
      },
    })

    let comparisonResult: ComparisonResult

    try {
      comparisonResult = JSON.parse(
        stripCodeFences(geminiResponse.text || "{}")
      )
    } catch {
      return NextResponse.json(
        { error: "Failed to parse comparison result." },
        { status: 500 }
      )
    }

    const { data: savedComparison, error: insertError } = await supabase
      .from("vitalex_comparisons")
      .insert({
        old_document_id: oldDocumentId,
        new_document_id: newDocumentId,
        comparison_result: comparisonResult,
        user_id: userId,
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      )
    }

    try {
      const { error: auditError } = await supabase
        .from("vitalex_audit_logs")
        .insert({
          action: "compared_documents",
          entity_type: "comparison",
          entity_id: savedComparison.id,
          user_id: userId,
          metadata: {
            old_document_id: oldDocumentId,
            new_document_id: newDocumentId,
          },
        })

      if (auditError) {
        console.error("Failed to write audit log:", auditError.message)
      }
    } catch (auditException) {
      console.error("Failed to write audit log:", auditException)
    }

    return NextResponse.json({
      success: true,
      comparison: savedComparison,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Something went wrong"

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
