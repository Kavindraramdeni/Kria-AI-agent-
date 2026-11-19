# KRIA AI — Marketing & Operations Command Center

A high-precision, genuinely AI-powered business operations and growth platform built specifically for **KRIA TECH** (Hyderabad, India — precision custom manufacturing, CO2 laser cutting, cast acrylic fabrication, and personalized gifting).

KRIA AI operates as an internal intelligence command center alongside KRIA TECH's web properties. It delivers live website SEO diagnostics, dynamic B2B wholesale quotation modeling, market intelligence, search intent clustering, content generation, and factory unit economics with a **strict human-in-the-loop approval gate**.

---

## 🛡️ Core Philosophy: Strict Human Approval Gate & Execution Transparency

To protect KRIA TECH's brand reputation, customer relationships, advertising capital, and live infrastructure, KRIA AI enforces an uncompromising **zero-unauthorized-action policy**:
- **No Autonomous Customer Messaging**: Quotations, WhatsApp messages, and client emails require explicit owner/admin authorization.
- **No Autonomous Ad Spend**: Marketing campaign launches cannot allocate capital or trigger external ad APIs without human approval.
- **No Uncontrolled Production Mutation**: Website UX, structured data, and code recommendations cannot alter live sites without passing the approval queue.
- **Atomic Single-Use Dispatch**: The server re-verifies approval validity at runtime with mutex concurrency locking, single-use execution guards, and cryptographic SHA-256 audit hashing.
- **Zero Simulation Deception**: All AI execution modes are reported honestly. If an API key is missing or a provider fails, the system reports errors explicitly—it never silently presents hardcoded copy as AI-generated.

---

## 🚀 Key Modules & AI Capabilities

| Module | Engine & Integration | Operational Focus | Status |
| :--- | :--- | :--- | :--- |
| **Real Website SEO Scanner** | Live Network Fetch + DOM Parser + CWV Heuristics | SSRF-hardened URL scanner, measured TTFB, render-blocking `<head>` assets, image CLS hazards, Schema.org Rich Results, and Gemini technical remediation | ✅ Live AI |
| **Content Studio Agent** | Google Gemini 3.5 Flash Lite (`@google/genai`) | Factory-grounded marketing copy, Instagram captions, SEO metadata, conflict detection engine overriding unverified claims | ✅ Live AI |
| **SEO Strategy Agent** | Google Gemini 3.5 Flash Lite + Search Clusters | High-intent commercial/transactional keyword clustering, database persistence in `seo_keywords` | ✅ Live AI |
| **Sales & CRM Lead Agent** | Gemini 3.5 Flash Lite + Dynamic Pricing Engine | Mathematical bulk tier pricing (50, 100, 250, 500 MOQ), below-MOQ routing, VIP reseller discounts, CRM sync | ✅ Live AI |
| **Competitor Intelligence** | Gemini 3.5 Flash Lite + Market Matrix | Market pricing gap matrix, competitor comparison against wholesale acrylic fabricators, persistence in `competitor_reports` | ✅ Live AI |
| **Website UX Audit Agent** | 100-Point Deterministic HTML Inspector | Accessibility, mobile viewport responsiveness, contrast, and optical specification audit | ✅ Live AI |
| **Operations & Growth Analyst**| Factory Unit Economics Engine | Direct component COGS (raw acrylic, laser cutting, magnets, buffing, packing) & master sheet yields (70 units/sheet) | ✅ Live AI |
| **Approval Center** | Mutex Lock + Idempotency Store + Cryptographic Ledger | Mandatory human approval gate with role enforcement (`owner` / `admin`) and risk levels (Low, Medium, High, Critical) | ✅ Hardened |
| **Product Catalog** | KRIA Manufacturing Matrix (18 SKUs) | Authoritative specifications, dual-block magnetic desk frames, fridge magnets, keychains, wholesale pricing tiers | ✅ Live |
| **Activity Audit Trail** | Immutable SHA-256 Hash Chain Ledger | Tamper-evident audit logging recording every operator decision, scan, and agent task | ✅ Hardened |

---

## 🔒 Security Architecture & SSRF Hardening

1. **SSRF (Server-Side Request Forgery) Protection**:
   - The Website SEO Scanner validates all target URLs and resolves DNS prior to making HTTP requests.
   - Strictly blocks IPv4 loopback (`127.0.0.0/8`), private networks (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), link-local / cloud metadata (`169.254.0.0/16`, `metadata.google.internal`), carrier-grade NAT, broadcast, and IPv6 private/link-local ranges (`::1`, `fc00::/7`, `fe80::/10`).
   - Re-validates destination URLs on **every redirect hop** (up to 5 hops max).
   - Enforces strict 10-second timeout limits and 5 MB maximum response size limits.
   - Mock HTML injection is strictly disabled outside test environments.
