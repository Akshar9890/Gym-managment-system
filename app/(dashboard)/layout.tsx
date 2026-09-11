// app/(dashboard)/layout.tsx — Shared dashboard layout with DevModeBanner, Sidebar, Header
import React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { DevModeBanner } from "@/components/layout/DevModeBanner";

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
      <div className="flex flex-1 min-h-0">
        <Sidebar userRole={user.role} userName={user.name} />
        <div className="flex-1 flex flex-col min-w-0">
          <Header user={user} />
          <main className="flex-1 p-6 sm:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
