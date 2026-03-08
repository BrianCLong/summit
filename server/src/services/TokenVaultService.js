"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenVaultService = exports.TokenVaultService = void 0;
const KeyService_js_1 = require("./security/KeyService.js");
class TokenVaultService {
    store = new Map();
    storeTokens(connectionId, tokens) {
        // ENCRYPTION_KEY should be sourced from a KMS-backed secret in production.
        const encrypted = KeyService_js_1.KeyService.encrypt(JSON.stringify(tokens));
        this.store.set(connectionId, encrypted);
    }
    getTokens(connectionId) {
        const encrypted = this.store.get(connectionId);
        if (!encrypted) {
            return null;
        }
        const decrypted = KeyService_js_1.KeyService.decrypt(encrypted);
        return JSON.parse(decrypted);
    }
    rotateTokens(connectionId, updatedTokens) {
        this.storeTokens(connectionId, updatedTokens);
    }
}
exports.TokenVaultService = TokenVaultService;
exports.tokenVaultService = new TokenVaultService();
