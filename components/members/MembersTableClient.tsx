// components/members/MembersTableClient.tsx — Interactive members list with filters and responsive views
"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Search,
  UserPlus,
  ArrowUpDown,
  Filter,
  Phone,
  ChevronRight,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";
import { AddMemberModal } from "@/components/members/AddMemberModal";
import { useRouter } from "next/navigation";

export interface MemberListItem {
  id: string;
  fullName: string;
  profilePhoto?: string | null;
  phoneNumber: string;
  whatsappNumber: string;
  whatsappVerified: boolean;
  status: string;
  joinDate: string;
  createdBy?: {
    id: string;
    name: string;
  } | null;
  currentMembership?: {
    id: string;
    membershipReference?: string;
    planName: string;
    startDate: string;
    endDate: string;
    membershipStatus: string;
    paymentStatus: string;
  } | null;
}

interface MembersTableClientProps {
  initialMembers: MemberListItem[];
  initialAction?: string;
  initialFilterStatus?: string;
}

export function MembersTableClient({
  initialMembers,
  initialAction,
  initialFilterStatus,
}: MembersTableClientProps) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(
    initialFilterStatus || "ALL"
  );
  const [isAddModalOpen, setIsAddModalOpen] = useState(
    initialAction === "create"
  );

  useEffect(() => {
    if (initialFilterStatus) {
      setStatusFilter(initialFilterStatus);
    }
  }, [initialFilterStatus]);

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      // Search matching
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        m.fullName.toLowerCase().includes(q) ||
        m.phoneNumber.includes(q) ||
        m.whatsappNumber.includes(q) ||
        (m.createdBy?.name && m.createdBy.name.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      // Status filter
      if (statusFilter === "ALL") return true;

      if (statusFilter === "DUE_BALANCE") {
        return (
          m.currentMembership?.paymentStatus === "PARTIAL" ||
          m.currentMembership?.paymentStatus === "PENDING"
        );
      }

      const memStatus = m.currentMembership?.membershipStatus || m.status;
      return memStatus === statusFilter;
    });
  }, [members, searchQuery, statusFilter]);

  function refreshList() {
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-white tracking-tight">
            Members Directory
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Search, inspect, and manage club memberships and renewals.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold shadow-lg shadow-amber-500/10 transition-colors self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Member</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-[#17191E] border border-[#252830] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by member name, phone number, or staff..."
            className="w-full pl-9 pr-4 py-2 bg-[#111316] border border-[#252830] rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { id: "ALL", label: "All Members" },
            { id: "ACTIVE", label: "Active" },
            { id: "EXPIRING_SOON", label: "Expiring Soon" },
            { id: "EXPIRED", label: "Expired" },
            { id: "DUE_BALANCE", label: "Due Balances" },
            { id: "PAUSED", label: "Paused" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                statusFilter === tab.id
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                  : "text-gray-400 hover:text-white hover:bg-[#1E2128]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-xs text-gray-500 px-1">
        <span>Showing {filteredMembers.length} member{filteredMembers.length === 1 ? "" : "s"}</span>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-[#17191E] border border-[#252830] rounded-xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#111316] text-gray-400 uppercase tracking-wider font-medium border-b border-[#252830]">
            <tr>
              <th className="py-3 px-5">Member</th>
              <th className="py-3 px-4">Phone / WhatsApp</th>
              <th className="py-3 px-4">Current Plan</th>
              <th className="py-3 px-4">Plan Expiry</th>
              <th className="py-3 px-4">Membership Status</th>
              <th className="py-3 px-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#252830]">
            {filteredMembers.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-500">
                  No members match your criteria.
                </td>
              </tr>
            ) : (
              filteredMembers.map((m) => {
                const plan = m.currentMembership;
                const status = plan?.membershipStatus || m.status;

                return (
                  <tr
                    key={m.id}
                    className="hover:bg-[#1E2128]/50 transition-colors"
                  >
                    <td className="py-3.5 px-5">
                      <Link
                        href={`/members/${m.id}`}
                        className="font-medium text-white hover:text-amber-400 transition-colors flex items-center gap-2"
                      >
                        <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-xs font-bold overflow-hidden shrink-0">
                          {m.profilePhoto ? (
                            <img src={m.profilePhoto} alt={m.fullName} className="w-full h-full object-cover" />
                          ) : (
                            m.fullName.charAt(0)
                          )}
                        </div>
                        <div>
                          <div className="font-semibold">{m.fullName}</div>
                          {m.createdBy && (
                            <div className="flex items-center gap-1 text-[11px] text-gray-400">
                              <span className="text-gray-500">Added by:</span>
                              <span className="text-amber-400 font-medium">{m.createdBy.name}</span>
                            </div>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-gray-300">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-gray-500" />
                        <span>{m.phoneNumber}</span>
                      </div>
                      <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                        <span>WA: {m.whatsappNumber}</span>
                        {m.whatsappVerified ? (
                          <span className="text-emerald-400" title="WhatsApp Verified">✓</span>
                        ) : (
                          <span className="text-amber-500" title="Unverified">⚠</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-gray-300 font-medium">
                      {plan ? plan.planName : <span className="text-gray-600">No Plan</span>}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-gray-300">
                      {plan ? (
                        format(new Date(plan.endDate), "dd MMM yyyy")
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1 items-start">
                        <StatusBadge status={status} size="sm" />
                        {(plan?.paymentStatus === "PARTIAL" || plan?.paymentStatus === "PENDING") && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                            Due Balance
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <Link
                        href={`/members/${m.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#111316] hover:bg-[#252830] text-gray-300 hover:text-white border border-[#252830] transition-colors"
                      >
                        <span>Profile</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards View (per DESIGN.md layout requirements) */}
      <div className="md:hidden space-y-3">
        {filteredMembers.length === 0 ? (
          <div className="bg-[#17191E] border border-[#252830] rounded-xl p-8 text-center text-gray-500 text-xs">
            No members match your criteria.
          </div>
        ) : (
          filteredMembers.map((m) => {
            const plan = m.currentMembership;
            const status = plan?.membershipStatus || m.status;

            return (
              <div
                key={m.id}
                className="bg-[#17191E] border border-[#252830] rounded-xl p-4 space-y-3 shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-xs font-bold overflow-hidden shrink-0">
                      {m.profilePhoto ? (
                        <img src={m.profilePhoto} alt={m.fullName} className="w-full h-full object-cover" />
                      ) : (
                        m.fullName.charAt(0)
                      )}
                    </div>
                    <div>
                      <Link
                        href={`/members/${m.id}`}
                        className="font-semibold text-sm text-white hover:text-amber-400"
                      >
                        {m.fullName}
                      </Link>
                      {m.createdBy && (
                        <div className="text-[11px] text-gray-400">
                          <span className="text-gray-500">Added by: </span>
                          <span className="text-amber-400 font-medium">{m.createdBy.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={status} size="sm" />
                    {(plan?.paymentStatus === "PARTIAL" || plan?.paymentStatus === "PENDING") && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                        Due Balance
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-[#252830]">
                  <div>
                    <span className="text-gray-500 text-[11px] block">Plan</span>
                    <span className="text-gray-300 font-medium">
                      {plan ? plan.planName : "None"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[11px] block">Expiry</span>
                    <span className="text-gray-300 font-mono">
                      {plan ? format(new Date(plan.endDate), "dd MMM yyyy") : "—"}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500 text-[11px] block">Phone / WhatsApp</span>
                    <span className="text-gray-300 font-mono">
                      {m.phoneNumber} {m.whatsappVerified ? "✓" : "⚠"}
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    href={`/members/${m.id}`}
                    className="w-full py-2 bg-[#111316] hover:bg-[#252830] text-gray-300 hover:text-white border border-[#252830] rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                  >
                    <span>View Member Details</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Member Modal */}
      <AddMemberModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={refreshList}
      />
    </div>
  );
}
