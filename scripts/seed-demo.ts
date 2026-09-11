// scripts/seed-demo.ts — Seed rich, production-like demo data for testing all flows
// Run: npx tsx scripts/seed-demo.ts
import { PrismaClient } from "@prisma/client";
import { addDays, subDays } from "date-fns";
import { todayInKolkata } from "../lib/utils";

const prisma = new PrismaClient();

function calculateEnd(startDate: Date, durationMonths: number): Date {
  const d = new Date(startDate);
  d.setMonth(d.getMonth() + durationMonths);
  d.setDate(d.getDate() - 1);
  return d;
}

async function getOrCreateMember(data: {
  fullName: string;
  phoneNumber: string;
  whatsappNumber?: string;
  whatsappVerified?: boolean;
  email?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  address?: string;
  joinDate: Date;
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
}) {
  const existing = await prisma.member.findFirst({
    where: { phoneNumber: data.phoneNumber },
  });
  if (existing) {
    return existing;
  }
  return prisma.member.create({
    data: {
      fullName: data.fullName,
      phoneNumber: data.phoneNumber,
      whatsappNumber: data.whatsappNumber || data.phoneNumber,
      whatsappVerified: data.whatsappVerified ?? false,
      email: data.email,
      gender: data.gender,
      address: data.address,
      joinDate: data.joinDate,
      status: data.status || "ACTIVE",
    },
  });
}

