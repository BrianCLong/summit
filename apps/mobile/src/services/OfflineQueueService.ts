import { MMKV } from 'react-native-mmkv';
import NetInfo from '@react-native-community/netinfo';
import { v4 as uuid } from 'uuid';
import type { Operation } from '@apollo/client';

import { SYNC_CONFIG } from '@/config';

const storage = new MMKV({ id: 'offline-queue' });

export interface OfflineMutation {
  id: string;
  operationName: string;
  query: string;
  variables: Record<string, unknown>;
  context: Record<string, unknown>;
  createdAt: string;
  retryCount: number;
  lastError?: string;
  priority: number;
}

const QUEUE_KEY = 'pending_mutations';

// Get all pending mutations
export const getPendingMutations = (): OfflineMutation[] => {
  const data = storage.getString(QUEUE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
};

// Queue a mutation for offline sync
export const queueOfflineMutation = (
  operation: Operation,
  priority: number = 0,
): string => {
  const id = uuid();
  const mutation: OfflineMutation = {
    id,
    operationName: operation.operationName || 'UnnamedMutation',
    query: operation.query.loc?.source.body || '',
    variables: operation.variables as Record<string, unknown>,
    context: {},
    createdAt: new Date().toISOString(),
    retryCount: 0,
    priority,
  };

  const mutations = getPendingMutations();
  mutations.push(mutation);

  // Sort by priority (higher first) then by creation time
  mutations.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  storage.set(QUEUE_KEY, JSON.stringify(mutations));

  console.log(`[OfflineQueue] Queued mutation: ${mutation.operationName}`);
  return id;
};

// Remove a mutation from the queue
export const removePendingMutation = (id: string): void => {
  const mutations = getPendingMutations().filter((m) => m.id !== id);
  storage.set(QUEUE_KEY, JSON.stringify(mutations));
};

// Update mutation retry count
export const updateMutationRetry = (id: string, error?: string): void => {
  const mutations = getPendingMutations();
  const index = mutations.findIndex((m) => m.id === id);

  if (index !== -1) {
    mutations[index].retryCount += 1;
    mutations[index].lastError = error;
    storage.set(QUEUE_KEY, JSON.stringify(mutations));
  }
};

// Check if mutation should be retried
export const shouldRetryMutation = (mutation: OfflineMutation): boolean => {
  return mutation.retryCount < SYNC_CONFIG.maxRetries;
};

// Get count of pending mutations
export const getPendingCount = (): number => {
  return getPendingMutations().length;
};

// Clear all pending mutations
export const clearPendingMutations = (): void => {
  storage.delete(QUEUE_KEY);
};

// Check if device is online
export const isOnline = async (): Promise<boolean> => {
  const state = await NetInfo.fetch();
  return state.isConnected === true && state.isInternetReachable === true;
};
