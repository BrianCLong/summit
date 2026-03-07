import type { IObjectStore } from "./types.js";

interface StoreEntry {
  value: string;
  expiresAt?: number;
}

export class InMemoryObjectStore implements IObjectStore {
  private readonly store = new Map<string, StoreEntry>();

  async put(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.store.set(key, { value, expiresAt });
  }

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }
}
