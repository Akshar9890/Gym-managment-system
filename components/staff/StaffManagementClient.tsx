// components/staff/StaffManagementClient.tsx — Admin Staff Management & Comparison UI
"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Users,
  UserCheck,
  UserX,
  CreditCard,
  Plus,
  Search,
  KeyRound,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Eye,
  TrendingUp,
  Filter,
  BarChart3,
  Calendar,
  Lock,
  Phone,
  Mail,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";

interface StaffItem {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  membershipsCount: number;
  renewalsCount: number;
  revenueGenerated: number;
}

interface StaffManagementClientProps {
  initialStaff: StaffItem[];
  summary: {
    totalStaff: number;
    activeStaff: number;
    inactiveStaff: number;
    totalRevenue: number;
    totalMemberships: number;
  };
}

export function StaffManagementClient({
  initialStaff,
  summary,
}: StaffManagementClientProps) {
  const router = useRouter();

  // Active view tab
  const [activeTab, setActiveTab] = useState<"directory" | "comparison">("directory");

  // Search & Filters for Directory
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [createdStaffSuccess, setCreatedStaffSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  const [editStaff, setEditStaff] = useState<StaffItem | null>(null);
  const [resetStaff, setResetStaff] = useState<StaffItem | null>(null);
  const [viewStaff, setViewStaff] = useState<StaffItem | null>(null);

  // Form states
  const [addForm, setAddForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    email: "",
    isActive: true,
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  const [resetForm, setResetForm] = useState({
    password: "",
    confirmPassword: "",
  });
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);

  // Staff Deletion / Removal State
  const [staffToDelete, setStaffToDelete] = useState<StaffItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Comparison Tab State
  const [period, setPeriod] = useState<"today" | "this_week" | "this_month" | "this_year" | "custom">("this_month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonData, setComparisonData] = useState<any[]>([]);
  const [sortField, setSortField] = useState<"revenue" | "memberships" | "renewals" | "newMembers">("revenue");
  const [sortAsc, setSortAsc] = useState(false);

  // Filtered staff directory
  const filteredStaff = useMemo(() => {
    return initialStaff.filter((s) => {
      const matchQuery =
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.phone && s.phone.includes(searchTerm));

      if (!matchQuery) return false;
      if (statusFilter === "ACTIVE" && !s.isActive) return false;
      if (statusFilter === "INACTIVE" && s.isActive) return false;
      return true;
    });
  }, [initialStaff, searchTerm, statusFilter]);

  // Handle Add Staff
  async function handleCreateStaff(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    setAddLoading(true);

    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });

      const json = await res.json();
      if (!res.ok) {
        const errorMsg =
          json.error ||
          (json.errors && Object.values(json.errors).flat()[0]) ||
          "Failed to create staff";
        setAddError(errorMsg);
        return;
      }

      setCreatedStaffSuccess(true);
      router.refresh();
    } catch {
      setAddError("Network error. Please try again.");
    } finally {
      setAddLoading(false);
    }
  }

  function handleCloseAddModal() {
    setIsAddOpen(false);
    setCreatedStaffSuccess(false);
    setAddForm({ name: "", phone: "", email: "", password: "", confirmPassword: "" });
    setAddError("");
  }

  // Handle Edit Staff
  function openEditModal(staff: StaffItem) {
    setEditStaff(staff);
    setEditForm({
      name: staff.name,
      phone: staff.phone || "",
      email: staff.email,
      isActive: staff.isActive,
    });
    setEditError("");
  }

  async function handleUpdateStaff(e: React.FormEvent) {
    e.preventDefault();
    if (!editStaff) return;
    setEditError("");
    setEditLoading(true);

    try {
      const res = await fetch(`/api/staff/${editStaff.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      const json = await res.json();
      if (!res.ok) {
        const errorMsg =
          json.error ||
          (json.errors && Object.values(json.errors).flat()[0]) ||
          "Failed to update staff";
        setEditError(errorMsg);
        return;
      }

      setEditStaff(null);
      router.refresh();
    } catch {
      setEditError("Network error. Please try again.");
    } finally {
      setEditLoading(false);
    }
  }

  // Toggle active status directly
  async function handleToggleStatus(staff: StaffItem) {
    const confirmMsg = staff.isActive
      ? `Deactivate ${staff.name}? They will no longer be able to log in, but all past memberships & payments will remain permanently attributed to them.`
      : `Activate ${staff.name}? They will be able to log in again.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/staff/${staff.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !staff.isActive }),
      });

      if (!res.ok) {
        const json = await res.json();
        alert(json.error || "Failed to toggle status");
        return;
      }

      router.refresh();
    } catch {
      alert("Network error.");
    }
  }

  // Handle Reset Password
  function openResetModal(staff: StaffItem) {
    setResetStaff(staff);
    setResetForm({ password: "", confirmPassword: "" });
    setResetError("");
    setResetSuccess(false);
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetStaff) return;
    setResetError("");
    setResetLoading(true);

    try {
      const res = await fetch(`/api/staff/${resetStaff.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resetForm),
      });

      const json = await res.json();
      if (!res.ok) {
        const errorMsg =
          json.error ||
          (json.errors && Object.values(json.errors).flat()[0]) ||
          "Failed to reset password";
        setResetError(errorMsg);
        return;
      }

      setResetSuccess(true);
      setTimeout(() => {
        setResetStaff(null);
        setResetSuccess(false);
      }, 1800);
    } catch {
      setResetError("Network error. Please try again.");
    } finally {
      setResetLoading(false);
    }
  }

  // Handle Remove / Delete Staff
  async function handleDeleteStaff() {
    if (!staffToDelete) return;
    setDeleteError("");
    setDeleteLoading(true);

    try {
      const res = await fetch(`/api/staff/${staffToDelete.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        setDeleteError(json.error || "Failed to remove staff member");
        return;
      }
      setStaffToDelete(null);
      if (editStaff?.id === staffToDelete.id) setEditStaff(null);
      if (viewStaff?.id === staffToDelete.id) setViewStaff(null);
      router.refresh();
    } catch {
      setDeleteError("Network error. Please try again.");
    } finally {
      setDeleteLoading(false);
    }
  }

  // Fetch Comparison Data when tab or filters change
  async function fetchComparison(p: string = period, sDate = customStart, eDate = customEnd) {
    setComparisonLoading(true);
    try {
      let url = `/api/staff/performance?period=${p}`;
      if (p === "custom" && sDate && eDate) {
        url += `&startDate=${sDate}&endDate=${eDate}`;
      }
      const res = await fetch(url);
      const json = await res.json();
      if (res.ok && json.comparison) {
        setComparisonData(json.comparison);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setComparisonLoading(false);
    }
  }

  // Trigger fetch when tab switches to comparison
  function handleTabSwitch(tab: "directory" | "comparison") {
    setActiveTab(tab);
    if (tab === "comparison" && comparisonData.length === 0) {
      fetchComparison();
    }
  }

  // Sort comparison data
  const sortedComparison = useMemo(() => {
    const list = [...comparisonData];
    list.sort((a, b) => {
      const aVal = a[sortField] ?? 0;
      const bVal = b[sortField] ?? 0;
      return sortAsc ? aVal - bVal : bVal - aVal;
    });
    return list;
  }, [comparisonData, sortField, sortAsc]);

  function handleSort(field: "revenue" | "memberships" | "renewals" | "newMembers") {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  }

  return (
    <div className="space-y-8 pb-12">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-white tracking-tight">
            Staff Management
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Manage front-desk staff accounts, credentials, and compare revenue performance
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Staff</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. STAFF OVERVIEW CARDS
         ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-[#17191E] border border-[#252830] rounded-xl p-4">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-2">
            <span>Total Staff</span>
            <Users className="w-4 h-4 text-gray-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {summary.totalStaff}
          </div>
        </div>

        <div className="bg-[#17191E] border border-[#252830] rounded-xl p-4">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-2">
            <span>Active Staff</span>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {summary.activeStaff}
          </div>
        </div>

        <div className="bg-[#17191E] border border-[#252830] rounded-xl p-4">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-2">
            <span>Inactive Staff</span>
            <UserX className="w-4 h-4 text-gray-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-gray-400">
            {summary.inactiveStaff}
          </div>
        </div>

        <div className="bg-[#17191E] border border-[#252830] rounded-xl p-4">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-2">
            <span>Total Revenue</span>
            <CreditCard className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">
            ₹{summary.totalRevenue.toLocaleString("en-IN")}
          </div>
        </div>

        <div className="bg-[#17191E] border border-[#252830] rounded-xl p-4">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-2">
            <span>Total Memberships</span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {summary.totalMemberships}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. NAVIGATION TABS
         ───────────────────────────────────────────────────────────── */}
      <div className="flex border-b border-[#252830] gap-8">
        <button
          onClick={() => handleTabSwitch("directory")}
          className={`pb-3 text-xs font-semibold tracking-wide uppercase transition-colors relative ${
            activeTab === "directory"
              ? "text-amber-400"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Staff Directory
          {activeTab === "directory" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400" />
          )}
        </button>

        <button
          onClick={() => handleTabSwitch("comparison")}
          className={`pb-3 text-xs font-semibold tracking-wide uppercase transition-colors relative flex items-center gap-2 ${
            activeTab === "comparison"
              ? "text-amber-400"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Staff Performance Comparison</span>
          {activeTab === "comparison" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400" />
          )}
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: STAFF DIRECTORY
         ───────────────────────────────────────────────────────────── */}
      {activeTab === "directory" && (
        <div className="space-y-4">
          {/* Search & Status Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#17191E] border border-[#252830] rounded-xl p-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search staff by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#111316] border border-[#252830] rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            <div className="flex items-center gap-2">
              {(["ALL", "ACTIVE", "INACTIVE"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    statusFilter === s
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      : "text-gray-400 hover:text-white hover:bg-[#111316]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Directory Table */}
          <div className="bg-[#17191E] border border-[#252830] rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#111316] text-gray-400 uppercase tracking-wider font-medium border-b border-[#252830]">
                  <tr>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Joined</th>
                    <th className="py-3 px-4">Last Login</th>
                    <th className="py-3 px-4">Memberships</th>
                    <th className="py-3 px-4">Renewals</th>
                    <th className="py-3 px-4">Revenue</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#252830]">
                  {filteredStaff.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-gray-500 text-xs">
                        No staff accounts found matching your query.
                      </td>
                    </tr>
                  ) : (
                    filteredStaff.map((staff) => (
                      <tr key={staff.id} className="hover:bg-[#1E2128]/50 transition-colors">
                        <td className="py-3 px-4 font-medium text-white">
                          {staff.name}
                        </td>
                        <td className="py-3 px-4 font-mono text-gray-300">
                          {staff.phone || "—"}
                        </td>
                        <td className="py-3 px-4 text-gray-300">
                          {staff.email}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleToggleStatus(staff)}
                            title={staff.isActive ? "Click to deactivate" : "Click to activate"}
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-colors ${
                              staff.isActive
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                                : "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                staff.isActive ? "bg-emerald-400" : "bg-red-400"
                              }`}
                            />
                            <span>{staff.isActive ? "Active" : "Inactive"}</span>
                          </button>
                        </td>
                        <td className="py-3 px-4 font-mono text-gray-400">
                          {format(new Date(staff.createdAt), "dd MMM yy")}
                        </td>
                        <td className="py-3 px-4 font-mono text-gray-400">
                          {staff.lastLoginAt
                            ? format(new Date(staff.lastLoginAt), "dd MMM, hh:mm a")
                            : "Never"}
                        </td>
                        <td className="py-3 px-4 font-mono text-white font-medium">
                          {staff.membershipsCount}
                        </td>
                        <td className="py-3 px-4 font-mono text-white font-medium">
                          {staff.renewalsCount}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-amber-400">
                          ₹{staff.revenueGenerated.toLocaleString("en-IN")}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View */}
                            <button
                              onClick={() => setViewStaff(staff)}
                              title="View details"
                              className="p-1.5 rounded bg-[#111316] text-gray-400 hover:text-white border border-[#252830] transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {/* Edit */}
                            <button
                              onClick={() => openEditModal(staff)}
                              title="Edit staff details"
                              className="p-1.5 rounded bg-[#111316] text-gray-400 hover:text-white border border-[#252830] transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {/* Reset Password */}
                            <button
                              onClick={() => openResetModal(staff)}
                              title="Reset staff password"
                              className="p-1.5 rounded bg-[#111316] text-amber-400 hover:text-amber-300 border border-[#252830] transition-colors"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>
                            {/* Remove Staff */}
                            <button
                              onClick={() => {
                                setDeleteError("");
                                setStaffToDelete(staff);
                              }}
                              title="Remove staff member"
                              className="p-1.5 rounded bg-[#111316] text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-[#252830] hover:border-red-500/30 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: STAFF COMPARISON
         ───────────────────────────────────────────────────────────── */}
      {activeTab === "comparison" && (
        <div className="space-y-4">
          {/* Period Filter Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-[#17191E] border border-[#252830] rounded-xl p-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-gray-300 font-semibold uppercase tracking-wider">
                Filter Period:
              </span>
              <div className="flex flex-wrap items-center gap-1.5 ml-2">
                {[
                  { id: "today", label: "Today" },
                  { id: "this_week", label: "This Week" },
                  { id: "this_month", label: "This Month" },
                  { id: "this_year", label: "This Year" },
                  { id: "custom", label: "Custom Range" },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setPeriod(p.id as any);
                      if (p.id !== "custom") fetchComparison(p.id);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      period === p.id
                        ? "bg-amber-500 text-black font-bold"
                        : "bg-[#111316] text-gray-400 hover:text-white border border-[#252830]"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {period === "custom" && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-2.5 py-1 bg-[#111316] border border-[#252830] rounded text-xs text-white"
                />
                <span className="text-xs text-gray-500">to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-2.5 py-1 bg-[#111316] border border-[#252830] rounded text-xs text-white"
                />
                <button
                  onClick={() => fetchComparison("custom", customStart, customEnd)}
                  className="px-3 py-1 rounded bg-amber-500 text-black text-xs font-bold"
                >
                  Apply
                </button>
              </div>
            )}
          </div>

          {/* Comparison Table */}
          <div className="bg-[#17191E] border border-[#252830] rounded-xl overflow-hidden shadow-xl">
            {comparisonLoading ? (
              <div className="p-12 text-center text-gray-500 text-xs">
                Loading performance metrics...
              </div>
            ) : sortedComparison.length === 0 ? (
              <div className="p-12 text-center text-gray-500 text-xs">
                No staff records available for comparison.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#111316] text-gray-400 uppercase tracking-wider font-medium border-b border-[#252830]">
                    <tr>
                      <th className="py-3 px-4">Staff</th>
                      <th
                        onClick={() => handleSort("newMembers")}
                        className="py-3 px-4 cursor-pointer hover:text-white"
                      >
                        New Members {sortField === "newMembers" && (sortAsc ? "↑" : "↓")}
                      </th>
                      <th
                        onClick={() => handleSort("memberships")}
                        className="py-3 px-4 cursor-pointer hover:text-white"
                      >
                        Memberships {sortField === "memberships" && (sortAsc ? "↑" : "↓")}
                      </th>
                      <th
                        onClick={() => handleSort("renewals")}
                        className="py-3 px-4 cursor-pointer hover:text-white"
                      >
                        Renewals {sortField === "renewals" && (sortAsc ? "↑" : "↓")}
                      </th>
                      <th
                        onClick={() => handleSort("revenue")}
                        className="py-3 px-4 cursor-pointer hover:text-amber-400 text-amber-400 font-semibold"
                      >
                        Revenue {sortField === "revenue" && (sortAsc ? "↑" : "↓")}
                      </th>
                      <th className="py-3 px-4">Average Plan Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#252830]">
                    {sortedComparison.map((s, idx) => (
                      <tr key={s.id} className="hover:bg-[#1E2128]/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#111316] border border-[#252830] text-[10px] font-bold text-gray-400 flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <div>
                              <p className="font-medium text-white">{s.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-white font-medium">
                          {s.newMembers}
                        </td>
                        <td className="py-3 px-4 font-mono text-white font-medium">
                          {s.memberships}
                        </td>
                        <td className="py-3 px-4 font-mono text-white font-medium">
                          {s.renewals}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-amber-400 text-sm">
                          ₹{s.revenue.toLocaleString("en-IN")}
                        </td>
                        <td className="py-3 px-4 font-mono text-gray-300">
                          ₹{s.averageValue.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: + ADD STAFF
         ───────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={isAddOpen}
        onClose={handleCloseAddModal}
        title="Add New Staff Account"
        subtitle="Create operational staff account with email login"
      >
        {createdStaffSuccess ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Staff Created Successfully</h3>
              <p className="text-xs text-gray-400 mt-1">
                The staff account is now active and ready for login.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[#111316] border border-[#252830] max-w-sm mx-auto text-center space-y-1">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Login Email</p>
              <p className="text-sm font-bold text-white">{addForm.name}</p>
              <p className="text-xs font-mono text-amber-400 font-semibold">{addForm.email}</p>
              <p className="text-[11px] text-gray-400 pt-1">The staff member can now sign in using this email address.</p>
            </div>
            <button
              onClick={handleCloseAddModal}
              className="w-full max-w-sm py-2.5 rounded-xl bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleCreateStaff} className="space-y-4 pt-2">
            {addError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{addError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                placeholder="e.g. Amit Shah"
                className="w-full px-3 py-2.5 bg-[#111316] border border-[#252830] rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Indian Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  value={addForm.phone}
                  onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                  placeholder="9825123456"
                  className="w-full px-3 py-2.5 bg-[#111316] border border-[#252830] rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  placeholder="amit@bsfgym.com"
                  className="w-full px-3 py-2.5 bg-[#111316] border border-[#252830] rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Password (min 8 chars) *
                </label>
                <input
                  type="password"
                  required
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 bg-[#111316] border border-[#252830] rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  required
                  value={addForm.confirmPassword}
                  onChange={(e) => setAddForm({ ...addForm, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 bg-[#111316] border border-[#252830] rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
                />
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#111316] border border-[#252830] text-[11px] text-gray-400">
              <span className="text-amber-400 font-semibold">Staff Login:</span> The staff member will log in directly using their Email / Gmail address and password.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleCloseAddModal}
                className="px-4 py-2 rounded-lg bg-[#111316] hover:bg-[#20242D] text-gray-400 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addLoading}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-colors disabled:opacity-50"
              >
                {addLoading ? "Creating..." : "Create Staff Account"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: EDIT STAFF
         ───────────────────────────────────────────────────────────── */}
      {editStaff && (
        <Modal
          isOpen={Boolean(editStaff)}
          onClose={() => setEditStaff(null)}
          title={`Edit Staff: ${editStaff.name}`}
          subtitle={editStaff.email}
        >
          <form onSubmit={handleUpdateStaff} className="space-y-4 pt-2">
            {editError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full px-3 py-2.5 bg-[#111316] border border-[#252830] rounded-lg text-xs text-white focus:outline-none focus:border-amber-500/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-3 py-2.5 bg-[#111316] border border-[#252830] rounded-lg text-xs text-white focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2.5 bg-[#111316] border border-[#252830] rounded-lg text-xs text-white focus:outline-none focus:border-amber-500/50"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-[#111316] border border-[#252830] rounded-lg">
              <input
                type="checkbox"
                id="editIsActive"
                checked={editForm.isActive}
                onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                className="w-4 h-4 rounded text-amber-500 focus:ring-0 bg-[#17191E] border-[#303542]"
              />
              <label htmlFor="editIsActive" className="text-xs text-white">
                Account Active (uncheck to deactivate login without deleting historical records)
              </label>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const s = editStaff;
                  setEditStaff(null);
                  setDeleteError("");
                  setStaffToDelete(s);
                }}
                className="px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Staff</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditStaff(null)}
                  className="px-4 py-2 rounded-lg bg-[#111316] hover:bg-[#20242D] text-gray-400 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {editLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: RESET PASSWORD
         ───────────────────────────────────────────────────────────── */}
      {resetStaff && (
        <Modal
          isOpen={Boolean(resetStaff)}
          onClose={() => setResetStaff(null)}
          title="Reset Staff Password"
          subtitle={`Setting new password for ${resetStaff.name} (${resetStaff.email})`}
        >
          {resetSuccess ? (
            <div className="py-6 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="text-xs font-bold text-white">Password Updated Successfully</p>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4 pt-2">
              {resetError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{resetError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  New Password (min 8 characters) *
                </label>
                <input
                  type="password"
                  required
                  value={resetForm.password}
                  onChange={(e) => setResetForm({ ...resetForm, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 bg-[#111316] border border-[#252830] rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  required
                  value={resetForm.confirmPassword}
                  onChange={(e) => setResetForm({ ...resetForm, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 bg-[#111316] border border-[#252830] rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="p-3 rounded-lg bg-[#111316] border border-[#252830] text-[11px] text-gray-400 flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Password hashes will be securely replaced using bcrypt. Plain passwords are never stored or logged.</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetStaff(null)}
                  className="px-4 py-2 rounded-lg bg-[#111316] hover:bg-[#20242D] text-gray-400 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {resetLoading ? "Updating..." : "Reset Password"}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: VIEW STAFF DETAILS
         ───────────────────────────────────────────────────────────── */}
      {viewStaff && (
        <Modal
          isOpen={Boolean(viewStaff)}
          onClose={() => setViewStaff(null)}
          title={`Staff Profile: ${viewStaff.name}`}
          subtitle={viewStaff.email}
        >
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-[#111316] border border-[#252830] text-xs">
              <div>
                <span className="text-gray-500 block text-[10px] uppercase">Email</span>
                <span className="text-white font-medium">{viewStaff.email}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px] uppercase">Phone</span>
                <span className="text-white font-mono">{viewStaff.phone || "—"}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px] uppercase">Status</span>
                <span className={viewStaff.isActive ? "text-emerald-400 font-semibold" : "text-red-400 font-semibold"}>
                  {viewStaff.isActive ? "Active" : "Inactive (Login Blocked)"}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px] uppercase">Last Login</span>
                <span className="text-gray-300 font-mono">
                  {viewStaff.lastLoginAt ? format(new Date(viewStaff.lastLoginAt), "dd MMM yyyy, hh:mm a") : "Never"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-[#111316] border border-[#252830] text-center">
                <span className="text-[10px] text-gray-500 uppercase">Memberships</span>
                <p className="text-lg font-bold font-mono text-white mt-0.5">{viewStaff.membershipsCount}</p>
              </div>
              <div className="p-3 rounded-lg bg-[#111316] border border-[#252830] text-center">
                <span className="text-[10px] text-gray-500 uppercase">Renewals</span>
                <p className="text-lg font-bold font-mono text-white mt-0.5">{viewStaff.renewalsCount}</p>
              </div>
              <div className="p-3 rounded-lg bg-[#111316] border border-[#252830] text-center">
                <span className="text-[10px] text-gray-500 uppercase">Total Revenue</span>
                <p className="text-lg font-bold font-mono text-amber-400 mt-0.5">₹{viewStaff.revenueGenerated.toLocaleString("en-IN")}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  const s = viewStaff;
                  setViewStaff(null);
                  openEditModal(s);
                }}
                className="px-3 py-1.5 rounded-lg bg-[#17191E] border border-[#252830] text-xs text-white hover:bg-[#20242D]"
              >
                Edit Details
              </button>
              <button
                onClick={() => setViewStaff(null)}
                className="px-4 py-1.5 rounded-lg bg-amber-500 text-black text-xs font-bold hover:bg-amber-400"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: REMOVE / DELETE STAFF CONFIRMATION
         ───────────────────────────────────────────────────────────── */}
      {staffToDelete && (
        <Modal
          isOpen={Boolean(staffToDelete)}
          onClose={() => {
            if (!deleteLoading) setStaffToDelete(null);
          }}
          title="Remove Staff Member"
          subtitle={`Revoke operational access for ${staffToDelete.name}`}
        >
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white">Are you sure you want to remove this staff account?</p>
                <p className="mt-1 text-gray-300 text-[11px] leading-relaxed">
                  Removing <span className="text-white font-semibold">{staffToDelete.name}</span> ({staffToDelete.email}) will immediately revoke their access and deactivate login credentials.
                  Historical records (memberships, receipts, and audit trails) will remain preserved for accounting and business reporting.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#111316] border border-[#252830] text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500">Staff Name:</span>
                <span className="text-white font-medium">{staffToDelete.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Email:</span>
                <span className="text-white font-mono">{staffToDelete.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Phone:</span>
                <span className="text-gray-300 font-mono">{staffToDelete.phone || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Memberships Created:</span>
                <span className="text-white font-mono font-medium">{staffToDelete.membershipsCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Revenue Generated:</span>
                <span className="text-amber-400 font-mono font-bold">₹{staffToDelete.revenueGenerated.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {deleteError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={deleteLoading}
                onClick={() => setStaffToDelete(null)}
                className="px-4 py-2 rounded-lg bg-[#111316] hover:bg-[#20242D] text-gray-400 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={handleDeleteStaff}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {deleteLoading ? (
                  <span>Removing...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Remove Staff</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
