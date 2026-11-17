# KRIA AI — Marketing & Operations Command Center

A standalone, AI-powered business growth and operations command center built specifically for **KRIA TECH** (custom manufacturing, CO2 laser cutting, sublimation printing, and personalized gifting).

KRIA AI is an internal platform operating alongside the public KRIA TECH web property. It provides market intelligence, CRM pipeline management, SEO keyword clustering, content generation, and task automation with a **strict human-in-the-loop approval gate**.

---

## 🛡️ Core Philosophy: Strict Human Approval Gate

To protect KRIA TECH's reputation, ad spend, and live infrastructure, KRIA AI enforces a **zero-unauthorized-action policy**:
- **No Automatic Publishing**: Social posts and articles are routed to the Approval Center as drafts.
- **No Automatic Messaging**: Outbound quotes, WhatsApp messages, and client emails require explicit manager authorization.
- **No Autonomous Ad Spend**: Campaign launches cannot bid or spend capital without approval.
- **No Production Mutation**: Website UX and code proposals cannot modify live sites without explicit confirmation.
- **Re-Verification at Execution**: The server re-checks approval validity at runtime; approval is single-use, not blanket permission.

---

## 🚀 Key Features

| Module | Capability | Status |
| :--- | :--- | :--- |
| **Executive Overview** | Real KPIs, pending approval alerts, priority product spotlights, quick actions | ✅ Working |
| **Product Catalog** | Full CRUD for acrylic photo frames, keychains, LED signs, and MDF cutouts with retail & bulk wholesale pricing | ✅ Working |
| **Leads & CRM** | 7-stage pipeline (New, Contacted, Qualified, Quote Sent, Negotiation, Won, Lost), priority filters, CSV export | ✅ Working |
| **Approval Center** | Mandatory single-use decision gate with risk levels (Low, Medium, High, Critical), review notes, and audit history | ✅ Working |
| **AI Agent Center** | 6 specialized agent definitions (SEO, Content, Sales, Competitor, Website, Analyst) with typed schemas and safe offline fallback | ✅ Working |
| **SEO Studio** | High-intent keyword tracking, cluster mapping, search intent classification (Commercial/Transactional/Informational) | ✅ Working |
| **Content Studio** | Editorial calendar, Instagram caption and product description drafts with copy & approval routing | ✅ Working |
| **Competitor Intelligence** | Public ethical competitor benchmarking (pricing structure, catalog comparison, KRIA edge) | ✅ Working |
| **Campaigns Guardrail** | Marketing campaign drafting with budget guardrails and financial safety locks | ✅ Working |
| **Operations Analytics** | Pipeline distribution, lead source breakdown, and catalog category proportions computed from live data | ✅ Working |
| **Activity Audit Trail** | Append-only security log recording every user decision and agent proposal | ✅ Working |
| **Settings & Automations** | Supabase connection status, AI key configuration, n8n webhook boundary triggers | ✅ Working |

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14 App Router
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS (Custom Dark Navy `#070B14` & Electric Blue `#2563EB` SaaS palette)
- **Component Primitives**: Lucide Icons, clsx, tailwind-merge
- **Database & Auth**: Supabase PostgreSQL + Auth + Storage
- **Security**: Row-Level Security (RLS) on all exposed tables with authenticated policies
- **Testing**: Vitest test runner (Unit, Schema, Approval Gate logic)
- **Validation**: Zod structured data schemas

---

## 📦 Getting Started

### 1. Prerequisites
- Node.js 18.18+ or 20+ (Tested on Node v22.20.0)
- npm 10+
- A Supabase account (or local demo mode)

### 2. Installation
```bash
git clone <repo-url>
cd "Kria A!"
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Fill in your configuration:
```env
# Public Supabase (Browser + Server)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Server-Only (NEVER expose to client)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional AI Providers (Safe offline fallback enabled if omitted)
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key

# Optional Automation Webhook
N8N_WEBHOOK_URL=https://your-n8n.com/webhook/kria
```

> **Note on Offline Safe Mode**: If Supabase keys are not set, KRIA AI automatically boots in resilient **Demo Mode** with realistic sample data for magnetic acrylic photo frames, CRM leads, and approvals clearly marked with `DEMO DATA` tags. All UI and CRUD interactions remain fully functional.

### 4. Database Migrations & Seeding
To apply the database schema to your Supabase project:
1. Open your Supabase Dashboard SQL Editor.
2. Execute the migration scripts in order:
   - `supabase/migrations/20260101000000_init_schema.sql` (Creates all 16 tables, indexes, constraints)
   - `supabase/migrations/20260101000001_rls_policies.sql` (Enforces RLS on every table)
   - `supabase/migrations/20260101000002_seed_demo_data.sql` (Seeds realistic catalog & CRM data)
3. Alternatively, run the Node seed script:
```bash
npm run seed
```

### 5. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing, Type Checking & Linting

KRIA AI is built with strict quality controls:

```bash
# Run Vitest test suite (Approval gate, CRM pipeline, Product specs)
npm test

# Run TypeScript compiler verification
npm run typecheck

# Run Next.js ESLint verification
npm run lint
```

---

## 🚢 Production Deployment (Vercel)

1. Push your repository to GitHub.
2. Import the project into [Vercel](https://vercel.com).
3. Set the Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY` (optional)
   - `N8N_WEBHOOK_URL` (optional)
4. Deploy. Vercel automatically runs `npm run build` and optimizes static assets.

---

## 🔒 Security Best Practices Implemented
- **Zero Browser Key Leakage**: `SUPABASE_SERVICE_ROLE_KEY` is restricted to server-side code and will throw a fatal error if referenced in client bundles.
- **Row-Level Security (RLS)**: Enforced across all 16 tables. Unauthenticated public access is rejected.
- **Prompt Injection Defense**: Agent schemas treat external inputs, website content, and competitor pages as untrusted data.
- **Audit Logging**: Every action, status change, and approval decision writes an immutable log entry in `activity_logs`.
