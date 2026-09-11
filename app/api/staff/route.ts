// app/api/staff/route.ts — Staff Management CRUD API
// Accessible only to ADMIN and SUPER_ADMIN.
// Handles staff listing with aggregate performance, and secure staff account creation with auto-generated Staff IDs.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { Permission, requirePermission } from "@/lib/rbac";
import { isValidIndianPhone, normalizeIndianPhone } from "@/lib/validation/indian-phone";
import { writeAuditLog, AuditAction } from "@/lib/auth/audit";

const CreateStaffSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
    phone: z.string().trim().refine(isValidIndianPhone, {
      message: "Please enter a valid 10-digit Indian phone number starting with 6-9",
    }),
    email: z.string().trim().email("Invalid email address"),
    profilePhoto: z.string().optional().nullable(),
    role: z.enum(["STAFF", "ADMIN"]).default("STAFF"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Password confirmation must be at least 8 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    requirePermission(session.role, Permission.MANAGE_STAFF);

    const staffMembers = await prisma.user.findMany({
      where: {
        role: "STAFF",
      },
      orderBy: [
        { isActive: "desc" },
        { createdAt: "desc" },
      ],
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        profilePhoto: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        membershipsCreated: {
          select: {
            id: true,
            durationMonths: true,
            finalAmount: true,
            paymentStatus: true,
            notes: true,
          },
        },
        paymentsReceived: {
          where: {
            paymentStatus: "VERIFIED",
          },
          select: {
            id: true,
            amount: true,
          },
        },
      },
    });

    let overallTotalRevenue = 0;
    let overallTotalMemberships = 0;
    let activeStaffCount = 0;
    let inactiveStaffCount = 0;

    const data = staffMembers.map((s: any) => {
      if (s.isActive) activeStaffCount++;
      else inactiveStaffCount++;

      const membershipsCount = s.membershipsCreated.length;
      overallTotalMemberships += membershipsCount;

      const renewalsCount = s.membershipsCreated.filter((m: any) =>
        Boolean(m.notes?.toLowerCase().includes("renewal"))
      ).length;

      const revenueGenerated = s.paymentsReceived.reduce(
        (sum: number, p: any) => sum + p.amount.toNumber(),
        0
      );
      overallTotalRevenue += revenueGenerated;

      return {
        id: s.id,
        name: s.name,
        email: s.email,
        phone: s.phone,
        role: s.role,
        isActive: s.isActive,
        lastLoginAt: s.lastLoginAt,
        createdAt: s.createdAt,
        membershipsCount,
        renewalsCount,
        revenueGenerated,
      };
    });

    return NextResponse.json({
      success: true,
      data,
      metrics: {
        totalStaff: staffMembers.length,
        activeStaff: activeStaffCount,
        inactiveStaff: inactiveStaffCount,
        overallTotalRevenue,
        overallTotalMemberships,
      },
    });
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (error.status === 403) {
      return NextResponse.json(
        { success: false, error: "Forbidden: insufficient permissions" },
        { status: 403 }
      );
    }
    console.error("[GET /api/staff]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch staff list" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    requirePermission(session.role, Permission.MANAGE_STAFF);

    const body = await req.json();
    const parsed = CreateStaffSchema.safeParse(body);

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const firstErrorMessage = Object.values(fieldErrors).flat()[0] || "Invalid input";
      return NextResponse.json(
        { success: false, error: firstErrorMessage, errors: fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, phone, role, password } = parsed.data;

    // Hard security rule: Only SUPER_ADMIN can create an ADMIN account
    if (role === "ADMIN" && session.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { success: false, error: "Only a Super Admin can create an Admin account" },
        { status: 403 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedPhone = normalizeIndianPhone(phone) || phone;

    // Check email uniqueness
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "An account with this email address already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newStaff = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        phone: normalizedPhone,
        passwordHash,
        role: role || "STAFF",
        profilePhoto: parsed.data.profilePhoto || null,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        profilePhoto: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Write audit log
    await writeAuditLog({
      userId: session.userId,
      action: AuditAction.CREATE_STAFF,
      entityType: "User",
      entityId: newStaff.id,
      newValues: {
        name: newStaff.name,
        email: newStaff.email,
        role: newStaff.role,
      },
    });

    return NextResponse.json({ success: true, data: newStaff }, { status: 201 });
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (error.status === 403) {
      return NextResponse.json(
        { success: false, error: "Forbidden: insufficient permissions" },
        { status: 403 }
      );
    }
    console.error("[POST /api/staff]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create staff account" },
      { status: 500 }
    );
  }
}
