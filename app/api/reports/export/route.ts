// app/api/reports/export/route.ts — CSV export for members, payments, and expirations
// Strictly uses Name, Phone, WhatsApp, and Reference Numbers. No Member ID.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { format } from "date-fns";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "members";

  let csvContent = "";
  let filename = `bsf_${type}_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`;

  if (type === "members") {
    const members = await prisma.member.findMany({
      include: {
        memberships: {
          include: { plan: true },
          orderBy: { endDate: "desc" },
          take: 1,
        },
      },
      orderBy: { fullName: "asc" },
    });

    const headers = [
      "Full Name",
      "Gender",
      "Phone",
      "WhatsApp",
      "WhatsApp Verified",
      "Email",
      "Status",
      "Current Plan",
      "Membership Ref",
      "Plan Start",
      "Plan End",
      "Join Date",
    ];

    const rows = members.map((m: any) => {
      const activeOrLatest = m.memberships[0];
      return [
        `"${m.fullName.replace(/"/g, '""')}"`,
        m.gender || "",
        m.phoneNumber,
        m.whatsappNumber || "",
        m.whatsappVerified ? "YES" : "NO",
        m.email || "",
        m.status,
        activeOrLatest ? `"${activeOrLatest.plan.name}"` : "None",
        activeOrLatest?.membershipReference || "",
        activeOrLatest ? format(new Date(activeOrLatest.startDate), "yyyy-MM-dd") : "",
        activeOrLatest ? format(new Date(activeOrLatest.endDate), "yyyy-MM-dd") : "",
        format(new Date(m.joinDate), "yyyy-MM-dd"),
      ].join(",");
    });

    csvContent = [headers.join(","), ...rows].join("\n");
  } else if (type === "payments") {
    const payments = await prisma.payment.findMany({
      include: {
        member: true,
        membership: { include: { plan: true } },
        receivedBy: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const headers = [
      "Receipt Number",
      "Membership Ref",
      "Date",
      "Member Name",
      "Phone",
      "Plan",
      "Amount",
      "Payment Mode",
      "Payment Status",
      "Received By",
      "Notes",
    ];

    const rows = payments.map((p: any) => [
      p.receiptNumber,
      p.membership?.membershipReference || "",
      format(new Date(p.createdAt), "yyyy-MM-dd HH:mm:ss"),
      `"${p.member.fullName.replace(/"/g, '""')}"`,
      p.member.phoneNumber,
      `"${p.membership.plan.name}"`,
      p.amount,
      p.paymentMethod,
      p.paymentStatus,
      p.receivedBy ? `"${p.receivedBy.name}"` : "Admin",
      `"${(p.notes || "").replace(/"/g, '""')}"`,
    ].join(","));

    csvContent = [headers.join(","), ...rows].join("\n");
  } else if (type === "expirations") {
    const expiring = await prisma.membership.findMany({
      where: {
        membershipStatus: { in: ["EXPIRING_SOON", "EXPIRED"] },
      },
      include: {
        member: true,
        plan: true,
      },
      orderBy: { endDate: "asc" },
    });

    const headers = [
      "Full Name",
      "Phone",
      "WhatsApp",
      "Plan",
      "Membership Ref",
      "Start Date",
      "Expiry Date",
      "Status",
      "Payment Status",
    ];

    const rows = expiring.map((m: any) => [
      `"${m.member.fullName.replace(/"/g, '""')}"`,
      m.member.phoneNumber,
      m.member.whatsappNumber || "",
      `"${m.plan.name}"`,
      m.membershipReference || "",
      format(new Date(m.startDate), "yyyy-MM-dd"),
      format(new Date(m.endDate), "yyyy-MM-dd"),
      m.membershipStatus,
      m.paymentStatus,
    ].join(","));

    csvContent = [headers.join(","), ...rows].join("\n");
  } else {
    return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
  }

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
