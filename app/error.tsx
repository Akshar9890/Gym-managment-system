"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function RootErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application root error caught by boundary:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0B0C0E] text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#17191E] border border-amber-500/20 rounded-2xl p-8 text-center shadow-2xl relative">
        <div className="w-14 h-14 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-5">
          <AlertTriangle className="w-7 h-7 text-amber-400" />
        </div>

        <h2 className="text-xl font-bold font-display text-white mb-2">
          Something went wrong
        </h2>
        <p className="text-xs text-gray-400 mb-6 leading-relaxed">
          An unexpected error occurred. Please click below to refresh the application.
        </p>

        {error?.digest && (
          <div className="mb-6 px-3 py-2 rounded-lg bg-[#0E1013] border border-[#252830] text-[11px] font-mono text-gray-500 truncate">
            Error ID: {error.digest}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => reset()}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold shadow-lg shadow-amber-500/10 transition-all cursor-pointer active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reload App</span>
          </button>
          <Link
            href="/login"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#20242D] hover:bg-[#2A2F3B] text-gray-200 border border-[#2E3340] text-xs font-medium transition-all"
          >
            <span>Back to Login</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
