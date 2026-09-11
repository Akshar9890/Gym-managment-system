// components/plans/PlansClient.tsx — Plans management with create/edit and status toggles
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Layers, Plus, Check, Loader2, AlertCircle, Edit2, Shield } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

export interface PlanItem {
  id: string;
  name: string;
  durationMonths: number;
  price: number;
  description?: string | null;
  isActive: boolean;
}

interface PlansClientProps {
  initialPlans: PlanItem[];
  userRole?: string;
}

export function PlansClient({ initialPlans, userRole }: PlansClientProps) {
  const router = useRouter();
  const [plans, setPlans] = useState(initialPlans);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanItem | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [durationMonths, setDurationMonths] = useState(1);
  const [price, setPrice] = useState(1500);
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setEditingPlan(null);
    setName("");
    setDurationMonths(1);
    setPrice(1500);
    setDescription("");
    setIsActive(true);
    setError(null);
    setIsModalOpen(true);
  }

  function openEdit(p: PlanItem) {
    setEditingPlan(p);
    setName(p.name);
    setDurationMonths(p.durationMonths);
    setPrice(p.price);
    setDescription(p.description || "");
    setIsActive(p.isActive);
    setError(null);
    setIsModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const url = editingPlan ? `/api/plans/${editingPlan.id}` : "/api/plans";
      const method = editingPlan ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          durationMonths: Number(durationMonths),
          price: Number(price),
          description: description.trim() || undefined,
          isActive,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to save plan");
        return;
      }

      setIsModalOpen(false);
      router.refresh();
    } catch {
      setError("Network error while saving plan");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-white tracking-tight">
            Membership Plans
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Configure club subscription packages, monthly/annual durations, and pricing.
          </p>
        </div>

        {["SUPER_ADMIN", "ADMIN"].includes(userRole || "") && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold shadow-lg shadow-amber-500/10 transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create Plan</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((p) => (
          <div
            key={p.id}
            className={`bg-[#17191E] border rounded-xl p-5 flex flex-col justify-between shadow-xl transition-all ${
              p.isActive
                ? "border-[#252830] hover:border-amber-500/30"
                : "border-[#252830]/50 opacity-60"
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-amber-400 font-semibold">
                  {p.durationMonths} Month{p.durationMonths > 1 ? "s" : ""}
                </span>
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                    p.isActive
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : "bg-gray-500/10 text-gray-400 border-gray-500/30"
                  }`}
                >
                  {p.isActive ? "Active" : "Archived"}
                </span>
              </div>

              <h3 className="text-lg font-bold font-display text-white">{p.name}</h3>

              <div className="text-2xl font-bold font-display text-white tabular-nums">
                ₹{p.price.toLocaleString("en-IN")}
                <span className="text-xs text-gray-500 font-sans font-normal ml-1">
                  / period
                </span>
              </div>

              {p.description && (
                <p className="text-xs text-gray-400 leading-relaxed">
                  {p.description}
                </p>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-[#252830] flex items-center justify-between">
              <span className="text-[11px] text-gray-500">
                Inclusive D1 rule
              </span>
              {["SUPER_ADMIN", "ADMIN"].includes(userRole || "") && (
                <button
                  onClick={() => openEdit(p)}
                  className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-medium"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Edit</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPlan ? "Edit Membership Plan" : "Create New Plan"}
        subtitle="Manage plan duration, locked price points, and active status"
        maxWidth="md"
      >
        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Plan Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Monthly Standard"
              className="w-full px-3 py-2 bg-[#111316] border border-[#252830] rounded-lg text-sm text-white focus:outline-none focus:border-amber-500/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Duration (Months) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={durationMonths}
                onChange={(e) => setDurationMonths(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#111316] border border-[#252830] rounded-lg text-sm text-white focus:outline-none focus:border-amber-500/50 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Price (₹) *
              </label>
              <input
                type="number"
                min="0"
                required
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#111316] border border-[#252830] rounded-lg text-sm text-amber-400 font-bold font-mono focus:outline-none focus:border-amber-500/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Gym floor access, locker access, etc."
              className="w-full px-3 py-2 bg-[#111316] border border-[#252830] rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-[#252830] text-amber-500 focus:ring-amber-500"
            />
            <label htmlFor="isActive" className="text-xs text-gray-300 cursor-pointer">
              Active plan (available for new memberships and renewals)
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#252830]">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-[#252830] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-xs font-semibold shadow-lg shadow-amber-500/10 transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving…</span>
                </>
              ) : (
                <span>Save Plan</span>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
