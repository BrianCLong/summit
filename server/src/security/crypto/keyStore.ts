import { KeyVersion } from './types.js';

export interface KeyStore {
  listKeys(keyId?: string): Promise<KeyVersion[]>;
  getKey(keyId: string, version: number): Promise<KeyVersion | undefined>;
  saveKey(key: KeyVersion): Promise<void>;
  updateKey(key: KeyVersion): Promise<void>;
}

export class InMemoryKeyStore implements KeyStore {
  private readonly store = new Map<string, Map<number, KeyVersion>>();

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

  async getKey(
    keyId: string,
    version: number,
  ): Promise<KeyVersion | undefined> {
    return this.store.get(keyId)?.get(version);
  }

  async saveKey(key: KeyVersion): Promise<void> {
    const versions = this.store.get(key.id) ?? new Map<number, KeyVersion>();
    versions.set(key.version, { ...key });
    this.store.set(key.id, versions);
  }

  async updateKey(key: KeyVersion): Promise<void> {
    const versions = this.store.get(key.id) ?? new Map<number, KeyVersion>();
    versions.set(key.version, { ...key });
    this.store.set(key.id, versions);
  }
}

export class KeyManager {
  constructor(private readonly store: KeyStore) {}

  async getActiveKey(keyId: string): Promise<KeyVersion | undefined> {
    const keys = await this.store.listKeys(keyId);
    return keys
      .filter((k) => k.isActive)
      .sort((a, b) => b.version - a.version)[0];
  }

  async getKey(
    keyId: string,
    version: number,
  ): Promise<KeyVersion | undefined> {
    return this.store.getKey(keyId, version);
  }

  async listKeyVersions(keyId: string): Promise<KeyVersion[]> {
    const keys = await this.store.listKeys(keyId);
    return keys.sort((a, b) => b.version - a.version);
  }

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
