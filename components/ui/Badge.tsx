// components/ui/Badge.tsx — Accessible status badges per DESIGN.md
import React from "react";
import { CheckCircle2, Clock, AlertTriangle, XCircle, PauseCircle, HelpCircle } from "lucide-react";

export type StatusVariant =
  | "ACTIVE"
  | "EXPIRING_SOON"
  | "EXPIRED"
  | "CANCELLED"
  | "PAUSED"
  | "PAID"
  | "PARTIAL"
  | "PENDING"
  | "REFUNDED"
  | "SIMULATED"
  | "SENT"
  | "FAILED"
  | "DELIVERED";

interface BadgeProps {
  status: string;
  label?: string;
  size?: "sm" | "md";
}

export function StatusBadge({ status, label, size = "md" }: BadgeProps) {
  const norm = status?.toUpperCase() || "";

  let bg = "bg-gray-500/10 text-gray-400 border-gray-500/20";
  let Icon = HelpCircle;
  let text = label || status;

  switch (norm) {
    case "ACTIVE":
      bg = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      Icon = CheckCircle2;
      text = label || "Active";
      break;
    case "EXPIRING_SOON":
      bg = "bg-amber-500/15 text-amber-400 border-amber-500/30 animate-pulse";
      Icon = Clock;
      text = label || "Expiring Soon";
      break;
    case "EXPIRED":
      bg = "bg-red-500/15 text-red-400 border-red-500/30";
      Icon = AlertTriangle;
      text = label || "Expired";
      break;
    case "PAUSED":
      bg = "bg-blue-500/10 text-blue-400 border-blue-500/30";
      Icon = PauseCircle;
      text = label || "Paused";
      break;
    case "CANCELLED":
      bg = "bg-gray-500/10 text-gray-400 border-gray-500/30";
      Icon = XCircle;
      text = label || "Cancelled";
      break;
    case "PAID":
    case "DELIVERED":
    case "SENT":
      bg = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      Icon = CheckCircle2;
      text = label || (norm === "PAID" ? "Paid" : "Sent");
      break;
    case "PARTIAL":
      bg = "bg-amber-500/10 text-amber-400 border-amber-500/30";
      Icon = Clock;
      text = label || "Partial";
      break;
    case "PENDING":
      bg = "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
      Icon = Clock;
      text = label || "Pending";
      break;
    case "REFUNDED":
      bg = "bg-purple-500/10 text-purple-400 border-purple-500/30";
      Icon = XCircle;
      text = label || "Refunded";
      break;
    case "SIMULATED":
      bg = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      Icon = CheckCircle2;
      text = label || "WhatsApp Dispatched";
      break;
    case "FAILED":
      bg = "bg-red-500/15 text-red-400 border-red-500/30";
      Icon = AlertTriangle;
      text = label || "Failed";
      break;
  }

  const sizeClasses =
    size === "sm"
      ? "text-xs px-2 py-0.5 gap-1"
      : "text-xs px-2.5 py-1 gap-1.5 font-medium";

  return (
    <span
      className={`inline-flex items-center rounded-full border ${bg} ${sizeClasses} whitespace-nowrap`}
    >
      <Icon className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} aria-hidden="true" />
      <span>{text}</span>
    </span>
  );
}
