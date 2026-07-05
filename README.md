# Vitalex

Vitalex is a healthcare content management and policy intelligence MVP. It helps healthcare operations teams upload policy documents, generate AI summaries and structured rules, compare document versions, export rules for downstream systems, and track approval and audit activity.

Vitalex is designed for **admins, billing/coding teams, compliance teams, analysts, clinical operations teams, and developers**. It is **not** a patient-facing appointment or medical records application.

---

## Project Overview

Vitalex provides a secure workspace for managing healthcare policy content such as billing policies, coding rules, payer contracts, clinical guidelines, and compliance documents. Users can upload documents, generate summaries and actionable rules with Gemini, compare policy versions, export rules in multiple formats, and manage a simple approval workflow.

All dashboard data is scoped to the authenticated user. The application combines a Next.js frontend, Supabase for auth/database/storage, and Google Gemini for AI-powered document processing.

---

## Assessment Topic Fit

Vitalex fits assessment topics related to:

- **Healthcare information systems** — policy and operational document management rather than clinical patient records
- **AI in healthcare operations** — practical use of LLMs for summarization, rule extraction, and version comparison
- **Secure web application design** — authentication, user ownership, role-based access, and audit logging
- **Full-stack MVP development** — frontend UI, API routes, database integration, and file storage

The project demonstrates how AI can support back-office healthcare teams without replacing clinical systems or handling patient care workflows.

---

## Key Features

- **Authentication** — Email/password and Google OAuth via Supabase Auth
- **User-scoped dashboard** — Documents, metrics, and activity filtered by authenticated user
- **Document upload** — PDF, DOCX, and TXT files stored in Supabase Storage
- **Metadata storage** — Document type, payer, department, status, and approval fields in Supabase
- **Gemini-powered summaries** — Extracted text summarized for billing, coding, compliance, and operations teams
- **Gemini-powered rule generation** — Structured if/then rules with department and risk level
- **Document comparison** — Side-by-side analysis of two summarized documents with impact assessment
- **Rule export** — JSON, pseudocode, SQL-style logic, and Python-style logic
- **Approval workflow** — Draft, In Review, Approved, and Published statuses with notes
- **Audit logs** — Recent activity for summaries, rules, exports, comparisons, approvals, uploads, and deletes
- **Impact metrics** — Documents uploaded, summaries generated, rules generated, high-risk rules, and comparisons run
- **Role-based permissions** — UI restrictions and backend enforcement by user role

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS |
| Backend | Next.js API Routes (Node.js runtime) |
| Database & Auth | Supabase (PostgreSQL, Auth, Storage) |
| AI | Google Gemini (`@google/genai`) |
| Document parsing | `pdf-parse`, `mammoth` (DOCX) |

---

## AI/LLM Usage

Vitalex uses **Google Gemini** (`gemini-3.5-flash`) for:

| Feature | Purpose |
| --- | --- |
| Summarization | Generate readable summaries from extracted document text |
| Rule generation | Convert policy content into structured JSON rules |
| Document comparison | Identify added, removed, and changed content with impact analysis |
| Rule export | Transform stored rules into pseudocode, SQL-style, or Python-style output |

JSON export is generated directly from stored rule data without an additional Gemini call. AI prompts are tuned for healthcare billing, coding, compliance, and operations language.

---

## User Roles

Vitalex supports six roles with different permissions:

| Role | Typical use |
| --- | --- |
| **Admin** | Full access: upload, summarize, rules, export, compare, approve, delete |
| **Compliance** | View content, export rules, compare documents, update approval status |
| **Billing/Coding** | View content, generate rules, export rules, compare documents |
| **Analyst** | Upload, summarize, compare, view rules |
| **Developer** | View content and export rules |
| **Viewer** | Read-only access to documents, summaries, and rules |

Permissions are enforced in the dashboard UI and in protected API routes.

### Demo role behavior

For demo purposes, **new users are assigned the Admin role by default** so reviewers can test all features immediately.

In production, the default role should be **Viewer**, and roles should be managed by an administrator.

---

## Demo Workflow

1. **Sign up or log in** at `/signup` or `/login` (email/password or Google).
2. **Open the dashboard** at `/dashboard`.
3. **Upload a policy document** (PDF, DOCX, or TXT) with optional metadata.
4. **Generate a summary** for the uploaded document.
5. **Generate rules** from the summarized content.
6. **View or export rules** as JSON, pseudocode, SQL-style logic, or Python-style logic.
7. **Open a document detail page** to review summary, rules, extracted text, and approval status.
8. **Update approval status** (if your role allows).
9. **Compare two summarized documents** at `/dashboard/compare`.
10. **Review impact metrics and recent activity** on the dashboard.

---

## Local Setup

### Prerequisites

- Node.js 18+
- npm or pnpm
- A Supabase project
- A Google Gemini API key

### Steps

1. Clone the repository and enter the project directory:

   ```bash
   cd VitaLex
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create `.env.local` in the project root (see Environment Variables below).

4. Configure Supabase:
   - Create the required tables (see Database / Supabase Tables)
   - Create a Storage bucket named `documents`
   - Enable Email and Google auth providers as needed
   - Configure Row Level Security policies for user-scoped access

5. Start the development server:

   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

Create a `.env.local` file with the following variables. **Do not commit real secret values.**

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
GEMINI_API_KEY=your_gemini_api_key
```

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (client-safe) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key (client-safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only; never expose to the client) |
| `GEMINI_API_KEY` | Google Gemini API key (server-only) |

---

## Database / Supabase Tables

Vitalex uses the following Supabase resources:

### Storage

- **`documents`** — Uploaded PDF, DOCX, and TXT files (user-scoped paths)

### Tables

| Table | Purpose |
| --- | --- |
| `vitalex_documents` | Document metadata, extracted text, summary, status, approval fields, `user_id` |
| `vitalex_rules` | Generated rules linked to documents (`rule_json`, `user_id`) |
| `vitalex_comparisons` | Comparison results between two documents (`user_id`) |
| `vitalex_audit_logs` | Audit trail for user actions (`user_id`) |
| `vitalex_profiles` | User profile with role (`admin`, `compliance`, `billing_coding`, `analyst`, `developer`, `viewer`) |

Key document fields include `file_name`, `file_path`, `document_type`, `payer`, `department`, `status`, `approval_status`, `approval_notes`, `approved_at`, and `published_at`.

---

## Security Notes

- **Authentication** — Protected routes require a valid Supabase session.
- **User ownership** — API routes verify that documents and actions belong to the authenticated user.
- **Role enforcement** — Protected API routes check `vitalex_profiles.role` and return `403` when an action is not allowed.
- **Service role key** — Used only in server-side API routes; never exposed to the browser.
- **Audit logging** — Successful backend actions write to `vitalex_audit_logs` with user context.
- **Row Level Security** — Supabase RLS policies should restrict client access to each user's own data.

Review Supabase policies and role defaults before deploying to production.

---

## Future Improvements

- Admin UI for role assignment (default new users to Viewer in production)
- Organization or team-level document sharing beyond single-user ownership
- Richer approval workflows with reviewers and notifications
- Markdown rendering for summaries in the UI
- Scheduled re-processing when policy documents are updated
- Stronger export formats (validated SQL/Python templates)
- Expanded metrics and reporting dashboards
- Automated tests for API routes and permission checks
- Deployment documentation for Vercel or similar hosting

---

## License

This project is an MVP built for demonstration and assessment purposes.
