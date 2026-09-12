// components/layout/DashboardShell.tsx — Responsive wrapper with mobile drawer & desktop sidebar
"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface DashboardShellProps {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    profilePhoto?: string | null;
  };
  children: React.ReactNode;
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile drawer automatically on page navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Prevent background scrolling when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  return (
    <div className="flex flex-1 min-h-0 relative">
      {/* Desktop Persistent Sidebar (>= 1024px) */}
      <div className="hidden lg:flex shrink-0">
        <Sidebar userRole={user.role} userName={user.name} />
      </div>

      {/* Mobile Drawer Navigation (< 1024px) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-out Sidebar Drawer */}
          <div className="relative z-50 w-72 max-w-[85vw] bg-[#111316] h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
            <Sidebar
              userRole={user.role}
              userName={user.name}
              isMobile
              onClose={() => setMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 w-full">
        <Header
          user={user}
          onMenuToggle={() => setMobileMenuOpen((prev) => !prev)}
        />
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
