# ARCHITECTURE.md — System Architecture & Data Flow

## 1. Stack
- Next.js + TypeScript (app), Tailwind CSS + shadcn/ui (UI), PostgreSQL + Prisma (data),
  Zod (validation), Recharts (charts), Docker Compose (local/deploy).

## 2. High-Level Components
```
Frontend (Next.js)
   │  server actions / API routes only — no direct DB access from client
   ▼
API layer (RBAC + Zod validation on every mutating route)
   │
   ▼
Domain services
   ├─ MembershipDateService      (all date math, Asia/Kolkata)
   ├─ MembershipLifecycleService (ACTIVE/EXPIRING_SOON/EXPIRED transitions)
   ├─ RenewalService             (overlap checks, override audit)
   ├─ PaymentService             (payment + receipt generation)
   ├─ NotificationService        (idempotent WhatsApp + admin alerts)
   └─ AuditService               (writes AuditLog for admin actions)
   │
   ▼
Prisma ORM → PostgreSQL
   │
   ▼
membership-lifecycle-job (daily scheduled job, Asia/Kolkata)
   │
   ▼
WhatsAppService (interface)
   ├─ WhatsAppBusinessProvider (production, env-configured)
   └─ DevWhatsAppProvider (logs simulated sends, dev/test only)
```

## 3. Data Model (summary — see full field lists in PRD.md)
- **MembershipPlan** 1 → N **Membership** (via `planId`; `priceAtPurchase` copied at creation)
- **Member** 1 → N **Membership**
- **Membership** 1 → N **Payment**
- **Member/Membership** 1 → N **Notification**
- **User (admin/staff)** 1 → N **AuditLog**
- **JobExecution** — one row per daily job run

Key invariant: a member's memberships never overlap in date range, enforced at the service layer
(and ideally with a DB-level exclusion constraint if using Postgres range types).

## 4. WhatsAppService Interface
```ts
interface WhatsAppService {
  sendMessage(to: string, body: string): Promise<SendResult>;
  sendTemplateMessage(to: string, template: string, variables: Record<string, string>): Promise<SendResult>;
  getMessageStatus(providerMessageId: string): Promise<MessageStatus>;
}
```
- Provider selected via `WHATSAPP_PROVIDER` env var.
- Credentials (`WHATSAPP_API_URL`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`) are
  server-only env vars — never shipped to the client, never logged, never committed.
- Template `membership_expiry_10_days` with variables `{{member_name}}`, `{{plan_name}}`,
  `{{expiry_date}}`, `{{days_remaining}}`.

## 5. Idempotency Design
- Unique constraint on `Notification(membershipId, type, triggerDate)` at the DB level, not just
  application logic — this is what makes double job-runs safe.
- Job checks-then-inserts inside a transaction; a duplicate insert attempt is treated as
  "already handled," not an error.

## 6. Job Execution Model
- `membership-lifecycle-job` runs once daily (Asia/Kolkata), and is safe to re-run:
  1. Find memberships hitting the 10-day mark → mark EXPIRING_SOON → send WhatsApp (idempotent) →
     create admin notification.
  2. Find memberships past `endDate` → mark EXPIRED → create admin notification.
  3. Record a `JobExecution` row with processed/success/failure counts, so admins can see whether
     automation is healthy without inspecting logs.

## 7. Authentication & RBAC
- Session-based auth with HTTP-only secure cookies.
- Passwords hashed with Argon2 or bcrypt.
- Role (`SUPER_ADMIN` / `ADMIN` / `STAFF`) is resolved server-side from the session on every
  request; the client never supplies or is trusted for role information.

## 8. Deployment
- Docker Compose: `app` (Next.js), `db` (Postgres), and a scheduler (cron container or
  Next.js-compatible job runner) for `membership-lifecycle-job`.
- Environment variables documented in `.env.example`, secrets never committed.
