// components/jobs/JobMonitoringClient.tsx — Job monitoring with on-demand trigger
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Play, Loader2, CheckCircle2, AlertTriangle, Clock, RefreshCw } from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";

export interface JobExecutionItem {
  id: string;
  jobName: string;
  startedAt: string;
  completedAt?: string | null;
  status: string;
  processedCount: number;
  successCount: number;
  failureCount: number;
  errorDetails?: string | null;
}

interface JobMonitoringClientProps {
  executions: JobExecutionItem[];
}

export function JobMonitoringClient({ executions }: JobMonitoringClientProps) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; msg: string } | null>(null);

  async function handleRunJob() {
    setRunning(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/jobs/membership-lifecycle", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        setFeedback({ success: false, msg: data.error || "Job execution failed" });
      } else {
        const stats = data.data;
        setFeedback({
          success: true,
          msg: `Job ran successfully. Reminders sent: ${stats?.remindersSent || 0}, Statuses updated: ${stats?.statusesUpdated || 0}.`,
        });
        router.refresh();
      }
    } catch {
      setFeedback({ success: false, msg: "Network error executing job" });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-white tracking-tight">
            Daily Job Scheduler
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Automated Asia/Kolkata lifecycle job: marks expirations, transitions states, and dispatches 10-day WhatsApp reminders.
          </p>
        </div>

        <button
          onClick={handleRunJob}
          disabled={running}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-xs font-semibold shadow-lg shadow-amber-500/10 transition-colors self-start sm:self-auto"
        >
          {running ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Executing Lifecycle Job…</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-black" />
              <span>Run Daily Expiry Job Now</span>
            </>
          )}
        </button>
      </div>

      {feedback && (
        <div
          className={`px-4 py-3 rounded-lg text-xs flex items-center justify-between border ${
            feedback.success
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              : "bg-red-500/10 text-red-400 border-red-500/30"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.success ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertTriangle className="w-4 h-4" />
            )}
            <span>{feedback.msg}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-gray-400 hover:text-white">
            ×
          </button>
        </div>
      )}

      {/* Info Card */}
      <div className="p-4 rounded-xl bg-[#17191E] border border-[#252830] text-xs text-gray-400 flex items-start gap-3">
        <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="text-white font-semibold block mb-0.5">
            Idempotent Scheduled Execution
          </span>
          All jobs execute with strict database unique constraint protection `(membershipId, type, triggerDate)` and CANCELLED/PAUSED safety guards. Running the job multiple times on the same date will never produce duplicate WhatsApp reminders.
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#17191E] border border-[#252830] rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#111316] text-gray-400 uppercase tracking-wider font-medium border-b border-[#252830]">
              <tr>
                <th className="py-3 px-5">Job Name</th>
                <th className="py-3 px-4">Started At</th>
                <th className="py-3 px-4">Completed At</th>
                <th className="py-3 px-4">Processed</th>
                <th className="py-3 px-4">Success</th>
                <th className="py-3 px-4">Failures</th>
                <th className="py-3 px-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#252830]">
              {executions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    No job executions recorded yet. Click &quot;Run Daily Expiry Job Now&quot; to test.
                  </td>
                </tr>
              ) : (
                executions.map((j) => (
                  <tr key={j.id} className="hover:bg-[#1E2128]/50 transition-colors">
                    <td className="py-3.5 px-5 font-mono font-medium text-white">
                      {j.jobName}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-gray-300">
                      {format(new Date(j.startedAt), "dd MMM yyyy, HH:mm:ss")}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-gray-300">
                      {j.completedAt
                        ? format(new Date(j.completedAt), "dd MMM yyyy, HH:mm:ss")
                        : "Running…"}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      {j.processedCount}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-emerald-400 font-semibold">
                      {j.successCount}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-red-400 font-semibold">
                      {j.failureCount}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <StatusBadge status={j.status} size="sm" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
