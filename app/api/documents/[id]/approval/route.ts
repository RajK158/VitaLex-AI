import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, serviceRoleKey)

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

const VALID_APPROVAL_STATUSES = [
  "draft",
  "in_review",
  "approved",
  "published",
] as const
type ApprovalStatus = (typeof VALID_APPROVAL_STATUSES)[number]

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const userId = await getUserIdFromRequest(request)

    const body = await request.json().catch(() => null)
    const approvalStatus = body?.approvalStatus
    const approvalNotes = body?.approvalNotes

    if (!VALID_APPROVAL_STATUSES.includes(approvalStatus)) {
      return NextResponse.json(
        {
          error: `approvalStatus must be one of: ${VALID_APPROVAL_STATUSES.join(
            ", "
          )}`,
        },
        { status: 400 }
      )
    }

    const updates: Record<string, unknown> = {
      approval_status: approvalStatus,
    }

    if (approvalNotes !== undefined && approvalNotes !== null) {
      updates.approval_notes = approvalNotes
    }

    if (approvalStatus === "approved") {
      updates.approved_at = new Date().toISOString()
    }

    if (approvalStatus === "published") {
      updates.published_at = new Date().toISOString()
    }

    const { data: updatedDocument, error: updateError } = await supabase
      .from("vitalex_documents")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (updateError || !updatedDocument) {
      return NextResponse.json(
        { error: updateError?.message || "Document not found" },
        { status: 404 }
      )
    }

    try {
      const auditMetadata: Record<string, unknown> = {
        approval_status: approvalStatus as ApprovalStatus,
      }

      if (approvalNotes !== undefined && approvalNotes !== null) {
        auditMetadata.approval_notes = approvalNotes
      }

      const { error: auditError } = await supabase
        .from("vitalex_audit_logs")
        .insert({
          action: "updated_approval_status",
          entity_type: "document",
          entity_id: id,
          user_id: userId,
          metadata: auditMetadata,
        })

      if (auditError) {
        console.error("Failed to write audit log:", auditError.message)
      }
    } catch (auditException) {
      console.error("Failed to write audit log:", auditException)
    }

    return NextResponse.json({
      success: true,
      document: updatedDocument,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Something went wrong"

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
