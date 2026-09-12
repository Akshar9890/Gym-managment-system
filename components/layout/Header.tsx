// components/layout/Header.tsx — Global top header with user session & logout
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, User, ShieldCheck, Menu } from "lucide-react";

interface HeaderProps {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    profilePhoto?: string | null;
  };
  onMenuToggle?: () => void;
}

export function Header({ user, onMenuToggle }: HeaderProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    try {
      setLoggingOut(true);
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      router.push("/login");
    } finally {
      setLoggingOut(false);
    }
  }

  const roleColor = {
    SUPER_ADMIN: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    ADMIN: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    STAFF: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  }[user.role] || "bg-gray-500/10 text-gray-400";

  return (
    <header className="h-16 bg-[#111316] border-b border-[#252830] px-3.5 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-2 sm:gap-3">
        {onMenuToggle && (
          <button
            type="button"
            onClick={onMenuToggle}
            className="lg:hidden p-2 -ml-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#17191E] transition-colors"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5 text-amber-400" />
          </button>
        )}
        <span className="text-xs text-gray-500 hidden sm:inline">BSF Portal</span>
        <span className="text-gray-700 hidden sm:inline">•</span>
        <span className="text-xs text-gray-400 font-mono">Vadodara Center</span>
      </div>

      <div className="flex items-center gap-4">
        {/* User Badge - Links to Settings */}
        <Link
          href="/settings"
          className="flex items-center gap-3 hover:opacity-85 transition-opacity group cursor-pointer"
          title="Account Settings & Profile"
        >
          <div className="w-8 h-8 rounded-full bg-[#17191E] border border-[#252830] group-hover:border-amber-500/50 flex items-center justify-center text-gray-300 overflow-hidden shrink-0">
            {user.profilePhoto ? (
              <img
                src={user.profilePhoto}
                alt={user.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-4 h-4" />
            )}
          </div>
          <div className="text-left hidden md:block">
            <div className="text-xs font-semibold text-white flex items-center gap-1.5 group-hover:text-amber-400 transition-colors">
              <span>{user.name}</span>
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-[10px] text-gray-500">{user.email}</div>
          </div>
          <span
            className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${roleColor}`}
          >
            {user.role.replace("_", " ")}
          </span>
        </Link>

        {/* Divider */}
        <div className="h-6 w-px bg-[#252830]" />

        {/* Logout */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-400 px-2.5 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors disabled:opacity-50"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
