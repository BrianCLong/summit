/**
 * Shared types for mobile SDK
 */

export interface Entity {
  id: string;
  type: string;
  name: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface Case {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'closed' | 'archived';
  assignees: string[];
  entities: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SyncStatus {
  lastSync: number;
  pendingChanges: number;
  status: 'idle' | 'syncing' | 'error';
  error?: string;
}

export interface NetworkStatus {
  isOnline: boolean;
  isConnected: boolean;
  type?: string;
}

export interface CacheOptions {
  ttl?: number;
  maxAge?: number;
  maxEntries?: number;
}

export interface RetryOptions {
  maxRetries: number;
  retryDelay: number;
  backoff?: 'linear' | 'exponential';
}
