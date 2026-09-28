// lib/offline/useOfflineQueue.ts — React hook for observing and interacting with the offline queue
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  QueuedMutation,
  getQueuedMutations,
  clearQueuedMutations,
} from "./indexeddb";
import {
  enqueueOfflineAction,
  syncOfflineQueue,
  isQueueSyncing,
} from "./syncManager";

export function useOfflineQueue() {
  const [queue, setQueue] = useState<QueuedMutation[]>([]);
  const [syncing, setSyncing] = useState<boolean>(false);

  const refreshQueue = useCallback(async () => {
    try {
      const items = await getQueuedMutations();
      setQueue(items);
      setSyncing(isQueueSyncing());
    } catch {
      // IndexedDB may not be ready or supported
    }
  }, []);

  useEffect(() => {
    refreshQueue();

    const handleQueueChanged = () => {
      refreshQueue();
    };

    window.addEventListener("bsf-offline-queue-changed", handleQueueChanged);
    window.addEventListener("online", handleQueueChanged);
    window.addEventListener("offline", handleQueueChanged);

    return () => {
      window.removeEventListener("bsf-offline-queue-changed", handleQueueChanged);
      window.removeEventListener("online", handleQueueChanged);
      window.removeEventListener("offline", handleQueueChanged);
    };
  }, [refreshQueue]);

  const enqueue = useCallback(
    async (item: Omit<QueuedMutation, "id" | "timestamp" | "retryCount" | "status">) => {
      const res = await enqueueOfflineAction(item);
      await refreshQueue();
      return res;
    },
    [refreshQueue]
  );

  const syncNow = useCallback(async () => {
    setSyncing(true);
    try {
      const result = await syncOfflineQueue();
      await refreshQueue();
      return result;
    } finally {
      setSyncing(false);
    }
  }, [refreshQueue]);

  const clearQueue = useCallback(async () => {
    await clearQueuedMutations();
    await refreshQueue();
  }, [refreshQueue]);

  const pendingCount = queue.filter((item) => item.status === "pending" || item.status === "syncing").length;

  return {
    queue,
    pendingCount,
    isSyncing: syncing,
    enqueue,
    syncNow,
    clearQueue,
    refreshQueue,
  };
}
