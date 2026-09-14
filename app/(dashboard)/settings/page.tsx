// app/(dashboard)/settings/page.tsx — User and Admin Settings Page
import React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { SettingsClient } from "@/components/settings/SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) {
    redirect("/login");
  }

  let user = null;
  try {
    user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        profilePhoto: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
  } catch (err) {
    console.error("SettingsPage user fetch error:", err);
  }

  const initialUser = user
    ? {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profilePhoto: user.profilePhoto,
        lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
        createdAt: user.createdAt.toISOString(),
      }
    : {
        id: session.userId,
        name: session.name || "Admin",
        email: session.email || "admin@bsfgym.com",
        phone: null,
        role: session.role || "SUPER_ADMIN",
        profilePhoto: session.profilePhoto || null,
        lastLoginAt: null,
        createdAt: new Date().toISOString(),
      };

  return <SettingsClient initialUser={initialUser} />;
}
