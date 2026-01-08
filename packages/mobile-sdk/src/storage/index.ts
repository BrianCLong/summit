// Placeholder for storage module exports
export interface StorageConfig {
  encryptionKey?: string;
}

export interface PendingMutation {
  id: string;
  operation: string;
  payload: unknown;
  timestamp: number;
  retryCount: number;
}

export interface SyncStatus {
  lastSyncAt: number | null;
  pendingCount: number;
  isOnline: boolean;
}

// Stub implementations for offline sync
export async function addMutation(
  _mutation: Omit<PendingMutation, "id" | "timestamp" | "retryCount">
): Promise<string> {
  return crypto.randomUUID();
}

export async function getPendingMutations(): Promise<PendingMutation[]> {
  return [];
}

export async function deleteMutation(_id: string): Promise<void> {
  // No-op
}

export async function updateMutationRetry(_id: string, _retryCount: number): Promise<void> {
  // No-op
}

export async function setSyncStatus(_status: Partial<SyncStatus>): Promise<void> {
  // No-op
}

export async function getSyncStatus(): Promise<SyncStatus> {
  return { lastSyncAt: null, pendingCount: 0, isOnline: true };
}
