# PRD.md — BSF THE GYM Membership & WhatsApp Renewal System

## 1. Product Summary
A production system for BSF THE GYM (Gotri-Sevasi Road, Vadodara, Gujarat) to manage members,
memberships, payments, renewals, and automated WhatsApp expiry notifications.

**This is not an attendance system.** No QR entry/exit, no biometrics, no face recognition, no
check-in/check-out. Scope is strictly: members, memberships, payments, expiry detection, WhatsApp
renewal reminders, admin alerts, renewals, and auditability.

## 2. Core Workflow
New member → admin creates member → selects plan (1/3/6/12 months) → system computes start/end
dates → membership ACTIVE → 10 days before expiry: WhatsApp to member + admin alert → on expiry:
status EXPIRED, surfaced as "Renewal Required" → admin renews → new period computed → ACTIVE again.

## 3. Primary Personas
- **SUPER_ADMIN** — full control, including plan pricing and user management.
- **ADMIN** — members, memberships, payments, plans, notifications, reports.
- **STAFF** — front-desk: create members, create memberships, record payments.

## 4. Functional Requirements (by domain)

### 4.1 Membership Plans
- Plans (1/3/6/12 months) are database-driven, never hardcoded in the frontend.
- Plan: id, name, duration, durationUnit, price, description, isActive, timestamps.
- Membership stores `priceAtPurchase`; historical memberships never reflect later price changes.

### 4.2 Members
- Human identity is determined exclusively by Name, Phone Number, WhatsApp Number, and Email.
- Alphanumeric Member IDs (`BSF-XXXXXX`) and Staff IDs (`BSF-STF-XXXX`) are eliminated.
- Fields: id, fullName, profilePhoto, dateOfBirth, gender, phoneNumber, whatsappNumber (separate from phone),
  email, address, emergency contact name/phone, joinDate, notes, status, createdById, timestamps.
- Phone number is never the primary key.
- Indian phone number validation.
- WhatsApp verification indicator (✓ / ⚠) — never claimed true unless actually verified via the
  configured provider.

### 4.3 Memberships (1-to-many per member)
- Historical memberships are immutable and permanently retained.
- Fields: id, membershipReference (`BSF-MEM-YYYY-000001`), memberId, planId, startDate, endDate, duration,
  priceAtPurchase, discount, finalAmount, paymentStatus, membershipStatus, verifiedById, verifiedAt,
  rejectionReason, timestamps.
- membershipStatus: PENDING_VERIFICATION, ACTIVE, EXPIRING_SOON, EXPIRED, REJECTED, CANCELLED, PAUSED.
- paymentStatus: PENDING_VERIFICATION, VERIFIED, REJECTED, PENDING, PARTIAL, PAID, REFUNDED.
- Admin Payment Verification Gate: Staff creations enter PENDING_VERIFICATION until reviewed and approved
  by an Admin or Super Admin. Self-approval by staff is prohibited.

### 4.4 Date Calculation
- All calculated server-side, in `Asia/Kolkata`, never trusted from frontend.
- Inclusive/exclusive rule documented in DECISIONS.md and applied identically everywhere.

### 4.5 Renewals
- If current membership still active: new start = current end + 1 day (no overlap).
- If expired: new start = renewal date (or admin override).
- Manual start-date override requires confirmation + AuditLog entry (old value, new value, actor).

### 4.6 Expiry Engine
- Centralized service computes ACTIVE / EXPIRING_SOON (10 days out) / EXPIRED.
- Daily scheduled job in Asia/Kolkata; no manual status flips required.

### 4.7 WhatsApp Notifications
- Exactly 10 days before expiry: automated WhatsApp reminder to member's WhatsApp number, plus an
  internal admin notification, sent through a real provider abstraction (see ARCHITECTURE.md).
- No fake "sent successfully" states. Delivery failures are recorded, not hidden.
- Idempotency key: `membershipId + notificationType + triggerDate` — never double-sent even if the
  job runs more than once.
- Manual reminder button available, recorded separately from automated ones, protected against
  accidental double-click duplication.

### 4.8 Payments & Receipts
- Payment status is independent of membership status (e.g. ACTIVE membership + PARTIAL payment).
- Payment methods: CASH, UPI, CARD, BANK_TRANSFER, OTHER.
- Receipts: viewable, printable, downloadable PDF, unique receipt number.

### 4.9 Admin Dashboard
- KPIs: total members, active, expiring soon, expired, new members, monthly revenue.
- "Upcoming Expirations" table sorted by nearest expiry.
- "Today's Attention" summary (expired count, expiring-soon count, pending payments, renewed
  today).

### 4.10 Notification Center
- Sections: URGENT / WARNING / INFO. Mark as read, filter, jump to member/membership.

### 4.11 Reports
- Members (total/active/expired), renewals, renewal rate, revenue by month/plan, payment method
  mix, upcoming expirations, WhatsApp success/failure rate. Date filters + CSV export.

## 5. Non-Functional Requirements
- Server is the source of truth for membership status and dates — never the frontend.
- Real authentication and server-side RBAC (no frontend-only role selector).
- Full audit trail on administrative actions.
- Mobile-responsive admin UI (cards/lists, not shrunk desktop tables).
- All business-critical logic covered by automated tests.

## 6. Explicitly Out of Scope
QR entry/exit, biometric or face-recognition attendance, gym access control, AI workout
generation, diet planning, trainer marketplace, social feed, gamification — unless requested later.

## 7. Acceptance Criteria
See section 42 of the original specification / `DECISIONS.md` "Acceptance Criteria" appendix for
the full checklist (member creation, plan selection, auto date calc, 10-day WhatsApp trigger,
duplicate protection, renewal without overlap, immutable history, receipts, audit logs, RBAC,
job observability, mobile support, no QR/attendance features, no fake integrations, no exposed
credentials).
