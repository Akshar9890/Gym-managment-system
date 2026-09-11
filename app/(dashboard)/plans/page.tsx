// app/(dashboard)/plans/page.tsx — Plans management server page
import React from "react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { PlansClient, PlanItem } from "@/components/plans/PlansClient";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const session = await getSession();

  const plans = await prisma.membershipPlan.findMany({
    orderBy: { durationMonths: "asc" },
  });

  const planItems: PlanItem[] = plans.map((p: any) => ({
    id: p.id,
    name: p.name,
    durationMonths: p.durationMonths,
    price: Number(p.price),
    description: p.description,
    isActive: p.isActive,
  }));

  return <PlansClient initialPlans={planItems} userRole={session.role} />;
}
