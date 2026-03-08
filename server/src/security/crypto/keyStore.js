"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeyManager = exports.InMemoryKeyStore = void 0;
class InMemoryKeyStore {
    store = new Map();
    async listKeys(keyId) {
        if (keyId) {
            return Array.from(this.store.get(keyId)?.values() ?? []);
        }
        const result = [];
        for (const versions of Array.from(this.store.values())) {
            result.push(...versions.values());
        }
        return result;
    }
    async getKey(keyId, version) {
        return this.store.get(keyId)?.get(version);
    }
    async saveKey(key) {
        const versions = this.store.get(key.id) ?? new Map();
        versions.set(key.version, { ...key });
        this.store.set(key.id, versions);
    }
    async updateKey(key) {
        const versions = this.store.get(key.id) ?? new Map();
        versions.set(key.version, { ...key });
        this.store.set(key.id, versions);
    }
}
exports.InMemoryKeyStore = InMemoryKeyStore;
class KeyManager {
    store;
    constructor(store) {
        this.store = store;
    }
    async getActiveKey(keyId) {
        const keys = await this.store.listKeys(keyId);
        return keys
            .filter((k) => k.isActive)
            .sort((a, b) => b.version - a.version)[0];
    }
    async getKey(keyId, version) {
        return this.store.getKey(keyId, version);
    }
    async listKeyVersions(keyId) {
        const keys = await this.store.listKeys(keyId);
        return keys.sort((a, b) => b.version - a.version);
    }
    async rotateKey(keyId, nextKey) {
        const existing = await this.store.listKeys(keyId);
        const currentActive = existing.find((k) => k.isActive);
        if (currentActive) {
            currentActive.isActive = false;
            currentActive.rotatedAt = new Date();
            await this.store.updateKey(currentActive);
        }
        const nextVersion = nextKey.version ??
            (existing.length ? Math.max(...existing.map((k) => k.version)) + 1 : 1);
        const version = {
            ...nextKey,
            id: keyId,
            version: nextVersion,
            isActive: true,
            createdAt: nextKey.createdAt ?? new Date(),
        };
        await this.store.saveKey(version);
        return version;
    }
    async registerKeyVersion(key) {
        const existing = await this.store.listKeys(key.id);
        if (key.isActive) {
            for (const version of existing.filter((v) => v.isActive && v.version !== key.version)) {
                version.isActive = false;
                version.rotatedAt = new Date();
                await this.store.updateKey(version);
            }
        }
        await this.store.saveKey({ ...key });
    }
}
exports.KeyManager = KeyManager;
