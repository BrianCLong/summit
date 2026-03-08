"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoOpProvider = void 0;
/**
 * No-op cache provider for testing
 */
class NoOpProvider {
    name = 'noop';
    async isAvailable() {
        return true;
    }
    async get(_key) {
        return null;
    }
    async set(_key, _value, _ttl) {
        // No-op
    }
    async delete(_key) {
        return false;
    }
    async exists(_key) {
        return false;
    }
    async deletePattern(_pattern) {
        return 0;
    }
    async mget(keys) {
        return keys.map(() => null);
    }
    async mset(_entries) {
        // No-op
    }
    async ttl(_key) {
        return -1;
    }
    async backup() {
        return "{}";
    }
    async restore(_backupStr) {
        // No-op
    }
    async close() {
        // No-op
    }
}
exports.NoOpProvider = NoOpProvider;
