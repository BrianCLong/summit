"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecretsService = void 0;
const SecretManager_js_1 = require("../../lib/secrets/SecretManager.js");
class SecretsService {
    /**
     * Retrieves a secret by key.
     * @param key The logical name of the secret (e.g. "OPENAI_API_KEY")
     * @param purpose The purpose for accessing this secret (for audit logs)
     */
    static async getSecret(key, purpose = 'application_use') {
        const manager = SecretManager_js_1.SecretManager.getInstance();
        return manager.getSecret(key, { requester: 'SecretsService', purpose });
    }
    /**
     * Rotates a secret if supported by the provider.
     */
    static async rotateSecret(key) {
        const manager = SecretManager_js_1.SecretManager.getInstance();
        return manager.rotateSecret(key);
    }
}
exports.SecretsService = SecretsService;