2. **Server-Side Role Authorization**:
   - Dispatch of approved critical and high-risk actions requires a verified `owner` or `admin` role from trusted server session data.
   - Staff users are strictly rejected with HTTP 403 Forbidden.
   - No email-substring role checks or client-controlled permissions.
3. **Core Web Vitals Methodological Transparency**:
   - Directly measures Server Time to First Byte (TTFB in ms) and DOM asset counts.
   - Clearly identifies LCP and CLS figures as predictive static asset heuristics, explicitly noting that field Core Web Vitals and INP require real-user monitoring (RUM) or Chrome CrUX data.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14 App Router (Turbopack enabled)
- **Language**: TypeScript 5 (Strict Mode)
- **AI Engine**: Official Google Gen AI SDK (`@google/genai`) — Gemini 3.5 Flash Lite (`gemini-3.5-flash-lite`)
- **Styling**: Tailwind CSS (Dark Navy `#070B14`, Electric Blue `#2563EB`, Emerald Green `#10B981`)
- **Database & Auth**: Supabase PostgreSQL + Auth (Server-side session verification via `@supabase/ssr`, Realtime enabled)
- **Testing**: Vitest 5 (158 tests across 24 test suites)
- **Validation**: Zod structured data schemas
- **CI/CD & Hosting**: GitHub Actions + Vercel Serverless Edge

---

## 📦 Getting Started

### 1. Prerequisites
- Node.js 18.18+ or 20+ (Tested on Node v22.20.0)
- npm 10+
- A Google Gemini API Key (`GEMINI_API_KEY` or `GOOGLE_API_KEY`)
- A Supabase Project (PostgreSQL database with Auth)

### 2. Installation
```bash
git clone https://github.com/Kavindraramdeni/Kria-AI-agent-.git
cd "Kria-AI-agent-"
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

# Server-Only Credentials (NEVER expose to client)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google Gemini AI Provider (Required for live agents & scanner)
GEMINI_API_KEY=your-gemini-api-key

# Optional Automation Webhook
N8N_WEBHOOK_URL=https://your-n8n.com/webhook/kria
```

### 4. Database Migrations & Seeding
To apply the database schema to your Supabase project:
1. Open your Supabase Dashboard SQL Editor.
2. Execute the migration scripts in order:
   - `supabase/migrations/20260101000000_init_schema.sql` (Creates all tables, indexes, constraints)
   - `supabase/migrations/20260101000001_rls_policies.sql` (Enforces RLS on every table)
   - `supabase/migrations/20260101000002_seed_demo_data.sql` (Seeds initial factory parameters)
   - `supabase/migrations/20260101000003_rbac_rls_hardening.sql` (Hardens user roles)
   - `supabase/migrations/20260101000004_audit_immutability.sql` (Enforces immutable audit ledger)
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

## 🧪 Testing, Quality Control & Live Verification

KRIA AI is built with zero-compromise testing standards:

```bash
# Run Vitest test suite (All 24 test files, 158 tests)
npm test

# Run TypeScript compiler verification (0 errors required)
npm run typecheck

# Run Next.js ESLint verification (0 warnings/errors required)
npm run lint

# 1. Live SEO Strategy Agent Verification (Gemini AI + Supabase keywords persistence)
npx tsx scripts/verify-seo-agent-live.ts

# 2. Live Content Studio Agent Verification (Gemini AI + Supabase draft persistence)
npx tsx scripts/verify-content-agent-live.ts

# 3. Live Technical SEO Scanner Verification (DNS Pinning + DOM + Core Web Vitals)
npx tsx scripts/verify-seo-scanner-live.ts

# 4. Live Full Execution, Durable Idempotency & Hash Chain Audit
npx tsx scripts/verify-full-approval-execution-live.ts
```

---

## 🚀 Vercel Production Deployment

To deploy KRIA AI to Vercel:

1. **Import Repository**: Connect `Kavindraramdeni/Kria-AI-agent-` in [Vercel](https://vercel.com).
2. **Environment Variables**: Configure in Vercel Project Settings:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://<project-id>.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `your-supabase-anon-key`
   - `SUPABASE_SERVICE_ROLE_KEY` = `your-supabase-service-role-key`
   - `GEMINI_API_KEY` = `your-google-gemini-api-key`
   - `KRIA_ADMIN_EMAIL` = `admin@kriatech.com`
   - `KRIA_ADMIN_PASSWORD` = `your-admin-password`
   - `LIVE_PRODUCTION_DISPATCH` = `false` *(keep false for sandbox execution; toggle true for live provider dispatches)*
3. **Region Selection**: Set Serverless Function Region to **Mumbai (`bom1`)** to match the Supabase `ap-south-1` region for minimal latency (<10ms).
4. **Deploy**: Push to `main` triggers automated CI testing via GitHub Actions and continuous deployment on Vercel.

---

## 📄 License & Attribution

Proprietary internal command center developed for **KRIA TECH** (Hyderabad, India). All rights reserved.
