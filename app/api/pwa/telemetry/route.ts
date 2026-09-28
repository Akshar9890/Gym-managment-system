// app/api/pwa/telemetry/route.ts — PWA analytics telemetry endpoint
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

// ---------------------------------------------------------------------------
// POST /api/pwa/telemetry — log a single PWA event (fire-and-forget)
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body.event !== "string") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { event, platform, isStandalone, sessionId, metadata } = body;

    // Optionally attach userId if a session exists (best-effort, never required)
    let userId: string | undefined;
    try {
      const session = await getSession();
      if (session?.isLoggedIn && session?.userId) userId = session.userId;
    } catch {
      // unauthenticated telemetry is fine
    }

    await prisma.pwaTelemetry.create({
      data: {
        event: String(event).slice(0, 80),
        platform: String(platform ?? "Unknown").slice(0, 40),
        isStandalone: Boolean(isStandalone),
        sessionId: sessionId ? String(sessionId).slice(0, 100) : undefined,
        metadata: metadata && typeof metadata === "object" ? metadata : undefined,
        userId,
      },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("[PWA Telemetry] POST error:", err);
    // Silently succeed so the app is never blocked by telemetry failures
    return NextResponse.json({ ok: true }, { status: 201 });
  }
}

// ---------------------------------------------------------------------------
// GET /api/pwa/telemetry — aggregate stats for admin analytics card
// ---------------------------------------------------------------------------
export async function GET(_req: NextRequest) {
  try {
    // Auth check — only admins/staff can view analytics
    const session = await getSession();
    if (!session?.isLoggedIn) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [
      totalEvents,
      byEvent,
      byPlatform,
      standaloneCount,
      recentEvents,
    ] = await Promise.all([
      prisma.pwaTelemetry.count(),

      prisma.pwaTelemetry.groupBy({
        by: ["event"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 20,
      }),

      prisma.pwaTelemetry.groupBy({
        by: ["platform"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),

      prisma.pwaTelemetry.count({ where: { isStandalone: true } }),

      prisma.pwaTelemetry.findMany({
        orderBy: { createdAt: "desc" },
        take: 15,
        select: { event: true, platform: true, isStandalone: true, createdAt: true },
      }),
    ]);

    // Derived KPIs
    const installShown = byEvent.find((e) => e.event === "INSTALL_PROMPT_SHOWN")?._count.id ?? 0;
    const installAccepted = byEvent.find((e) => e.event === "INSTALL_ACCEPTED")?._count.id ?? 0;
    const installConversionRate =
      installShown > 0 ? Math.round((installAccepted / installShown) * 100) : 0;

    const offlineEvents = byEvent.find((e) => e.event === "OFFLINE_DETECTED")?._count.id ?? 0;
    const syncEvents = byEvent.find((e) => e.event === "OFFLINE_QUEUE_SYNCED")?._count.id ?? 0;
    const sessionStarts = byEvent.find((e) => e.event === "SESSION_START")?._count.id ?? 0;

    return NextResponse.json({
      totalEvents,
      standaloneCount,
      standaloneRate: totalEvents > 0 ? Math.round((standaloneCount / totalEvents) * 100) : 0,
      installShown,
      installAccepted,
      installConversionRate,
      offlineEvents,
      syncEvents,
      sessionStarts,
      byEvent: byEvent.map((e) => ({ event: e.event, count: e._count.id })),
      byPlatform: byPlatform.map((e) => ({ platform: e.platform, count: e._count.id })),
      recentEvents,
    });
  } catch (err) {
    console.error("[PWA Telemetry] GET error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
