import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Network from 'expo-network';
import { ensureOfflineStore, enqueuePayload, readOldest, deleteRecords, countQueue, OutboundRecord } from './offlineStore';

const SYNC_TASK = 'summit-background-sync';
const DEFAULT_BATCH_SIZE = 25;

export type SyncStatus = 'idle' | 'running' | 'error';

export type SyncContextValue = {
  lastSync?: Date;
  queueSize: number;
  status: SyncStatus;
  lastError?: string;
  enqueue: (payload: Record<string, unknown>) => Promise<void>;
  syncNow: () => Promise<void>;
};

const SyncContext = createContext<SyncContextValue>({
  enqueue: async () => {},
  syncNow: async () => {},
  queueSize: 0,
  status: 'idle'
});

async function sendPayload(payload: Record<string, unknown>): Promise<void> {
  // TODO: replace with authenticated fetch to Summit API when available.
  await new Promise(resolve => setTimeout(resolve, 50));
  console.log('Synced payload', payload);
}

async function syncBatch(records: OutboundRecord[]): Promise<number> {
  const sentIds: number[] = [];
  for (const record of records) {
    await sendPayload(record.payload);
    sentIds.push(record.id);
  }
  await deleteRecords(sentIds);
  return sentIds.length;
}

async function runSync(setters: {
  setStatus: (status: SyncStatus) => void;
  setLastSync: (date: Date) => void;
  setLastError: (error?: string) => void;
  setQueueSize: (size: number) => void;
}): Promise<void> {
  const { setStatus, setLastSync, setLastError, setQueueSize } = setters;
  const network = await Network.getNetworkStateAsync();
  if (!network.isConnected || network.type === Network.NetworkStateType.NONE) {
    setLastError('Waiting for connectivity');
    return;
  }

  setStatus('running');
  setLastError(undefined);

  try {
    let processed = 0;
    let hasMore = true;
    while (hasMore) {
      const items = await readOldest(DEFAULT_BATCH_SIZE);
      if (!items.length) {
        hasMore = false;
      } else {
        processed += await syncBatch(items);
      }
    }
    setLastSync(new Date());
    setQueueSize(await countQueue());
  } catch (error) {
    setLastError((error as Error).message);
    setStatus('error');
    return;
  }

  setStatus('idle');
}

async function registerBackgroundTask(sync: () => Promise<void>): Promise<void> {
  const taskDefined = TaskManager.isTaskDefined(SYNC_TASK);
  if (!taskDefined) {
    TaskManager.defineTask(SYNC_TASK, async () => {
      try {
        await sync();
        return BackgroundFetch.BackgroundFetchResult.NewData;
      } catch (error) {
        console.error('Background sync failed', error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    });
  }

  const status = await BackgroundFetch.getStatusAsync();
  if (status === BackgroundFetch.BackgroundFetchStatus.Restricted || status === BackgroundFetch.BackgroundFetchStatus.Denied) {
    console.warn('Background fetch unavailable');
    return;
  }

  const isRegistered = await TaskManager.isTaskRegisteredAsync(SYNC_TASK);
  if (!isRegistered) {
    await BackgroundFetch.registerTaskAsync(SYNC_TASK, {
      minimumInterval: 10 * 60,
      stopOnTerminate: false,
      startOnBoot: true
    });
  }
}

export function SyncProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [lastSync, setLastSync] = useState<Date>();
  const [queueSize, setQueueSize] = useState(0);
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [lastError, setLastError] = useState<string>();

  const syncNow = async () => {
    await ensureOfflineStore();
    await runSync({ setLastSync, setStatus, setLastError, setQueueSize });
  };

  useEffect(() => {
    ensureOfflineStore()
      .then(() => countQueue())
      .then(total => setQueueSize(total))
      .then(() => registerBackgroundTask(syncNow))
      .then(() => syncNow())
      .catch(error => setLastError((error as Error).message));
  }, []);

  const value = useMemo<SyncContextValue>(() => ({
    lastSync,
    queueSize,
    status,
    lastError,
    enqueue: async payload => {
      await ensureOfflineStore();
      await enqueuePayload(payload);
      setQueueSize(prev => prev + 1);
    },
    syncNow
  }), [lastError, lastSync, queueSize, status]);

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncContextValue {
  return useContext(SyncContext);
}
