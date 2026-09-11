# RULES.md — Coding, Security & Business Rules

## Business Rules (non-negotiable)
1. One member → many memberships. Never overwrite or delete historical memberships.
2. Historical prices never change (`priceAtPurchase` is fixed at creation).
3. Renewals must never create overlapping date ranges for the same member.
4. Payment status and membership status are tracked and updated independently.
5. All expiry/date calculations happen in exactly one backend service (Asia/Kolkata).
6. WhatsApp reminders must be idempotent — never more than one automated 10-day reminder per
   membership.
7. A failed WhatsApp send is never recorded or displayed as successful.
8. Every administrative mutation is written to AuditLog.
9. The backend enforces every business rule; the frontend is a presentation layer only.
10. Frontend state (including role) is never treated as a source of truth for status or
    authorization.
11. No Member ID or Staff ID: Humans are identified exclusively by Name, Phone, WhatsApp, and Email.
    Alphanumeric IDs (`BSF-XXXXXX` and `BSF-STF-XXXX`) are eliminated from UI, schema, and APIs.
12. Sequential transaction references: Only Membership Reference (`BSF-MEM-YYYY-000001`) and Receipt
    Number (`BSF-RCP-YYYY-000001`) are used as transaction identifiers.
13. Admin payment verification gate: Staff-submitted memberships and payments require Admin verification
    before activation (`PENDING_VERIFICATION` → `VERIFIED` / `ACTIVE`). Staff self-approval is prohibited.

## Security Rules
- Passwords: Argon2 or bcrypt only, never plaintext, never logged.
- Sessions: HTTP-only, secure cookies; CSRF protection on state-changing routes.
- All inputs validated server-side with Zod, regardless of client-side validation.
- Authentication endpoints rate-limited.
- Secrets (WhatsApp tokens, DB credentials) only in server-side env vars — never in client
  bundles, never in AuditLog metadata, never committed to Git.
- Role/permission checks happen on the server for every sensitive route; there is no
  frontend-only role selector.
- Destructive dev-only tooling (e.g. `db:reset-demo`) must be disabled/unreachable in production.

## Error Handling
- Any WhatsApp provider failure surfaces a `FAILED` status with the provider error captured, not
  a generic success message.
- Retries follow a bounded policy (e.g. limited attempts with backoff) — never infinite retry
  loops.
- API routes return structured error responses; no raw stack traces to the client in production.

## Coding Conventions
- TypeScript strict mode.
- Zod schemas colocated with the API routes/server actions that use them.
- Domain services (date calc, lifecycle, renewal, payments, notifications, audit) are pure/
  testable modules, independent of the HTTP layer, so they can be unit tested directly.
- No membership/date logic duplicated between frontend and backend, or between multiple backend
  modules.
- Database migrations via Prisma; no manual schema drift.

## Scope Discipline
Do not add QR-based attendance, biometric check-in, face recognition, AI workout/diet features,
trainer marketplace, social feed, or gamification unless explicitly requested in a future,
separate scope change.
