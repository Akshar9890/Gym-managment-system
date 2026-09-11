// app/api/notifications/manual-reminder/route.ts — Manual WhatsApp Reminder trigger API

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { Permission, requirePermission } from "@/lib/rbac";
import { sendManualReminder } from "@/lib/services/NotificationService";

const ManualReminderSchema = z.object({
  membershipId: z.string().min(1, "Membership ID required"),
  customNote: z.string().max(300).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    requirePermission(session.role, Permission.SEND_MANUAL_REMINDER);

    const body = await req.json();
    const parsed = ManualReminderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const notification = await sendManualReminder(
      parsed.data.membershipId,
      session.userId,
      parsed.data.customNote
    );

    return NextResponse.json({
      success: true,
      message: "Reminder sent successfully",
      data: notification,
    });
  } catch (error: any) {
    if (error.status === 401) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    if (error.status === 403) return NextResponse.json({ success: false, error: "Forbidden: insufficient permissions" }, { status: 403 });
    return NextResponse.json({ success: false, error: error.message || "Failed to send manual reminder" }, { status: 500 });
  }
}
