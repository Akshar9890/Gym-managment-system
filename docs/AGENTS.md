# AGENTS.md — Instructions for AI Coding Agents

## Before Writing Any Code
1. Inspect the existing repository. Do not assume a blank slate.
2. Identify and reuse existing infrastructure (auth, DB config, UI kit) if present.
3. Do not rewrite working code unnecessarily.
4. Never fabricate functionality — if a provider isn't configured, use the Development WhatsApp
   Provider (see ARCHITECTURE.md) and label it clearly as simulated, not "sent".
5. Never claim an integration is live unless it is actually configured and verified working.

## Implementation Order (do not skip ahead)
1. **Phase 1** — project setup, database, Prisma, authentication, RBAC.
2. **Phase 2** — membership plans, members, memberships (CRUD, no lifecycle logic yet).
3. **Phase 3** — date calculation service + lifecycle/expiry engine.
4. **Phase 4** — payments + receipts.
5. **Phase 5** — notification architecture, WhatsApp provider abstraction, dev provider.
6. **Phase 6** — automated daily job: 10-day reminders, duplicate prevention, retry handling.
7. **Phase 7** — admin dashboard, member profile, notification center.
8. **Phase 8** — reports, audit logs, job monitoring.
9. **Phase 9** — production WhatsApp provider integration.
10. **Phase 10** — testing, security review, mobile optimization, performance pass.

Each phase should be independently testable before moving to the next. Do not build the WhatsApp
job (Phase 6) before the expiry engine (Phase 3) exists and is tested — the job depends on it.

## Non-Negotiable Rules While Building
- All membership date math lives in one backend service. Never duplicate the logic in the
  frontend or in more than one backend module.
- `priceAtPurchase` is captured at purchase time and never re-derived from the current plan price.
- Every renewal must be validated against the member's existing memberships to prevent date
  overlap.
- WhatsApp sends must check the `Notification` table for an existing successful record with the
  same `(membershipId, notificationType, triggerDate)` key before sending anything.
- Every admin-role-gated action must be enforced server-side; a hidden/disabled button in the UI
  is not authorization.
- Do not log secrets (API tokens, passwords) anywhere, including in AuditLog metadata.
- Do not implement any attendance/QR/biometric feature under any circumstance, even if a future
  ticket seems to imply it — confirm explicitly with the product owner first.

## Definition of Done (per feature)
- Server-side validation (Zod) in place.
- RBAC enforced at the API layer, not just hidden in UI.
- Relevant AuditLog entries written.
- Automated test covering the core business rule (see TESTING.md).
- No secrets or credentials introduced into frontend bundles or version control.

## When Requirements Are Ambiguous
Prefer the interpretation that protects data integrity (no overlapping memberships, no duplicate
WhatsApp sends, no silently-changed historical prices) over one that optimizes for developer
convenience. When still ambiguous, state the assumption in `DECISIONS.md` rather than guessing
silently.
