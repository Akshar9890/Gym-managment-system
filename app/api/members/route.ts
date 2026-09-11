// app/api/members/route.ts — Members list and creation API
// Supports pagination, search, status filtering, and atomic member+membership+payment creation.
// Strictly identifies members by Name, Phone, WhatsApp, and Email. No Member ID.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { Permission, requirePermission } from "@/lib/rbac";
import { writeAuditLog, AuditAction } from "@/lib/auth/audit";
import { isValidIndianPhone, normalizeIndianPhone } from "@/lib/validation/indian-phone";
import {
  getNextMembershipReference,
  getNextReceiptNumber,
} from "@/lib/services/ReferenceService";
import { calculateEndDate, normalizeCalendarDate } from "@/lib/services/MembershipDateService";
import { todayInKolkata } from "@/lib/utils";
import { Gender, MemberStatus, MembershipStatus, PaymentMethod, PaymentStatus } from "@prisma/client";

const CreateMemberSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(100),
  phoneNumber: z.string().refine(isValidIndianPhone, {
    message: "Invalid Indian mobile number (must be 10 digits starting with 6-9)",
  }),
  whatsappNumber: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  profilePhoto: z.string().optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  gender: z.nativeEnum(Gender).optional().nullable(),
  address: z.string().max(255).optional().nullable(),
  emergencyContactName: z.string().max(100).optional().nullable(),
  emergencyContactPhone: z.string().optional().nullable(),
  joinDate: z.string().optional(),
  notes: z.string().max(1000).optional().nullable(),

  // Optional atomic initial membership creation
  initialMembership: z.object({
    planId: z.string().min(1, "Plan ID required"),
    startDate: z.string().optional(),
    paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
    amountPaid: z.number().min(0, "Amount paid cannot be negative").default(0),
    discountAmount: z.number().min(0).default(0),
    discount: z.number().min(0).optional(),
    paymentNotes: z.string().max(500).optional().nullable(),
    paymentProof: z.string().optional().nullable(),
    transactionReference: z.string().max(100).optional().nullable(),
    initialPayment: z.object({
      amount: z.number().min(0).optional(),
      paymentMethod: z.nativeEnum(PaymentMethod).optional(),
      notes: z.string().max(500).optional().nullable(),
      paymentProof: z.string().optional().nullable(),
      transactionReference: z.string().max(100).optional().nullable(),
    }).optional(),
  }).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    requirePermission(session.role, Permission.READ_MEMBER);

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const search = searchParams.get("search")?.trim();
    const statusFilter = searchParams.get("status") as MembershipStatus | null;
    const planId = searchParams.get("planId");

    const where: any = {};

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { phoneNumber: { contains: search } },
        { whatsappNumber: { contains: search } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    if (statusFilter) {
      where.memberships = {
        some: {
          membershipStatus: statusFilter,
        },
      };
    }

    if (planId) {
      where.memberships = {
        ...where.memberships,
        some: {
          ...where.memberships?.some,
          planId: planId,
        },
      };
    }

    const [total, members] = await Promise.all([
      prisma.member.count({ where }),
      prisma.member.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true, role: true },
          },
          memberships: {
            orderBy: { startDate: "desc" },
            take: 1,
            include: {
              plan: true,
              createdBy: {
                select: { id: true, name: true, email: true, role: true },
              },
              payments: {
                orderBy: { paidAt: "desc" },
                take: 1,
              },
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: members,
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

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    requirePermission(session.role, Permission.CREATE_MEMBER);

    const body = await req.json();
    const parsed = CreateMemberSchema.safeParse(body);

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const firstErrorMessage = Object.values(fieldErrors).flat()[0] || "Invalid input";
      return NextResponse.json(
        { success: false, error: firstErrorMessage, errors: fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const normalizedPhone = normalizeIndianPhone(data.phoneNumber) || data.phoneNumber;
    const normalizedWhatsApp = data.whatsappNumber ? (normalizeIndianPhone(data.whatsappNumber) || data.whatsappNumber) : normalizedPhone;
    const normalizedEmergency = data.emergencyContactPhone ? (normalizeIndianPhone(data.emergencyContactPhone) || data.emergencyContactPhone) : null;
    const memberJoinDate = data.joinDate ? normalizeCalendarDate(data.joinDate) : todayInKolkata();

    const isStaff = session.role === "STAFF";

    // Atomic transaction for Member + Optional Membership + Optional Payment
    const result = await prisma.$transaction(async (tx) => {
      const member = await tx.member.create({
        data: {
          fullName: data.fullName,
          profilePhoto: data.profilePhoto || null,
          phoneNumber: normalizedPhone,
          whatsappNumber: normalizedWhatsApp,
          email: data.email || null,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
          gender: data.gender || null,
          address: data.address || null,
          emergencyContactName: data.emergencyContactName || null,
          emergencyContactPhone: normalizedEmergency,
          joinDate: memberJoinDate,
          notes: data.notes || null,
          status: MemberStatus.ACTIVE,
          createdById: session.userId,
        },
      });

      let membershipRecord = null;
      let paymentRecord = null;

      if (data.initialMembership) {
        const initial = data.initialMembership;
        const plan = await tx.membershipPlan.findUnique({
          where: { id: initial.planId },
        });

        if (!plan) {
          throw new Error("Specified membership plan not found");
        }

        const startDate = initial.startDate
          ? normalizeCalendarDate(initial.startDate)
          : memberJoinDate;

        const endDate = calculateEndDate(startDate, {
          durationMonths: plan.durationMonths,
        });

        const planPrice = plan.price.toNumber();
        const discount = initial.discountAmount || initial.discount || 0;
        const finalPrice = Math.max(0, planPrice - discount);
        const amountPaid = initial.amountPaid !== undefined && initial.amountPaid !== null
          ? initial.amountPaid
          : (initial.initialPayment?.amount ?? 0);
        const pMethod = initial.paymentMethod || initial.initialPayment?.paymentMethod || PaymentMethod.CASH;
        const pNotes = initial.paymentNotes || initial.initialPayment?.notes || null;
        const pProof = initial.paymentProof || initial.initialPayment?.paymentProof || null;
        const pTransRef = initial.transactionReference || initial.initialPayment?.transactionReference || null;

        let membershipStatus: MembershipStatus;
        let paymentStatus: PaymentStatus;
        let verifiedById: string | null = null;
        let verifiedAt: Date | null = null;

        if (isStaff) {
          membershipStatus = MembershipStatus.PENDING_VERIFICATION;
          paymentStatus = PaymentStatus.PENDING_VERIFICATION;
        } else {
          membershipStatus = MembershipStatus.ACTIVE;
          verifiedById = session.userId;
          verifiedAt = new Date();
          if (amountPaid >= finalPrice) {
            paymentStatus = PaymentStatus.PAID;
          } else if (amountPaid > 0) {
            paymentStatus = PaymentStatus.PARTIAL;
          } else {
            paymentStatus = PaymentStatus.PENDING;
          }
        }

        const membershipReference = await getNextMembershipReference(tx as any);

        membershipRecord = await tx.membership.create({
          data: {
            membershipReference,
            memberId: member.id,
            planId: plan.id,
            startDate,
            endDate,
            durationMonths: plan.durationMonths,
            priceAtPurchase: plan.price, // Lock in price
            discount: discount,
            finalAmount: finalPrice,
            membershipStatus,
            paymentStatus,
            verifiedById,
            verifiedAt,
            createdById: session.userId,
          },
        });

        if (amountPaid > 0) {
          const nextReceiptNumber = await getNextReceiptNumber(tx as any);

          paymentRecord = await tx.payment.create({
            data: {
              memberId: member.id,
              membershipId: membershipRecord.id,
              receivedById: session.userId,
              amount: amountPaid,
              paymentMethod: pMethod,
              paymentStatus,
              paymentProof: pProof,
              transactionReference: pTransRef,
              verifiedById,
              verifiedAt,
              paidAt: new Date(),
              receiptNumber: nextReceiptNumber,
              notes: pNotes,
            },
          });
        }
      }

      return { member, membership: membershipRecord, payment: paymentRecord };
    });

    // Write audit log
    await writeAuditLog({
      userId: session.userId,
      action: AuditAction.CREATE_MEMBER,
      entityType: "Member",
      entityId: result.member.id,
      newValues: {
        fullName: result.member.fullName,
        phoneNumber: result.member.phoneNumber,
        hasInitialMembership: !!result.membership,
        membershipReference: result.membership?.membershipReference,
      },
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    if (error.status === 401) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    if (error.status === 403) return NextResponse.json({ success: false, error: "Forbidden: insufficient permissions" }, { status: 403 });
    return NextResponse.json({ success: false, error: error.message || "Failed to create member" }, { status: 500 });
  }
}
