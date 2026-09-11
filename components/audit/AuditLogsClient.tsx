// components/audit/AuditLogsClient.tsx — Audit Log Viewer with filters & diff modal
"use client";

import React, { useState, useMemo } from "react";
import { format } from "date-fns";
import { ShieldAlert, Search, Eye, Filter } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

export interface AuditLogItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues: any;
  newValues: any;
  createdAt: string;
  user?: {
    name: string;
    email: string;
    role: string;
  } | null;
}

interface AuditLogsClientProps {
  logs: AuditLogItem[];
}

export function AuditLogsClient({ logs }: AuditLogsClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        log.action.toLowerCase().includes(q) ||
        log.entityType.toLowerCase().includes(q) ||
        log.entityId.toLowerCase().includes(q) ||
        (log.user?.name && log.user.name.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (actionFilter !== "ALL" && log.action !== actionFilter) {
        return false;
      }

      return true;
    });
  }, [logs, searchQuery, actionFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-white tracking-tight">
            Audit Trail
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Immutable log of all administrative actions, membership adjustments, and price overrides.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#17191E] border border-[#252830] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by action, entity type, ID, or user…"
            className="w-full pl-9 pr-4 py-2 bg-[#111316] border border-[#252830] rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {["ALL", "CREATE", "UPDATE", "DELETE", "LOGIN", "RENEW"].map((act) => (
            <button
              key={act}
              onClick={() => setActionFilter(act)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                actionFilter === act
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                  : "text-gray-400 hover:text-white hover:bg-[#1E2128]"
              }`}
            >
              {act === "ALL" ? "All Actions" : act}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#17191E] border border-[#252830] rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#111316] text-gray-400 uppercase tracking-wider font-medium border-b border-[#252830]">
              <tr>
                <th className="py-3 px-5">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Entity ID</th>
                <th className="py-3 px-5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#252830]">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    No audit records match your filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#1E2128]/50 transition-colors">
                    <td className="py-3.5 px-5 font-mono text-gray-400 whitespace-nowrap">
                      {format(new Date(log.createdAt), "dd MMM yyyy, HH:mm:ss")}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-white font-medium block">
                        {log.user?.name || "System"}
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono">
                        {log.user?.role || "AUTOMATED"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-xs font-bold text-amber-400">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-300 font-medium">
                      {log.entityType}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-gray-500 text-[11px]">
                      {log.entityId.slice(0, 14)}…
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#111316] hover:bg-[#252830] text-gray-300 hover:text-white border border-[#252830] transition-colors"
                      >
                        <Eye className="w-3 h-3 text-amber-400" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Diff Inspector Modal */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Audit Event Details"
        subtitle={selectedLog ? `${selectedLog.action} on ${selectedLog.entityType}` : ""}
        maxWidth="lg"
      >
        {selectedLog && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-[#111316] border border-[#252830]">
              <div>
                <span className="text-gray-500 text-[10px] uppercase block">Actor</span>
                <span className="text-white font-semibold">
                  {selectedLog.user?.name || "System"} ({selectedLog.user?.role || "AUTO"})
                </span>
              </div>
              <div>
                <span className="text-gray-500 text-[10px] uppercase block">Timestamp</span>
                <span className="font-mono text-gray-300">
                  {format(new Date(selectedLog.createdAt), "dd MMM yyyy, HH:mm:ss")}
                </span>
              </div>
              <div>
                <span className="text-gray-500 text-[10px] uppercase block">Entity Type</span>
                <span className="text-gray-300">{selectedLog.entityType}</span>
              </div>
              <div>
                <span className="text-gray-500 text-[10px] uppercase block">Entity ID</span>
                <span className="font-mono text-gray-400 text-[11px]">{selectedLog.entityId}</span>
              </div>
            </div>

            <div className="space-y-3">
              {selectedLog.oldValues && (
                <div>
                  <h4 className="text-[11px] font-semibold uppercase text-red-400 mb-1">
                    Previous Values
                  </h4>
                  <pre className="p-3 rounded-lg bg-[#111316] border border-[#252830] text-[11px] font-mono text-gray-300 overflow-x-auto max-h-48">
                    {JSON.stringify(selectedLog.oldValues, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.newValues && (
                <div>
                  <h4 className="text-[11px] font-semibold uppercase text-emerald-400 mb-1">
                    New Values
                  </h4>
                  <pre className="p-3 rounded-lg bg-[#111316] border border-[#252830] text-[11px] font-mono text-gray-300 overflow-x-auto max-h-48">
                    {JSON.stringify(selectedLog.newValues, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-[#252830]">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-lg bg-[#252830] hover:bg-[#2e323c] text-white text-xs"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
