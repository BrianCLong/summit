"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenStore = void 0;
class TokenStore {
    // Storage structure: Map<tenantId, Map<tokenString, HashedToken>>
    static store = new Map();
    static addToken(token) {
        if (!this.store.has(token.tenantId)) {
            this.store.set(token.tenantId, new Map());
        }
        this.store.get(token.tenantId).set(token.token, token);
    }
    static getTokens(tenantId) {
        const tenantStore = this.store.get(tenantId);
        return tenantStore ? Array.from(tenantStore.values()) : [];
    }
    static hasToken(tenantId, tokenString) {
        return this.store.get(tenantId)?.has(tokenString) || false;
    }
    static getToken(tenantId, tokenString) {
        return this.store.get(tenantId)?.get(tokenString);
    }
    // Helper for MVP to clear state if needed
    static clear() {
        this.store.clear();
    }
}
exports.TokenStore = TokenStore;
