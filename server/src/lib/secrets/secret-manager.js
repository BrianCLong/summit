"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigLoader = exports.VaultSecretManager = void 0;
const promises_1 = require("fs/promises");
class VaultSecretManager {
    vaultUrl;
    token;
    constructor(vaultUrl, token) {
        this.vaultUrl = vaultUrl;
        this.token = token;
    }
    async getSecret(key) {
        console.log(`[Vault] Fetching secret '${key}' from ${this.vaultUrl}...`);
        // Simulate auditing access
        console.log(`[Audit] Access to secret '${key}' logged.`);
        // Simulation: In real life, HTTP request to Vault.
        // Here: Read from a secure file mount (simulating K8s volume mount from Secret Store CSI)
        try {
            // Mock path
            if (process.env.MOCK_SECRETS_PATH) {
                const content = await (0, promises_1.readFile)(`${process.env.MOCK_SECRETS_PATH}/${key}`, 'utf-8');
                return content.trim();
            }
            return "mock-secret-value";
        }
        catch (e) {
            throw new Error(`Failed to fetch secret ${key}: ${e}`);
        }
    }
}
exports.VaultSecretManager = VaultSecretManager;
class ConfigLoader {
    secretManager;
    constructor(secretManager) {
        this.secretManager = secretManager;
    }
    async loadDatabaseConfig() {
        // No longer reading process.env.DB_PASSWORD directly!
        const dbPassword = await this.secretManager.getSecret("db-password");
        return {
            host: "postgres-prod",
            password: dbPassword
        };
    }
}
exports.ConfigLoader = ConfigLoader;
