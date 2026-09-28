// app/api/check-ins/route.ts — Member Attendance Check-In API
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { Permission, requirePermission } from "@/lib/rbac";
import { normalizeCalendarDate } from "@/lib/services/MembershipDateService";
import { writeAuditLog, AuditAction } from "@/lib/auth/audit";

const CreateCheckInSchema = z.object({
  memberId: z.string().min(1, "Member ID is required"),
  notes: z.string().max(255).optional().nullable(),
  checkInDate: z.string().optional(), // YYYY-MM-DD, defaults to today in Asia/Kolkata
  checkInTime: z.string().optional(), // ISO string if recorded offline
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    requirePermission(session.role, Permission.READ_CHECK_INS);

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    const memberId = searchParams.get("memberId");

    const where: any = {};

    if (dateParam) {
      where.checkInDate = normalizeCalendarDate(dateParam);
    } else if (!memberId) {
      // Default to today's check-ins if no filter passed
      where.checkInDate = normalizeCalendarDate(new Date());
    }

    if (memberId) {
      where.memberId = memberId;
    }

    const checkIns = await prisma.checkIn.findMany({
      where,
      include: {
        member: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
            profilePhoto: true,
            status: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { checkInTime: "desc" },
      take: 100,
    });

    return NextResponse.json({
      success: true,
      data: checkIns,
      count: checkIns.length,
    });
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (error.status === 403) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    requirePermission(session.role, Permission.CHECK_IN_MEMBER);

    const body = await req.json();
    const parsed = CreateCheckInSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { memberId, notes, checkInDate: reqDate, checkInTime: reqTime } = parsed.data;

    // Verify member exists
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { id: true, fullName: true, status: true },
    });

    if (!member) {
      return NextResponse.json({ success: false, error: "Member not found" }, { status: 404 });
    }

    // Determine normalized civil date in Asia/Kolkata
    const targetDate = reqDate
      ? normalizeCalendarDate(reqDate)
      : normalizeCalendarDate(new Date());

    const exactTime = reqTime ? new Date(reqTime) : new Date();

    // Idempotent upsert: check if already checked in today
    const existing = await prisma.checkIn.findUnique({
      where: {
        daily_member_checkin: {
          memberId,
          checkInDate: targetDate,
        },
      },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        alreadyCheckedIn: true,
        message: `${member.fullName} is already checked in for today`,
        data: existing,
      });
    }

    const newCheckIn = await prisma.checkIn.create({
      data: {
        memberId,
        checkInDate: targetDate,
        checkInTime: exactTime,
        createdById: session.userId,
        notes: notes || null,
      },
      include: {
        member: {
          select: { id: true, fullName: true, phoneNumber: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Write audit log
    await writeAuditLog({
      userId: session.userId,
      action: "CHECK_IN_MEMBER" as AuditAction,
      entityType: "CheckIn",
      entityId: newCheckIn.id,
      newValues: {
        memberId,
        memberName: member.fullName,
        checkInDate: targetDate.toISOString(),
      },
    });

    return NextResponse.json(
      {
        success: true,
        alreadyCheckedIn: false,
        message: `${member.fullName} checked in successfully`,
        data: newCheckIn,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (error.status === 403) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
