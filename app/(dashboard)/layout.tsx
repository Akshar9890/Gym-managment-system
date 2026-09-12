// app/(dashboard)/layout.tsx — Shared dashboard layout with DevModeBanner, Sidebar, Header
import React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { DevModeBanner } from "@/components/layout/DevModeBanner";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session.isLoggedIn) {
    redirect("/login");
  }

  const user = {
    id: session.userId,
    email: session.email,
    name: session.name,
    role: session.role,
    profilePhoto: session.profilePhoto || null,
  };

  return (
    <div className="min-h-screen bg-[#0B0C0E] text-[#F9FAFB] flex flex-col">
      <DevModeBanner />
      <DashboardShell user={user}>
        {children}
      </DashboardShell>
    </div>
  );
}
