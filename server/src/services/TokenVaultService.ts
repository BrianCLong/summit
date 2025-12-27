import { KeyService } from './security/KeyService.js';

export interface StoredOAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope?: string;
  tokenType?: string;
  refreshTokenRotatedAt?: string;
}

export class TokenVaultService {
  private store: Map<string, string> = new Map();

  storeTokens(connectionId: string, tokens: StoredOAuthTokens): void {
    // ENCRYPTION_KEY should be sourced from a KMS-backed secret in production.
    const encrypted = KeyService.encrypt(JSON.stringify(tokens));
    this.store.set(connectionId, encrypted);
  }

  getTokens(connectionId: string): StoredOAuthTokens | null {
    const encrypted = this.store.get(connectionId);
    if (!encrypted) {
      return null;
    }
    const decrypted = KeyService.decrypt(encrypted);
    return JSON.parse(decrypted) as StoredOAuthTokens;
  }

  rotateTokens(
    connectionId: string,
    updatedTokens: StoredOAuthTokens,
  ): void {
    this.storeTokens(connectionId, updatedTokens);
  }
}

export const tokenVaultService = new TokenVaultService();
