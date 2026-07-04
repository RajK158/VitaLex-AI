import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { GoogleGenAI } from "@google/genai"

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

async function getUserRole(userId: string): Promise<string> {
  const { data, error } = await supabase
    .from("vitalex_profiles")
    .select("role")
    .eq("id", userId)
    .single()

  if (error || !data) return "viewer"

  return data.role || "viewer"
}

const ALLOWED_ROLES = ["admin", "compliance", "billing_coding", "developer"]

const VALID_FORMATS = ["json", "pseudocode", "sql", "python"] as const
type ExportFormat = (typeof VALID_FORMATS)[number]

const formatInstructions: Record<
  Exclude<ExportFormat, "json">,
  string
> = {
  pseudocode:
    "Convert each rule into readable, implementation-style pseudocode showing the if/then logic.",
  sql:
    "Convert each rule into SQL-style CASE WHEN logic or validation queries that check the rule's condition.",
  python:
    "Convert each rule into a simple Python-style condition function implementing the rule's if/then logic.",
}

function stripCodeFences(text: string) {
  return text
    .trim()
    .replace(/^```(?:[a-zA-Z]*)?\s*/, "")
    .replace(/\s*```$/, "")
    .trim()
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const userId = await getUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const role = await getUserRole(userId)

    if (!ALLOWED_ROLES.includes(role)) {
      return NextResponse.json(
        { error: "Your role does not allow this action." },
        { status: 403 }
      )
    }

    const { data: document, error: documentError } = await supabase
      .from("vitalex_documents")
      .select("id")
      .eq("id", id)
      .eq("user_id", userId)
      .single()

    if (documentError || !document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      )
    }

    const body = await request.json().catch(() => null)
    const exportFormat = body?.exportFormat

    if (!VALID_FORMATS.includes(exportFormat)) {
      return NextResponse.json(
        {
          error: `exportFormat must be one of: ${VALID_FORMATS.join(", ")}`,
        },
        { status: 400 }
      )
    }

    const { data: ruleRows, error: rulesError } = await supabase
      .from("vitalex_rules")
      .select("rule_json")
      .eq("document_id", id)
      .eq("user_id", userId)
      .order("created_at", { ascending: true })

    if (rulesError) {
      return NextResponse.json(
        { error: rulesError.message },
        { status: 500 }
      )
    }

    if (!ruleRows || ruleRows.length === 0) {
      return NextResponse.json(
        {
          error:
            "No rules found for this document. Please generate rules first.",
        },
        { status: 404 }
      )
    }

    const rules = ruleRows.map((row) => row.rule_json)

    let content: string

    if (exportFormat === "json") {
      content = JSON.stringify(rules, null, 2)
    } else {
      const geminiResponse = await genAI.models.generateContent({
        model: GEMINI_MODEL,
        contents: `Convert the following healthcare policy rules into ${exportFormat} output for developers.

${formatInstructions[exportFormat as Exclude<ExportFormat, "json">]}

For each rule, include its rule_id and title above the converted logic.

Return plain text only. Do not use markdown code fences or markdown formatting.

Rules:
${JSON.stringify(rules, null, 2)}`,
        config: {
          systemInstruction:
            "You convert structured healthcare policy rules into developer-ready code or pseudocode. Respond only with plain text output, no markdown formatting or code fences.",
        },
      })

      content = stripCodeFences(geminiResponse.text || "")
    }

    if (!content) {
      return NextResponse.json(
        { error: "Failed to generate export content." },
        { status: 500 }
      )
    }

    try {
      const { error: auditError } = await supabase
        .from("vitalex_audit_logs")
        .insert({
          action: "exported_rules",
          entity_type: "document",
          entity_id: id,
          user_id: userId,
          metadata: { export_format: exportFormat },
        })

      if (auditError) {
        console.error("Failed to write audit log:", auditError.message)
      }
    } catch (auditException) {
      console.error("Failed to write audit log:", auditException)
    }

    return NextResponse.json({
      format: exportFormat,
      content,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Something went wrong"

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
