import { HashedToken } from './types.js';

export class TokenStore {
  // Storage structure: Map<tenantId, Map<tokenString, HashedToken>>
  private static store: Map<string, Map<string, HashedToken>> = new Map();

  static addToken(token: HashedToken): void {
    if (!this.store.has(token.tenantId)) {
      this.store.set(token.tenantId, new Map());
    }
    this.store.get(token.tenantId)!.set(token.token, token);
  }

  static getTokens(tenantId: string): HashedToken[] {
    const tenantStore = this.store.get(tenantId);
    return tenantStore ? Array.from(tenantStore.values()) : [];
  }

  static hasToken(tenantId: string, tokenString: string): boolean {
    return this.store.get(tenantId)?.has(tokenString) || false;
  }

  static getToken(tenantId: string, tokenString: string): HashedToken | undefined {
    return this.store.get(tenantId)?.get(tokenString);
  }

  // Helper for MVP to clear state if needed
  static clear(): void {
    this.store.clear();
  }
}
