"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvSecretProvider = void 0;
class EnvSecretProvider {
    async initialize() {
        // No-op for env vars
    }
    async getSecret(key) {
        return process.env[key] || null;
    }
    async setSecret(key, value) {
        process.env[key] = value;
    }
    async rotateSecret(key) {
        throw new Error('Rotation not supported for EnvSecretProvider');
    }
}
exports.EnvSecretProvider = EnvSecretProvider;
