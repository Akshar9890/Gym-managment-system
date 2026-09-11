// app/api/notifications/route.ts — Notifications listing API
// Allows staff/admin to view notification history, delivery status, and simulated sends.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { Permission, requirePermission } from "@/lib/rbac";
import { NotificationStatus, NotificationType } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    requirePermission(session.role, Permission.VIEW_NOTIFICATIONS);

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)));
    const skip = (page - 1) * limit;

    const status = searchParams.get("status") as NotificationStatus | null;
    const type = searchParams.get("type") as NotificationType | null;
    const memberId = searchParams.get("memberId");

    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (memberId) where.memberId = memberId;

    const [total, notifications] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          member: {
            select: { id: true, fullName: true, phoneNumber: true, whatsappNumber: true },
          },
          membership: {
            select: {
              id: true,
              membershipReference: true,
              startDate: true,
              endDate: true,
              plan: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: notifications,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    if (error.status === 401) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    if (error.status === 403) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 });
  }
}
