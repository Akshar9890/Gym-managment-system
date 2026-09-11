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

  const user = await prisma.user.findUnique({
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

  if (!user) {
    redirect("/login");
  }

  return (
    <SettingsClient
      initialUser={{
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profilePhoto: user.profilePhoto,
        lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
        createdAt: user.createdAt.toISOString(),
      }}
    />
  );
}
