# DECISIONS.md — Architectural Decisions

## D1: Date Calculation Policy (inclusive start, inclusive end, +1 day rollover)
**Decision:** A membership period is inclusive of both `startDate` and `endDate`. Duration is
added to the start date and then 1 day is subtracted to land on the correct inclusive end date.

Given the spec's own examples:
- Start 11 Sep 2026, **1 Month** → 11 Sep → **10 Oct 2026**
- Start 11 Sep 2026, **3 Months** → 11 Sep → **10 Dec 2026**
- Start 11 Sep 2026, **6 Months** → 11 Sep → **10 Mar 2027**
- Start 11 Sep 2026, **1 Year** → 11 Sep 2026 → **10 Sep 2027**

**Rule:** `endDate = addCalendarUnits(startDate, duration, unit) - 1 day`, computed in
`Asia/Kolkata` civil-date terms (no time-of-day component, no UTC drift).

**Renewal continuity:** the next membership's start date is `previous endDate + 1 day`, which is
what guarantees no gap and no overlap between consecutive memberships for the same member.

**Edge cases explicitly handled:**
- Month-end joins (e.g. 31 Jan + 1 month): use calendar month addition that clamps to the last
  valid day of the target month (e.g. 31 Jan + 1 month → 28 Feb / 29 Feb in a leap year), then
  apply the -1 day rule.
- Leap years: Feb 29 is a valid target/clamp date only in leap years; use a date library
  (`date-fns`/`Luxon`) rather than hand-rolled arithmetic to avoid drift.
- Year transitions: handled naturally by calendar-aware date libraries, no special-casing needed.

## D2: Timezone Handling
**Decision:** All membership date math and the daily scheduled job operate in `Asia/Kolkata`
civil time. Dates are stored as timezone-naive calendar dates (not `timestamptz`) for
`startDate`/`endDate`, since a membership day boundary is a civil-date concept, not an instant in
time. Audit/notification timestamps (`createdAt`, `sentAt`, etc.) remain full UTC instants.

## D3: Idempotency via DB Constraint, Not Just Application Logic
**Decision:** A unique constraint on `Notification(membershipId, type, triggerDate)` is added at
the database level. Rationale: application-level "check then insert" is vulnerable to race
conditions if the job is ever run concurrently (e.g. overlapping cron executions, manual +
scheduled trigger colliding). The DB constraint is the actual source of truth for "has this
already been sent."

## D4: WhatsApp Provider Abstraction
**Decision:** A `WhatsAppService` interface decouples the app from any single vendor. Rationale:
WhatsApp Business API access is typically brokered through a Business Solution Provider (BSP),
and the specific BSP is a business decision, not a technical one — swapping providers should not
require touching domain logic, only swapping the concrete provider implementation.

## D5: Development WhatsApp Provider
**Decision:** When `WHATSAPP_PROVIDER` credentials are absent, the system uses a
`DevWhatsAppProvider` that logs a `[DEV WHATSAPP] ... Status: SIMULATED` record and writes a
`Notification` row with a distinguishable status, and the UI displays a visible "Development
Mode" indicator. Rationale: prevents the team from ever mistaking simulated sends for real
delivery, in local dev or staging.

## D6: Payment Status Independent of Membership Status
**Decision:** `Membership.membershipStatus` and `Payment.paymentStatus` are separate fields with
no automatic coupling. Rationale: gyms commonly start a membership on partial payment (e.g. a
deposit) — the spec explicitly requires ACTIVE + PARTIAL to be representable.

## D7: Server as Sole Source of Truth
**Decision:** Membership status, expiry state, and role/permission checks are always computed or
verified server-side, even when the frontend already displays a computed value. Rationale:
security and data-integrity requirement — the frontend must never be trusted to assert its own
authorization or the correctness of business-critical state.

## D8: Staff Management, Attribution & Deactivation Preservation
**Decision:** Operational staff accounts are authenticated via Email + Password. Every membership, renewal, and payment stores `createdById` / `receivedById`. Historical records are permanently immutable: staff deactivation sets `isActive: false` which disables authentication immediately, but all historical records retain their original creator attribution forever.

## D9: Strict Elimination of Human IDs
**Decision:** Member IDs (`BSF-XXXXXX`) and Staff IDs (`BSF-STF-XXXX`) are permanently eliminated from the Prisma schema, APIs, frontend UI displays, CSV exports, receipts, and audit logs. Human identity is determined exclusively by Name, Phone Number, WhatsApp Number, and Email. Transaction references are preserved using year-aware sequential formats: Membership Reference (`BSF-MEM-YYYY-000001`) and Receipt Number (`BSF-RCP-YYYY-000001`).

## D10: Admin Payment Verification Gate & Proof Attachment
**Decision:** All staff-recorded memberships, renewals, and payments enter `PENDING_VERIFICATION` status upon submission. Staff upload or capture payment proof (JPG, PNG, WEBP, PDF up to 10MB) and record transaction references. Only Admin or Super Admin can verify payments; self-approval by staff is prohibited. Upon admin approval, payment status transitions to `VERIFIED` and the membership is activated (`ACTIVE`). Rejections require a mandatory reason (>= 3 chars) and transition both to `REJECTED`.

## Acceptance Criteria (carried from original spec, section 42)
See PRD.md §7 and STAFF.md. This checklist is the authoritative "done" definition for the whole system and
should be re-validated before any production release.
