# MEMORY.md — Project Context

## What This Project Is
A membership and WhatsApp-renewal management system for **BSF THE GYM**, Gotri-Sevasi Road,
Vadodara, Gujarat, India. Built for gym admin staff, not for members (no member-facing app in
this scope).

## What This Project Is Explicitly NOT
Not an attendance system. No QR entry/exit, no biometrics, no face recognition, no check-in/
check-out functionality — this has been stated multiple times in the original spec and should
not be reintroduced without an explicit, separate request.

## Core Identity of the Product
Member Management + Membership Management + Payment Management + Automatic Expiry Detection +
WhatsApp Renewal Notifications + Admin Alerts + Renewal Management + Auditability.

## Non-Obvious Constraints Worth Remembering
- WhatsApp number and phone number are stored separately — a member's WhatsApp may differ from
  their primary phone.
- Member IDs (`BSF-XXXXXX`) and Staff IDs (`BSF-STF-XXXX`) have been PERMANENTLY REMOVED. Humans are
  identified by name, phone, WhatsApp, and email.
- Sequential year-aware references: Membership Reference (`BSF-MEM-YYYY-000001`) and Receipt Number
  (`BSF-RCP-YYYY-000001`).
- Admin Payment Verification Gate: Staff-recorded memberships and payments enter `PENDING_VERIFICATION`
  until approved by an Admin/Super Admin. Self-approval by staff is prohibited.
- A membership's price is locked in at purchase (`priceAtPurchase`); plan price changes must
  never retroactively alter past memberships.
- The 10-day WhatsApp reminder is the single most safety-critical automated feature — it must
  never fire twice for the same membership, and it must never claim success when delivery failed.
- Timezone for all date logic: `Asia/Kolkata`, consistently, across every screen and job.
- If WhatsApp credentials aren't configured, the system must use a clearly-labeled Development
  WhatsApp Provider that simulates and logs sends — never silently pretend to send.

## Implementation Status
_Update this section as work progresses._

- [x] Phase 1 — project setup, DB, Prisma, auth, RBAC
- [x] Phase 2 — plans, members, memberships
- [x] Phase 3 — date calc + lifecycle engine
- [x] Phase 4 — payments + receipts
- [x] Phase 5 — notification architecture + WhatsApp abstraction
- [x] Phase 6 — automated job + duplicate prevention
- [x] Phase 7 — admin dashboard + member profile + notification center
- [x] Phase 8 — reports + audit logs + job monitoring
- [x] Phase 9 — production WhatsApp integration
- [x] Phase 10 — testing, security review, mobile/perf polish
- [x] Phase 11 — Staff Management, Email Auth, ID Elimination, Admin Payment Verification Gate & Proof Attachment (86/86 unit tests passing, zero attendance/QR violations, tsc clean)

## Open Questions for the Product Owner
- Which WhatsApp Business API provider will be used in production (e.g. Meta Cloud API directly,
  or a BSP like Gupshup/Twilio/Interakt)? This determines the concrete `WhatsAppBusinessProvider`
  implementation in Phase 9.
- Exact inclusive/exclusive date policy preference for membership periods (see DECISIONS.md for
  the proposed default — confirm before Phase 3 is finalized).
- Whether receipts need GST/tax fields for compliance.
