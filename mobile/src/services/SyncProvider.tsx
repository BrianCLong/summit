import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import * as TaskManager from "expo-task-manager";
import * as BackgroundFetch from "expo-background-fetch";
import * as Network from "expo-network";
import {
  ensureOfflineStore,
  enqueuePayload,
  readOldest,
  deleteRecords,
  countQueue,
  OutboundRecord,
} from "./offlineStore";

const SYNC_TASK = "summit-background-sync";
const DEFAULT_BATCH_SIZE = 25;

export type SyncStatus = "idle" | "running" | "error" | "offline" | "conflict";

export type SyncContextValue = {
  lastSync?: Date;
  queueSize: number;
  status: SyncStatus;
  lastError?: string;
  lowDataMode: boolean;
  setLowDataMode: (enabled: boolean) => void;
  enqueue: (payload: Record<string, unknown>) => Promise<void>;
  syncNow: () => Promise<void>;
};

const SyncContext = createContext<SyncContextValue>({
  enqueue: async () => {},
  syncNow: async () => {},
  queueSize: 0,
  status: "idle",
  lowDataMode: false,
  setLowDataMode: () => {},
});

async function sendPayload(
  payload: Record<string, unknown>
): Promise<{ success: boolean; conflict?: boolean }> {
  // Mock API interaction - In production, use authenticated fetch
  console.log("Sending payload:", payload);
  await new Promise((resolve) => setTimeout(resolve, 50));

  // No random conflicts. Conflict logic should be driven by server response (409).
  return { success: true };
}

async function resolveConflict(record: OutboundRecord): Promise<void> {
  // Strategy: "Server Wins" but archive local copy
  console.log("Resolving conflict for record", record.id);
}

async function syncBatch(records: OutboundRecord[]): Promise<number> {
  const sentIds: number[] = [];
  for (const record of records) {
    const result = await sendPayload(record.payload);

    if (result.success) {
      sentIds.push(record.id);
    } else if (result.conflict) {
      await resolveConflict(record);
      sentIds.push(record.id);
    }
  }
  await deleteRecords(sentIds);
  return sentIds.length;
}

async function runSync(
  setters: {
    setStatus: (status: SyncStatus) => void;
    setLastSync: (date: Date) => void;
    setLastError: (error?: string) => void;
    setQueueSize: (size: number) => void;
  },
  lowDataMode: boolean
): Promise<void> {
  const { setStatus, setLastSync, setLastError, setQueueSize } = setters;

  const network = await Network.getNetworkStateAsync();
  if (!network.isConnected) {
    setStatus("offline");
    return;
  }

  if (lowDataMode && network.type !== Network.NetworkStateType.WIFI) {
    setLastError("Low Data Mode: Waiting for WiFi");
    return;
  }

  setStatus("running");
  setLastError(undefined);

  try {
    let hasMore = true;
    while (hasMore) {
      const items = await readOldest(DEFAULT_BATCH_SIZE);
      if (!items.length) {
        hasMore = false;
      } else {
        await syncBatch(items);
      }
    }
    setLastSync(new Date());
    const remaining = await countQueue();
    setQueueSize(remaining);
  } catch (error) {
    setLastError((error as Error).message);
    setStatus("error");
    return;
  }

  setStatus("idle");
}

async function registerBackgroundTask(sync: () => Promise<void>): Promise<void> {
  const taskDefined = TaskManager.isTaskDefined(SYNC_TASK);
  if (!taskDefined) {
    TaskManager.defineTask(SYNC_TASK, async () => {
      try {
        await sync();
        return BackgroundFetch.BackgroundFetchResult.NewData;
      } catch (error) {
        console.error("Background sync failed", error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    });
  }

  const status = await BackgroundFetch.getStatusAsync();
  if (
    status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
    status === BackgroundFetch.BackgroundFetchStatus.Denied
  ) {
    console.warn("Background fetch unavailable");
    return;
  }

  const isRegistered = await TaskManager.isTaskRegisteredAsync(SYNC_TASK);
  if (!isRegistered) {
    await BackgroundFetch.registerTaskAsync(SYNC_TASK, {
      minimumInterval: 15 * 60,
      stopOnTerminate: false,
      startOnBoot: true,
    });
  }
}

export function SyncProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [lastSync, setLastSync] = useState<Date>();
  const [queueSize, setQueueSize] = useState(0);
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [lastError, setLastError] = useState<string>();
  const [lowDataMode, setLowDataMode] = useState(false);

  const syncNow = useCallback(async () => {
    await ensureOfflineStore();
    await runSync({ setLastSync, setStatus, setLastError, setQueueSize }, lowDataMode);
  }, [lowDataMode]);

  useEffect(() => {
    ensureOfflineStore()
      .then(() => countQueue())
      .then((total) => setQueueSize(total))
      .then(() => registerBackgroundTask(syncNow))
      .then(() => syncNow())
      .catch((error) => setLastError((error as Error).message));
  }, [syncNow]);

  const value = useMemo<SyncContextValue>(
    () => ({
      lastSync,
      queueSize,
      status,
      lastError,
      lowDataMode,
      setLowDataMode,
      enqueue: async (payload) => {
        await ensureOfflineStore();
        await enqueuePayload(payload);
        setQueueSize((prev) => prev + 1);
      },
      syncNow,
    }),
    [lastError, lastSync, queueSize, status, lowDataMode, syncNow]
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncContextValue {
  return useContext(SyncContext);
}
