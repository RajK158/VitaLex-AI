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

async function getUserRole(userId: string): Promise<string> {
  const { data, error } = await supabase
    .from("vitalex_profiles")
    .select("role")
    .eq("id", userId)
    .single()

  if (error || !data) return "viewer"

  return data.role || "viewer"
}

const ALLOWED_ROLES = ["admin", "billing_coding"]

type GeneratedRule = {
  rule_id: string
  title: string
  condition: string
  action: string
  department: string
  risk_level: string
  source_reference: string
}

const rulesSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      rule_id: { type: Type.STRING },
      title: { type: Type.STRING },
      condition: { type: Type.STRING },
      action: { type: Type.STRING },
      department: { type: Type.STRING },
      risk_level: { type: Type.STRING },
      source_reference: { type: Type.STRING },
    },
    required: [
      "rule_id",
      "title",
      "condition",
      "action",
      "department",
      "risk_level",
      "source_reference",
    ],
  },
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
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single()

    if (documentError || !document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      )
    }

    const content = document.extracted_text || document.summary

    if (!content || !content.trim()) {
      return NextResponse.json(
        {
          error:
            "No summarized content available. Please generate a summary first.",
        },
        { status: 400 }
      )
    }

    const limitedContent = content.slice(0, 12000)

    const geminiResponse = await genAI.models.generateContent({
      model: GEMINI_MODEL,
      contents: `Analyze this healthcare policy document and convert it into structured, actionable rules.

Each rule must have:
- rule_id: a short unique id like "RULE-001", "RULE-002"
- title: a short rule title
- condition: the "if" condition that triggers the rule
- action: the "then" action or requirement
- department: one of Billing, Coding, Compliance, Clinical, or Operations
- risk_level: one of low, medium, or high
- source_reference: a short reference to the source text this rule came from

Document:
${limitedContent}`,
      config: {
        systemInstruction:
          "You convert healthcare billing, coding, clinical, and compliance policy content into structured if-then rules for downstream systems. Respond only with the structured rules.",
        responseMimeType: "application/json",
        responseSchema: rulesSchema,
      },
    })

    let rules: GeneratedRule[]

    try {
      rules = JSON.parse(geminiResponse.text || "[]")
    } catch {
      return NextResponse.json(
        { error: "Failed to parse generated rules." },
        { status: 500 }
      )
    }

    if (!Array.isArray(rules) || rules.length === 0) {
      return NextResponse.json(
        { error: "No rules could be generated from this document." },
        { status: 400 }
      )
    }

    const { error: deleteError } = await supabase
      .from("vitalex_rules")
      .delete()
      .eq("document_id", document.id)
      .eq("user_id", userId)

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      )
    }

    const rowsToInsert = rules.map((rule) => ({
      document_id: document.id,
      rule_title: rule.title || rule.rule_id || "Generated Rule",
      rule_json: rule,
      user_id: userId,
    }))

    const { error: insertError } = await supabase
      .from("vitalex_rules")
      .insert(rowsToInsert)

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
          action: "generated_rules",
          entity_type: "document",
          entity_id: document.id,
          user_id: userId,
          metadata: { rule_count: rules.length },
        })

      if (auditError) {
        console.error("Failed to write audit log:", auditError.message)
      }
    } catch (auditException) {
      console.error("Failed to write audit log:", auditException)
    }

    return NextResponse.json({
      success: true,
      rules,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Something went wrong"

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
