// app/(dashboard)/jobs/page.tsx — Daily job scheduler server page
import React from "react";
import { prisma } from "@/lib/prisma";
import { JobMonitoringClient, JobExecutionItem } from "@/components/jobs/JobMonitoringClient";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const executions = await prisma.jobExecution.findMany({
    orderBy: { startedAt: "desc" },
    take: 50,
  });

  const items: JobExecutionItem[] = executions.map((j: any) => ({
    id: j.id,
    jobName: j.jobName,
    startedAt: j.startedAt.toISOString(),
    completedAt: j.completedAt?.toISOString() || null,
    status: j.status,
    processedCount: j.processedCount,
    successCount: j.successCount,
    failureCount: j.failureCount,
    errorDetails: j.errorDetails,
  }));

  return <JobMonitoringClient executions={items} />;
}