async function main() {
  console.log("🌱 Seeding rich demo data for BSF THE GYM...");

  let admin = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });
  let staff = await prisma.user.findFirst({ where: { role: "STAFF" } });

  if (!admin) {
    throw new Error("Admin user not found. Run prisma/seed.ts first.");
  }

  if (!staff) {
    const bcrypt = await import("bcryptjs");
    staff = await prisma.user.create({
      data: {
        email: "staff@bsfgym.com",
        name: "Demo Staff",
        role: "STAFF",
        passwordHash: await bcrypt.hash("Staff@1234", 10),
      },
    });
  }

  const monthly = (await prisma.membershipPlan.findFirst({ where: { durationMonths: 1 } })) || (await prisma.membershipPlan.findFirst({ where: { name: "1 Month" } }));
  const quarterly = (await prisma.membershipPlan.findFirst({ where: { durationMonths: 3 } })) || (await prisma.membershipPlan.findFirst({ where: { name: "3 Months" } }));
  const halfYearly = (await prisma.membershipPlan.findFirst({ where: { durationMonths: 6 } })) || (await prisma.membershipPlan.findFirst({ where: { name: "6 Months" } }));
  const annual = (await prisma.membershipPlan.findFirst({ where: { durationMonths: 12 } })) || (await prisma.membershipPlan.findFirst({ where: { name: "1 Year" } }));

  if (!monthly || !quarterly || !halfYearly || !annual) {
    throw new Error("Base plans not found. Run prisma/seed.ts first.");
  }

  const today = todayInKolkata();

  // Demo Member 1: Aarav Patel — ACTIVE, Monthly
  const m1 = await getOrCreateMember({
    fullName: "Aarav Patel",
    phoneNumber: "+919876543210",
    whatsappNumber: "+919876543210",
    whatsappVerified: true,
    email: "aarav.patel@gmail.com",
    gender: "MALE",
    address: "Gotri Road, Vadodara",
    joinDate: subDays(today, 15),
    status: "ACTIVE",
  });

  const m1Start = subDays(today, 15);
  const m1End = calculateEnd(m1Start, 1);
  const m1Ship = await prisma.membership.create({
    data: {
      membershipReference: "BSF-MEM-2026-000101",
      memberId: m1.id,
      planId: monthly.id,
      startDate: m1Start,
      endDate: m1End,
      durationMonths: 1,
      priceAtPurchase: monthly.price,
      discount: 0,
      finalAmount: monthly.price,
      membershipStatus: "ACTIVE",
      paymentStatus: "PAID",
    },
  });

  await prisma.payment.create({
    data: {
      membershipId: m1Ship.id,
      memberId: m1.id,
      receivedById: admin.id,
      amount: monthly.price,
      paymentMethod: "UPI",
      paymentStatus: "PAID",
      receiptNumber: "BSF-RCP-2026-000101",
      notes: "UPI payment via GPay",
      paidAt: m1Start,
    },
  });

  // Demo Member 2: Priya Sharma — EXPIRING SOON (exactly 10 days left!)
  const m2 = await getOrCreateMember({
    fullName: "Priya Sharma",
    phoneNumber: "+919825123456",
    whatsappNumber: "+919825123456",
    whatsappVerified: true,
    email: "priya.s@yahoo.com",
    gender: "FEMALE",
    address: "Sevasi, Vadodara",
    joinDate: subDays(today, 20),
    status: "ACTIVE",
  });

  // 1-month plan ending in 10 days
  const m2End = addDays(today, 10);
  const m2Start = subDays(m2End, 29);
  const m2Ship = await prisma.membership.create({
    data: {
      membershipReference: "BSF-MEM-2026-000102",
      memberId: m2.id,
      planId: monthly.id,
      startDate: m2Start,
      endDate: m2End,
      durationMonths: 1,
      priceAtPurchase: monthly.price,
      discount: 100,
      finalAmount: 1100,
      membershipStatus: "EXPIRING_SOON",
      paymentStatus: "PAID",
    },
  });

  await prisma.payment.create({
    data: {
      membershipId: m2Ship.id,
      memberId: m2.id,
      receivedById: staff.id,
      amount: 1100,
      paymentMethod: "CASH",
      paymentStatus: "PAID",
      receiptNumber: "BSF-RCP-2026-000102",
      paidAt: m2Start,
    },
  });

  // Demo Member 3: Rohan Mehta — EXPIRED (expired 5 days ago)
  const m3 = await getOrCreateMember({
    fullName: "Rohan Mehta",
    phoneNumber: "+919712345678",
    whatsappNumber: "+919712345678",
    whatsappVerified: false,
    gender: "MALE",
    address: "Alkapuri, Vadodara",
    joinDate: subDays(today, 95),
    status: "ACTIVE",
  });

  const m3End = subDays(today, 5);
  const m3Start = subDays(m3End, 89);
  const m3Ship = await prisma.membership.create({
    data: {
      membershipReference: "BSF-MEM-2026-000103",
      memberId: m3.id,
      planId: quarterly.id,
      startDate: m3Start,
      endDate: m3End,
      durationMonths: 3,
      priceAtPurchase: quarterly.price,
      discount: 0,
      finalAmount: quarterly.price,
      membershipStatus: "EXPIRED",
      paymentStatus: "PAID",
    },
  });

  await prisma.payment.create({
    data: {
      membershipId: m3Ship.id,
      memberId: m3.id,
      receivedById: admin.id,
      amount: quarterly.price,
      paymentMethod: "UPI",
      paymentStatus: "PAID",
      receiptNumber: "BSF-RCP-2026-000103",
      paidAt: m3Start,
    },
  });

  // Notification log for Rohan
  await prisma.notification.create({
    data: {
      membershipId: m3Ship.id,
      memberId: m3.id,
      type: "EXPIRY_REMINDER_10_DAY",
      channel: "WHATSAPP",
      status: "SENT",
      recipientNumber: m3.phoneNumber,
      triggerDate: subDays(m3End, 10),
      sentAt: subDays(m3End, 10),
      providerMessageId: "DEV-TPL-DEMO-ROHAN-1",
      metadata: { template: "membership_expiry_10_days", isDevMode: true },
    },
  });

  // Demo Member 4: Neha Desai — ACTIVE with PARTIAL payment
  const m4 = await getOrCreateMember({
    fullName: "Neha Desai",
    phoneNumber: "+919909012345",
    whatsappNumber: "+919909012345",
    whatsappVerified: true,
    email: "neha.desai@outlook.com",
    gender: "FEMALE",
    address: "Vasna-Bhayli Road, Vadodara",
    joinDate: subDays(today, 2),
    status: "ACTIVE",
  });

  const m4Start = subDays(today, 2);
  const m4End = calculateEnd(m4Start, 6);
  const m4Ship = await prisma.membership.create({
    data: {
      membershipReference: "BSF-MEM-2026-000104",
      memberId: m4.id,
      planId: halfYearly.id,
      startDate: m4Start,
      endDate: m4End,
      durationMonths: 6,
      priceAtPurchase: halfYearly.price,
      discount: 0,
      finalAmount: halfYearly.price, // 5500
      membershipStatus: "ACTIVE",
      paymentStatus: "PARTIAL",
    },
  });

  await prisma.payment.create({
    data: {
      membershipId: m4Ship.id,
      memberId: m4.id,
      receivedById: staff.id,
      amount: 3000,
      paymentMethod: "UPI",
      paymentStatus: "PARTIAL",
      receiptNumber: "BSF-RCP-2026-000104",
      notes: "Deposit paid. Balance 2,500 due next week.",
      paidAt: m4Start,
    },
  });

  // Demo Member 5: Vikram Joshi — PAUSED (medical reason)
  const m5 = await getOrCreateMember({
    fullName: "Vikram Joshi",
    phoneNumber: "+919638527410",
    whatsappNumber: "+919638527410",
    whatsappVerified: true,
    gender: "MALE",
    address: "Gotri-Sevasi Road, Vadodara",
    joinDate: subDays(today, 40),
    status: "ACTIVE",
  });

  const m5Start = subDays(today, 40);
  const m5End = calculateEnd(m5Start, 12);
  await prisma.membership.create({
    data: {
      membershipReference: "BSF-MEM-2026-000105",
      memberId: m5.id,
      planId: annual.id,
      startDate: m5Start,
      endDate: m5End,
      durationMonths: 12,
      priceAtPurchase: annual.price,
      discount: 500,
      finalAmount: 9499,
      membershipStatus: "PAUSED",
      paymentStatus: "PAID",
      notes: "Paused due to shoulder rehabilitation per doctor letter.",
    },
  });

  console.log("✅ Rich demo dataset seeded successfully!");
  console.log("  - 5 Members (Active, Expiring in 10d, Expired, Partial Payment, Paused)");
  console.log("  - 4 Payments with unique receipt numbers");
  console.log("  - Simulated WhatsApp notifications");
}

main()
  .catch((e) => {
    console.error("Demo seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
