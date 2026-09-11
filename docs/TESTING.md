# TESTING.md — Test Strategy & Commands

## Commands
```bash
npm run typecheck
npm test
```

## Coverage Requirements by Domain

### Date Calculation (`MembershipDateService`)
- 1 month / 3 months / 6 months / 1 year, from a mid-month start.
- Start dates in January and February (including non-leap Feb 28 clamping).
- Leap-year February 29 handling, both as a start date and as a clamp target.
- 30-day vs 31-day month starts (e.g. starting on the 31st, adding 1 month).
- Month-end joins across a year boundary (e.g. 31 Dec + 1 month).
- Consistency check: the same membership computed via two different entry points (creation vs.
  renewal preview) must produce identical dates.

### Expiry Engine
- Exactly 10 days before `endDate` → status transitions to `EXPIRING_SOON`.
- 9 days before → no transition yet (boundary correctness, not off-by-one).
- 1 day before → still `EXPIRING_SOON` / `ACTIVE` as appropriate, not yet `EXPIRED`.
- On `endDate` itself → transitions to `EXPIRED` (verify the inclusive/exclusive boundary matches
  DECISIONS.md D1).
- After expiry → remains `EXPIRED`, appears under "Renewal Required."

### WhatsApp Notifications
- A membership hitting the 10-day mark sends exactly one message.
- Running the daily job twice in the same day does not send a second message (idempotency key
  test, ideally exercised against the real DB unique constraint, not just mocked logic).
- A provider failure results in `status = FAILED` with error details captured, not `SENT`.
- Retry policy: failed sends are retried a bounded number of times, then stop (no infinite loop).
- Provider timeout is handled gracefully (treated as failure, not a hang or false success).
- Invalid/malformed WhatsApp number is rejected before attempting a send.
- Missing WhatsApp number on a member is handled without crashing the job (skipped + logged).

### Renewal
- Renewing an active membership sets new start = old end + 1 day, no overlap.
- Renewing an expired membership defaults new start = renewal date.
- Attempting to create/renew into an overlapping range is rejected.
- Manual start-date override by an authorized admin is recorded in AuditLog with old/new value
  and actor.
- Unauthorized role attempting an override is rejected server-side.

### RBAC
- SUPER_ADMIN can perform every operation.
- ADMIN can perform members/memberships/payments/plans/notifications/reports but not
  SUPER_ADMIN-only actions (define these explicitly per implementation).
- STAFF can create members/memberships/payments but not manage plans or view certain reports.
- Every sensitive route rejects an unauthenticated or under-privileged request server-side,
  even if the client sends a role claim suggesting otherwise.

### Payments
- PAID, PARTIAL, PENDING, REFUNDED states are all independently representable and do not
  auto-change membership status.
- Receipt numbers are unique across the system.

## Test Types
- **Unit tests** for domain services (date calc, lifecycle, renewal, notification idempotency) —
  no HTTP layer involved, fast and exhaustive on edge cases.
- **Integration tests** for API routes — RBAC enforcement, Zod validation, DB constraint
  behavior (e.g. the idempotency unique constraint actually rejects a duplicate insert).
- **Job tests** — run `membership-lifecycle-job` twice against the same seeded state and assert
  no duplicate side effects (notifications, status flips) occur.

## Manual/Exploratory Checklist Before Release
- Mobile admin flows: search, view member, check expiry, renew, record payment, send WhatsApp
  reminder, view notifications — all usable on a small screen.
- Confirm Development WhatsApp Provider is clearly labeled and cannot be mistaken for production
  delivery.
- Confirm no WhatsApp credentials are present in any client-side bundle or public repo.
