<div align="center">

<img src="https://img.shields.io/badge/BSF_THE_GYM-Management_System-f59e0b?style=for-the-badge&labelColor=111318&color=f59e0b" alt="BSF THE GYM" />

```
██████╗ ███████╗███████╗    ██████╗ ██╗   ██╗███╗   ███╗
██╔══██╗██╔════╝██╔════╝   ██╔════╝ ╚██╗ ██╔╝████╗ ████║
██████╔╝███████╗█████╗     ██║  ███╗ ╚████╔╝ ██╔████╔██║
██╔══██╗╚════██║██╔══╝     ██║   ██║  ╚██╔╝  ██║╚██╔╝██║
██████╔╝███████║██║        ╚██████╔╝   ██║   ██║ ╚═╝ ██║
╚═════╝ ╚══════╝╚═╝         ╚═════╝    ╚═╝   ╚═╝     ╚═╝
```

**A production-grade Gym Management System built for real gyms, by real needs.**

[![Next.js](https://img.shields.io/badge/Next.js_14-black?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docker.com)
[![MIT License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

</div>

---

## ⚡ What is BSF GYM?

BSF GYM is a **full-stack gym management system** designed for small-to-medium gyms that need a fast, reliable, and beautiful internal tool. Forget spreadsheets and WhatsApp groups — manage everything from one place.

> Built with a dark, premium UI — staff love using it, admins trust it.

---

## 🏋️ Features

### 👥 Member Management
- Add members with photo, phone, DOB, address & emergency contact
- Full member profile with membership & payment history
- Search, filter (active / expiring / expired / due balance)
- Member-to-staff attribution — see who added each member

### 📋 Membership Plans
- Flexible plans: **1 Month · 3 Months · 6 Months · 1 Year**
- Admin-controlled plan pricing
- Membership lifecycle: `Pending → Active → Expiring → Expired`
- Automated lifecycle job (runs every 6 hours)

### 💰 Payment System
- Record full, partial, or pending payments
- Attach photo proof (UPI screenshot, cash receipt, etc.)
- **Admin payment verification gate** — memberships activate only after approval
- Rejection with reason + re-submission flow
- PDF receipt generation per payment

### 📲 WhatsApp Reminders
- Automatic reminders **10 days before expiry**
- Manual "Send WhatsApp Reminder" from any member profile
- Dev mode (console log) · Production mode (WhatsApp Business API)

### 👔 Staff Management
- Admin and Staff roles with different permissions
- Staff login via **Email + Password** — no IDs, no usernames
- Admin can add / deactivate / reset staff passwords
- Staff performance tracking (members added, payments recorded)

### ⚙️ Account Settings
- Update profile photo, name, email, and phone
- Secure password change (current password required)
- Works for both Admin and Staff accounts

### 📊 Admin Dashboard
- Live KPI cards: **Total Members · Active · Expiring · Expired · Due Balances**
- Click any KPI card → jump directly to the filtered members list
- Upcoming expirations table (next 10 days)
- Payment verification queue

### 📁 Reports & Audit
- Revenue reports with monthly/plan breakdowns
- Full audit log — every action recorded with actor + timestamp
- Export reports to CSV

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript (strict mode) |
| **Database** | PostgreSQL |
| **ORM** | Prisma 5 |
| **Auth** | iron-session (httpOnly cookie) + bcryptjs |
| **Styling** | Tailwind CSS v3 |
| **Icons** | Lucide React |
| **PDF** | jsPDF |
| **WhatsApp** | WhatsApp Business Cloud API |
| **Container** | Docker + Docker Compose |
| **Testing** | Jest |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL (or use Docker below)

### 1. Clone the repo
```bash
git clone https://github.com/Akshar9890/Gym-managment-system.git
cd Gym-managment-system
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
```bash
cp .env.example .env
```

Edit `.env` with your values:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/bsfgym"
SESSION_SECRET="your-32-char-secret-key-here"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# WhatsApp (leave as "dev" for local testing)
WHATSAPP_PROVIDER="dev"
```

### 4. Set up the database
```bash
npx prisma db push
npx prisma db seed
```

### 5. Run the dev server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

> **Default Admin Login**
> - Email: `admin@bsfgym.com`
> - Password: `admin123`

---

## 🐳 Docker Setup

Spin up the entire stack (PostgreSQL + app) with one command:

```bash
docker-compose up -d
```

---

## 📂 Project Structure

```
bsf-gym/
├── app/
│   ├── (dashboard)/        # Protected pages (dashboard, members, payments…)
│   ├── api/                # All API routes
│   └── login/              # Public login page
├── components/
│   ├── members/            # Member list, profile, add modal, renewal
│   ├── payments/           # Record payment, verification, receipt
│   ├── staff/              # Staff directory & management
│   └── settings/           # Account settings UI
├── lib/
│   ├── auth/               # Session, RBAC, audit log, password utils
│   ├── services/           # Business logic (membership, payment, WhatsApp)
│   └── whatsapp/           # Provider abstraction (dev / production)
├── prisma/
│   └── schema.prisma       # Full database schema
├── docs/                   # PRD, Architecture, Decisions, Design
└── __tests__/              # Jest test suites (11 test files)
```

---

## 🔐 Role-Based Access

| Feature | Admin | Staff |
|---|:---:|:---:|
| Add Members | ✅ | ✅ |
| Record Payments | ✅ | ✅ |
| Verify Payments | ✅ | ❌ |
| Manage Staff | ✅ | ❌ |
| View Reports | ✅ | ❌ |
| Send WhatsApp Reminder | ✅ | ✅ |
| Account Settings | ✅ | ✅ |

---

## 🧪 Tests

```bash
npm test
```

Test suites cover:
- Membership date calculation logic
- Payment verification workflow
- Role-based access control (RBAC)
- Indian phone number validation
- WhatsApp notification service
- Staff management operations
- Report & receipt generation

---

## 🗺 Roadmap

- [ ] Mobile-responsive member check-in kiosk
- [ ] Bulk WhatsApp renewal reminders
- [ ] Multi-gym / branch support
- [ ] Razorpay / UPI online payment collection
- [ ] Member-facing self-service portal

---

## 📄 License

MIT — free to use, modify, and deploy for your gym.

---

<div align="center">

Built with 💪 for **BSF THE GYM**

*"Strong Body. Strong System."*

</div>
