import { KeyVersion } from './types.js';

/**
 * Interface for a key storage backend.
 * Handles persistence and retrieval of KeyVersion objects.
 */
export interface KeyStore {
  /**
   * Lists all keys or keys associated with a specific ID.
   * @param keyId - Optional key ID filter.
   * @returns Array of KeyVersion objects.
   */
  listKeys(keyId?: string): Promise<KeyVersion[]>;

  /**
   * Retrieves a specific version of a key.
   * @param keyId - The key ID.
   * @param version - The version number.
   * @returns The KeyVersion or undefined if not found.
   */
  getKey(keyId: string, version: number): Promise<KeyVersion | undefined>;

  /**
   * Saves a new key version.
   * @param key - The KeyVersion to save.
   */
  saveKey(key: KeyVersion): Promise<void>;

  /**
   * Updates an existing key version.
   * @param key - The KeyVersion to update.
   */
  updateKey(key: KeyVersion): Promise<void>;
}

/**
 * In-memory implementation of KeyStore for testing and development.
 */
export class InMemoryKeyStore implements KeyStore {
  private readonly store = new Map<string, Map<number, KeyVersion>>();

  /**
   * Lists stored keys.
   * @param keyId - Optional key ID to filter by.
   * @returns Array of KeyVersion objects.
   */
  async listKeys(keyId?: string): Promise<KeyVersion[]> {
    if (keyId) {
      return Array.from(this.store.get(keyId)?.values() ?? []);
    }
    const result: KeyVersion[] = [];
    for (const versions of this.store.values()) {
      result.push(...versions.values());
    }
    return result;
  }

  /**
   * Retrieves a specific key version.
   * @param keyId - The key ID.
   * @param version - The version number.
   * @returns The KeyVersion or undefined.
   */
  async getKey(
    keyId: string,
    version: number,
  ): Promise<KeyVersion | undefined> {
    return this.store.get(keyId)?.get(version);
  }

  /**
   * Saves a new key to the store.
   * @param key - The KeyVersion object.
   */
  async saveKey(key: KeyVersion): Promise<void> {
    const versions = this.store.get(key.id) ?? new Map<number, KeyVersion>();
    versions.set(key.version, { ...key });
    this.store.set(key.id, versions);
  }

  /**
   * Updates an existing key in the store.
   * @param key - The updated KeyVersion object.
   */
  async updateKey(key: KeyVersion): Promise<void> {
    const versions = this.store.get(key.id) ?? new Map<number, KeyVersion>();
    versions.set(key.version, { ...key });
    this.store.set(key.id, versions);
  }
}

/**
 * High-level manager for handling key operations like rotation and retrieval.
 * Uses a KeyStore for persistence.
 */
export class KeyManager {
  constructor(private readonly store: KeyStore) {}

  /**
   * Retrieves the currently active version of a key.
   * Returns the active key with the highest version number.
   * @param keyId - The key ID.
   * @returns The active KeyVersion or undefined.
   */
  async getActiveKey(keyId: string): Promise<KeyVersion | undefined> {
    const keys = await this.store.listKeys(keyId);
    return keys
      .filter((k) => k.isActive)
      .sort((a, b) => b.version - a.version)[0];
  }

  /**
   * Retrieves a specific key version.
   * @param keyId - The key ID.
   * @param version - The version number.
   * @returns The KeyVersion or undefined.
   */
  async getKey(
    keyId: string,
    version: number,
  ): Promise<KeyVersion | undefined> {
    return this.store.getKey(keyId, version);
  }

  /**
   * Lists all versions of a key, sorted by version number descending.
   * @param keyId - The key ID.
   * @returns Array of KeyVersion objects.
   */
  async listKeyVersions(keyId: string): Promise<KeyVersion[]> {
    const keys = await this.store.listKeys(keyId);
    return keys.sort((a, b) => b.version - a.version);
  }

  /**
   * Rotates a key by deprecating the current active version and creating a new one.
   * @param keyId - The key ID.
   * @param nextKey - Properties for the new key version.
   * @returns The newly created KeyVersion.
   */
  async rotateKey(
    keyId: string,
    nextKey: Omit<
      KeyVersion,
      'createdAt' | 'rotatedAt' | 'isActive' | 'id' | 'version'
    > & {
      version?: number;
      createdAt?: Date;
    },
  ): Promise<KeyVersion> {
    const existing = await this.store.listKeys(keyId);
    const currentActive = existing.find((k) => k.isActive);
    if (currentActive) {
      currentActive.isActive = false;
      currentActive.rotatedAt = new Date();
      await this.store.updateKey(currentActive);
    }

    const nextVersion =
      nextKey.version ??
      (existing.length ? Math.max(...existing.map((k) => k.version)) + 1 : 1);

    const version: KeyVersion = {
      ...nextKey,
      id: keyId,
      version: nextVersion,
      isActive: true,
      createdAt: nextKey.createdAt ?? new Date(),
    };

    await this.store.saveKey(version);
    return version;
  }

  /**
   * Registers a new key version.
   * If the new key is marked active, it deactivates other active versions of the same key.
   * @param key - The KeyVersion to register.
   */
  async registerKeyVersion(key: KeyVersion): Promise<void> {
    const existing = await this.store.listKeys(key.id);
    if (key.isActive) {
      for (const version of existing.filter(
        (v) => v.isActive && v.version !== key.version,
      )) {
        version.isActive = false;
        version.rotatedAt = new Date();
        await this.store.updateKey(version);
      }
    }
    await this.store.saveKey({ ...key });
  }
}
