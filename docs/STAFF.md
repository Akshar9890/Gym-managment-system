# STAFF.md — BSF THE GYM Staff Management, Payment Verification & Performance System

## 1. System Overview
The Staff Management and Performance System enables front-desk operations at BSF THE GYM. Operational staff manage day-to-day member onboarding, membership renewals, payment collection, proof attachments, and WhatsApp reminders, while administrators verify payments, track staff productivity, and audit operational revenue.

---

## 2. Strict ID Architecture Policy
- **Permanent Removal of Human IDs**:
  - Member IDs (`BSF-XXXXXX`) and Staff IDs (`BSF-STF-XXXX`) have been **permanently eliminated** from the Prisma schema, APIs, frontend UI displays, CSV exports, receipts, and audit logs.
  - Human identity is determined exclusively by Name, Phone Number, WhatsApp Number, and Email.
  - Staff log in exclusively using **Email + Password**.
- **Sequential Transaction References Retained**:
  - **Membership Reference**: `BSF-MEM-YYYY-000001` (year-aware sequential transaction reference).
  - **Receipt Number**: `BSF-RCP-YYYY-000001` (year-aware sequential receipt reference).

---

## 3. Staff Roles & Server-Side RBAC

### Allowed Permissions (`STAFF`)
- **Login**: Authenticate directly with Email / Gmail address (e.g. `staff@bsfgym.com`) + password.
- **Dedicated Staff Dashboard (`/staff`)**: View personal activity metrics (today's and monthly new members, memberships, renewals, verified revenue, expiring memberships, and recent activity).
- **Member Management**: Create new members, search members by name/phone/staff, edit member details.
- **Membership Operations**: Create memberships, renew memberships, view membership history (staff submissions enter `PENDING_VERIFICATION`).
- **Financial Recording & Proof Attachment**: Record payments with optional proof image/camera capture and transaction reference (staff payments enter `PENDING_VERIFICATION`).
- **Receipts**: View receipts (draft receipts for pending payments display a watermark banner).
- **WhatsApp Notifications**: Send manual renewal reminders and view notification logs.
- **Performance**: View own personal performance metrics.

### Denied Permissions (`STAFF` Strictly Denied)
- Cannot verify payments (`VERIFY_PAYMENT` permission is strictly Admin / Super Admin only).
- Cannot create Admin or Super Admin accounts.
- Cannot create other Staff accounts (`MANAGE_STAFF` required).
- Cannot change user roles or promote themselves.
- Cannot view or reset other staff credentials.
- Cannot access `/staff-management` or administrative configuration.
- Cannot delete or tamper with Audit Logs.
- Cannot permanently delete members or financial records.

All permissions are strictly verified server-side in API routes and server actions using `requirePermission()`.

---

## 4. Admin Payment Verification Workflow & Verification Gate

1. **Staff Recording Gate**:
   - When a Staff member creates a membership or renewal with payment, the records are created with:
     - `membership.membershipStatus = PENDING_VERIFICATION`
     - `payment.paymentStatus = PENDING_VERIFICATION`
2. **Payment Proof Attachment**:
   - Staff attach payment proof via drag-and-drop file upload (JPG, PNG, WEBP, PDF up to 10MB) or device camera capture (`getUserMedia`).
   - Staff provide optional Transaction / UPI Reference # (UTR / Cheque #).
3. **Verification Queue (`/payment-verification`)**:
   - Admin and Super Admin access the verification queue to inspect pending submissions, view proof media full-size, and audit payment details.
4. **Self-Approval Protection**:
   - Staff cannot approve payments they recorded (`payment.receivedById !== session.userId`).
5. **Approval Action (`APPROVE`)**:
   - Updates `paymentStatus: VERIFIED`, records `verifiedById` and `verifiedAt`.
   - Activates membership: `membershipStatus: ACTIVE` (and resolves any advance renewal timing).
6. **Rejection Action (`REJECT`)**:
   - Requires a mandatory rejection reason (>= 3 characters).
   - Transitions `paymentStatus: REJECTED` and `membershipStatus: REJECTED` with audit trail.

---

## 5. Staff Attribution & Performance Calculations

Every operational mutation stores the authenticated staff member's ID:
- **`Member.createdById`**: Records which staff or admin registered the member.
- **`Membership.createdById`**: Records which staff or admin created the membership or renewal.
- **`Payment.receivedById`**: Records which staff or admin collected and recorded the payment.
- **`AuditLog.userId`**: Immutable audit entry identifying the staff actor.

### Deactivation & Historical Preservation:
- Staff records are **never permanently deleted**.
- Deactivating a staff member sets `isActive: false`, immediately preventing login.
- All historical memberships, renewals, receipts, and audit logs retain their original `createdById` and `receivedById` forever.

### Performance Definitions:
- **Timezone**: All date math and boundaries use `Asia/Kolkata`.
- **New Members**: Members created by the staff member in the given period (excluding renewals).
- **Memberships Created**: Total membership records created with `createdById` in the period.
- **Renewals**: Membership records created that extend existing memberships.
- **Revenue**: Actual sum of **PAID** or **VERIFIED** payments received by the staff member in the period. Unverified, pending, or rejected amounts are excluded to prevent unverified revenue leakage.
- **Average Membership Value**: Total Confirmed Revenue ÷ Memberships Created.

---

## 6. Password Reset & Security

- Admins can reset staff passwords via `/api/staff/[id]/reset-password`.
- Plaintext passwords are never stored, logged, or returned in API responses.
- Passwords are encrypted using salted bcrypt hashes.
- Staff login uses case-insensitive email lookup with whitespace trimming.
