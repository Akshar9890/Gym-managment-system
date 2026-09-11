// app/(dashboard)/payment-verification/page.tsx — Admin Payment Verification Queue
import React from "react";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { PaymentVerificationClient } from "@/components/payments/PaymentVerificationClient";

export const dynamic = "force-dynamic";

export default async function PaymentVerificationPage() {
  let session;
  try {
    session = await requireSession();
  } catch {
    redirect("/login");
  }

  // Only Admin and Super Admin can access Payment Verification
  if (session.role === "STAFF") {
    redirect("/staff");
  }

  return <PaymentVerificationClient currentUserId={session.userId} />;
}
