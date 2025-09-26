const DB_NAME = 'summit-offline';
const DB_VERSION = 1;
const RESOURCE_STORE = 'resources';
const MUTATION_STORE = 'mutations';

export type StoredResource<T = unknown> = {
  key: string;
  data: T;
  updatedAt: number;
};

export type QueuedMutation = {
  id: string;
  body: unknown;
  createdAt: number;
  attempts: number;
};

let dbPromise: Promise<IDBDatabase> | null = null;

function hasIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined';
}

function getDb(): Promise<IDBDatabase> {
  if (!hasIndexedDb()) {
    return Promise.reject(new Error('IndexedDB is not available in this environment.'));
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(RESOURCE_STORE)) {
          db.createObjectStore(RESOURCE_STORE, { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains(MUTATION_STORE)) {
          db.createObjectStore(MUTATION_STORE, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Failed to open offline database.'));
    });
  }

  return dbPromise;
}

function runTransaction<T>(
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => void,
): Promise<T> {
  if (!hasIndexedDb()) {
    return Promise.resolve(undefined as T);
  }

  return getDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);

        transaction.oncomplete = () => {
          resolve(undefined as T);
        };
        transaction.onerror = () => {
          reject(transaction.error ?? new Error('Offline transaction failed.'));
        };

        operation(store);
      }),
  );
}

export async function setCachedResource<T>(key: string, data: T): Promise<void> {
  if (!hasIndexedDb()) return;

  const record: StoredResource<T> = {
    key,
    data,
    updatedAt: Date.now(),
  };

  await runTransaction<void>(RESOURCE_STORE, 'readwrite', (store) => {
    store.put(record);
  });
}

export async function getCachedResource<T>(key: string): Promise<StoredResource<T> | undefined> {
  if (!hasIndexedDb()) return undefined;

  const db = await getDb();
  return new Promise<StoredResource<T> | undefined>((resolve, reject) => {
    const transaction = db.transaction(RESOURCE_STORE, 'readonly');
    const store = transaction.objectStore(RESOURCE_STORE);
    const request = store.get(key);

    request.onsuccess = () => {
      resolve(request.result as StoredResource<T> | undefined);
    };
    request.onerror = () => reject(request.error ?? new Error('Failed to read offline cache.'));
  });
}

export async function clearCachedResource(key: string): Promise<void> {
  if (!hasIndexedDb()) return;

  await runTransaction<void>(RESOURCE_STORE, 'readwrite', (store) => {
    store.delete(key);
  });
}

export async function queueMutation(body: unknown): Promise<QueuedMutation | undefined> {
  if (!hasIndexedDb()) return undefined;

  const record: QueuedMutation = {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `offline-${Date.now()}`,
    body,
    createdAt: Date.now(),
    attempts: 0,
  };

  await runTransaction<void>(MUTATION_STORE, 'readwrite', (store) => {
    store.put(record);
  });

  return record;
}

export async function getQueuedMutations(): Promise<QueuedMutation[]> {
  if (!hasIndexedDb()) return [];

  const db = await getDb();
  return new Promise<QueuedMutation[]>((resolve, reject) => {
    const transaction = db.transaction(MUTATION_STORE, 'readonly');
    const store = transaction.objectStore(MUTATION_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve((request.result as QueuedMutation[]) ?? []);
    };
    request.onerror = () => reject(request.error ?? new Error('Failed to read queued mutations.'));
  });
}

export async function deleteQueuedMutation(id: string): Promise<void> {
  if (!hasIndexedDb()) return;

  await runTransaction<void>(MUTATION_STORE, 'readwrite', (store) => {
    store.delete(id);
  });
}

export async function incrementMutationAttempts(id: string): Promise<void> {
  if (!hasIndexedDb()) return;

  const db = await getDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(MUTATION_STORE, 'readwrite');
    const store = transaction.objectStore(MUTATION_STORE);
    const request = store.get(id);

    request.onsuccess = () => {
      const existing = request.result as QueuedMutation | undefined;
      if (existing) {
        existing.attempts += 1;
        store.put(existing);
      }
      resolve();
    };
    request.onerror = () => reject(request.error ?? new Error('Failed to update queued mutation.'));
  });
}

export async function getQueuedMutationCount(): Promise<number> {
  if (!hasIndexedDb()) return 0;

  const db = await getDb();
  return new Promise<number>((resolve, reject) => {
    const transaction = db.transaction(MUTATION_STORE, 'readonly');
    const store = transaction.objectStore(MUTATION_STORE);
    const request = store.getAllKeys();

    request.onsuccess = () => {
      resolve((request.result as IDBValidKey[])?.length ?? 0);
    };
    request.onerror = () => reject(request.error ?? new Error('Failed to count queued mutations.'));
  });
}
