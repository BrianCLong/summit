/**
 * Cross-platform storage utilities
 * Works with IndexedDB (web), AsyncStorage (React Native), and localStorage fallback
 */

import {openDB, DBSchema, IDBPDatabase} from 'idb';

interface IntelGraphDB extends DBSchema {
  entities: {
    key: string;
    value: {
      id: string;
      data: any;
      timestamp: number;
      ttl?: number;
    };
  };
  cases: {
    key: string;
    value: {
      id: string;
      data: any;
      timestamp: number;
      ttl?: number;
    };
  };
  mutations: {
    key: number;
    value: {
      id?: number;
      operation: string;
      variables: any;
      timestamp: number;
      retryCount: number;
      error?: string;
    };
    indexes: {'by-timestamp': number};
  };
  sync: {
    key: string;
    value: {
      key: string;
      lastSync: number;
      status: 'pending' | 'syncing' | 'completed' | 'failed';
      error?: string;
    };
  };
}

let db: IDBPDatabase<IntelGraphDB> | null = null;

export const initializeStorage = async (): Promise<void> => {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    console.warn('IndexedDB not supported');
    return;
  }

  db = await openDB<IntelGraphDB>('intelgraph-storage', 1, {
    upgrade(database) {
      // Entities store
      if (!database.objectStoreNames.contains('entities')) {
        database.createObjectStore('entities', {keyPath: 'id'});
      }

      // Cases store
      if (!database.objectStoreNames.contains('cases')) {
        database.createObjectStore('cases', {keyPath: 'id'});
      }

      // Mutations store
      if (!database.objectStoreNames.contains('mutations')) {
        const mutationsStore = database.createObjectStore('mutations', {
          keyPath: 'id',
          autoIncrement: true,
        });
        mutationsStore.createIndex('by-timestamp', 'timestamp');
      }

      // Sync store
      if (!database.objectStoreNames.contains('sync')) {
        database.createObjectStore('sync', {keyPath: 'key'});
      }
    },
  });
};

// Generic storage operations
export const storeData = async <T>(
  storeName: keyof IntelGraphDB,
  id: string,
  data: T,
  ttl?: number
): Promise<void> => {
  if (!db) await initializeStorage();
  if (!db) throw new Error('Database not initialized');

  await db.put(storeName as any, {
    id,
    data,
    timestamp: Date.now(),
    ttl,
  } as any);
};

export const getData = async <T>(
  storeName: keyof IntelGraphDB,
  id: string
): Promise<T | null> => {
  if (!db) await initializeStorage();
  if (!db) throw new Error('Database not initialized');

  const record = await db.get(storeName as any, id);

  if (!record) return null;

  // Check TTL
  if (record.ttl && Date.now() - record.timestamp > record.ttl) {
    await db.delete(storeName as any, id);
    return null;
  }

  return record.data as T;
};

export const deleteData = async (
  storeName: keyof IntelGraphDB,
  id: string
): Promise<void> => {
  if (!db) await initializeStorage();
  if (!db) throw new Error('Database not initialized');

  await db.delete(storeName as any, id);
};

export const clearStore = async (storeName: keyof IntelGraphDB): Promise<void> => {
  if (!db) await initializeStorage();
  if (!db) throw new Error('Database not initialized');

  await db.clear(storeName as any);
};

// Mutation queue operations
export const addMutation = async (operation: string, variables: any): Promise<number> => {
  if (!db) await initializeStorage();
  if (!db) throw new Error('Database not initialized');

  return await db.add('mutations', {
    operation,
    variables,
    timestamp: Date.now(),
    retryCount: 0,
  });
};

export const getPendingMutations = async (): Promise<any[]> => {
  if (!db) await initializeStorage();
  if (!db) throw new Error('Database not initialized');

  return await db.getAll('mutations');
};

export const deleteMutation = async (id: number): Promise<void> => {
  if (!db) await initializeStorage();
  if (!db) throw new Error('Database not initialized');

  await db.delete('mutations', id);
};

export const updateMutationRetry = async (id: number, error?: string): Promise<void> => {
  if (!db) await initializeStorage();
  if (!db) throw new Error('Database not initialized');

  const mutation = await db.get('mutations', id);
  if (mutation) {
    mutation.retryCount += 1;
    mutation.error = error;
    await db.put('mutations', mutation);
  }
};

// Sync status operations
export const setSyncStatus = async (
  key: string,
  status: 'pending' | 'syncing' | 'completed' | 'failed',
  error?: string
): Promise<void> => {
  if (!db) await initializeStorage();
  if (!db) throw new Error('Database not initialized');

  await db.put('sync', {
    key,
    lastSync: Date.now(),
    status,
    error,
  });
};

export const getSyncStatus = async (key: string): Promise<any | null> => {
  if (!db) await initializeStorage();
  if (!db) throw new Error('Database not initialized');

  return await db.get('sync', key);
};

// Storage estimates
export const getStorageEstimate = async (): Promise<{
  usage: number;
  quota: number;
  percentage: number;
} | null> => {
  if (typeof navigator === 'undefined' || !navigator.storage) {
    return null;
  }

  const estimate = await navigator.storage.estimate();
  const usage = estimate.usage || 0;
  const quota = estimate.quota || 0;
  const percentage = quota > 0 ? (usage / quota) * 100 : 0;

  return {usage, quota, percentage};
};
