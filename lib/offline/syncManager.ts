// lib/offline/syncManager.ts — Background sync orchestrator for queued offline mutations
import {
  QueuedMutation,
  addQueuedMutation,
  getQueuedMutations,
  removeQueuedMutation,
  updateMutation,
} from "./indexeddb";

let isSyncing = false;

export function notifyQueueChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("bsf-offline-queue-changed"));
  }
}

/**
 * Enqueue a new mutation to IndexedDB and triggers background sync if online.
 */
export async function enqueueOfflineAction(
  item: Omit<QueuedMutation, "id" | "timestamp" | "retryCount" | "status">
): Promise<QueuedMutation> {
  const mutation: QueuedMutation = {
    ...item,
    id: `mut_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    retryCount: 0,
    status: "pending",
  };

  await addQueuedMutation(mutation);
  notifyQueueChanged();

  // Try to register Background Sync with Service Worker if supported
  if (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "SyncManager" in window
  ) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if ("sync" in reg) {
        await (reg as any).sync.register("bsf-offline-sync");
      }
    } catch {
      // Background Sync not permitted or supported, graceful fallback to online listener
    }
  }

  // If already online, trigger immediate sync
  if (typeof navigator !== "undefined" && navigator.onLine) {
    syncOfflineQueue();
  }

  return mutation;
}

/**
 * Iterates through pending queued actions in FIFO order and synchronizes them with the backend.
 */
export async function syncOfflineQueue(): Promise<{ synced: number; failed: number }> {
  if (isSyncing || typeof window === "undefined" || !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  isSyncing = true;
  notifyQueueChanged();

  let syncedCount = 0;
  let failedCount = 0;

  try {
    const queue = await getQueuedMutations();
    const pendingItems = queue.filter((m) => m.status === "pending" || m.status === "failed");

    for (const item of pendingItems) {
      if (!navigator.onLine) break;

      await updateMutation(item.id, { status: "syncing" });
      notifyQueueChanged();

      try {
        const response = await fetch(item.url, {
          method: item.method,
          headers: {
            "Content-Type": "application/json",
            "X-Offline-Synced": "true",
          },
          body: JSON.stringify(item.payload),
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok || response.status === 200 || response.status === 201) {
          // Success: remove item from queue
          await removeQueuedMutation(item.id);
          syncedCount++;
        } else if (response.status >= 400 && response.status < 500) {
          // Client rejection (e.g. member deleted, validation error)
          // Mark as failed or drop if invalid
          console.warn(`[Sync] Mutation ${item.id} rejected with ${response.status}:`, data);
          await updateMutation(item.id, {
            status: "failed",
            lastError: data.error || `Client error (${response.status})`,
            retryCount: item.retryCount + 1,
          });
          failedCount++;
        } else {
          // Server error 5xx: retry later
          await updateMutation(item.id, {
            status: "pending",
            retryCount: item.retryCount + 1,
            lastError: data.error || "Server temporarily unavailable",
          });
        }
      } catch (err: any) {
        // Network failure while sending: reset to pending and exit loop
        await updateMutation(item.id, {
          status: "pending",
          retryCount: item.retryCount + 1,
          lastError: err?.message || "Network request failed",
        });
        break;
      }
    }
  } finally {
    isSyncing = false;
    notifyQueueChanged();
  }

  return { synced: syncedCount, failed: failedCount };
}

export function isQueueSyncing(): boolean {
  return isSyncing;
}

// Global browser listeners
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    console.log("[PWA Sync] Network online detected. Starting offline queue sync...");
    syncOfflineQueue();
  });

  // Listen for Service Worker messages (e.g. SW triggered sync)
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data && event.data.type === "SYNC_OFFLINE_QUEUE") {
        syncOfflineQueue();
      }
    });
  }
}
