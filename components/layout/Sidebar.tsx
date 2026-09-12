// components/layout/Sidebar.tsx — Dark luxury athletic navigation sidebar per DESIGN.md
"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  BellRing,
  BarChart3,
  Dumbbell,
  Layers,
  UserCog,
  ChevronRight,
  ShieldCheck,
  Settings,
  X,
} from "lucide-react";

interface SidebarProps {
  userRole?: string;
  userName?: string;
  isMobile?: boolean;
  onClose?: () => void;
}

export function Sidebar({ userRole = "STAFF", isMobile = false, onClose }: SidebarProps) {
  const pathname = usePathname();

  const dashboardHref = userRole === "STAFF" ? "/staff" : "/dashboard";

  const navigation = [
    {
      name: "Dashboard",
      href: dashboardHref,
      icon: LayoutDashboard,
      roles: ["SUPER_ADMIN", "ADMIN", "STAFF"],
    },
    {
      name: "Members",
      href: "/members",
      icon: Users,
      roles: ["SUPER_ADMIN", "ADMIN", "STAFF"],
    },
    {
      name: "Payments & Receipts",
      href: "/payments",
      icon: CreditCard,
      roles: ["SUPER_ADMIN", "ADMIN", "STAFF"],
    },
    {
      name: "Payment Verification",
      href: "/payment-verification",
      icon: ShieldCheck,
      roles: ["SUPER_ADMIN", "ADMIN"],
    },
    {
      name: "Notification Center",
      href: "/notifications",
      icon: BellRing,
      roles: ["SUPER_ADMIN", "ADMIN", "STAFF"],
    },
    {
      name: "Staff Management",
      href: "/staff-management",
      icon: UserCog,
      roles: ["SUPER_ADMIN", "ADMIN"],
    },
    {
      name: "Reports & Analytics",
      href: "/reports",
      icon: BarChart3,
      roles: ["SUPER_ADMIN", "ADMIN"],
    },
    {
      name: "Membership Plans",
      href: "/plans",
      icon: Layers,
      roles: ["SUPER_ADMIN", "ADMIN"],
    },
  ];

  const allowedNav = navigation.filter((item) =>
    item.roles.includes(userRole)
  );

  return (
    <aside
      className={`w-64 bg-[#111316] border-r border-[#252830] flex flex-col shrink-0 ${
        isMobile ? "h-full w-full" : "min-h-screen"
      }`}
    >
      {/* Brand Header */}
      <div className="p-5 border-b border-[#252830] flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Dumbbell className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold font-display text-white tracking-wider leading-tight">
              BSF THE GYM
            </h1>
            <p className="text-[11px] text-gray-500 tracking-tight">
              Gotri-Sevasi Rd, Vadodara
            </p>
          </div>
        </div>

        {isMobile && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#17191E] transition-colors"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav Items */}
      <nav className="p-3 space-y-1 flex-1 overflow-y-auto" aria-label="Main Navigation">
        {allowedNav.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && item.href !== "/staff" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => onClose?.()}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                isActive
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  : "text-gray-400 hover:text-white hover:bg-[#17191E]"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive
                      ? "text-amber-400"
                      : "text-gray-500 group-hover:text-gray-300"
                  }`}
                />
                <span>{item.name}</span>
              </div>
              {isActive && (
                <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Badge */}
      <div className="p-4 border-t border-[#252830] text-[11px] text-gray-500 flex items-center justify-between">
        <span>System Status</span>
        <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Active
        </span>
      </div>
    </aside>
  );
}
