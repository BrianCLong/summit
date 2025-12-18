/**
 * Token Validator
 *
 * Validates JWT tokens with various security checks
 */

import { JWTManager, TokenPayload } from './jwt-manager.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('token-validator');

export interface ValidationOptions {
  checkExpiration?: boolean;
  checkIssuer?: boolean;
  checkAudience?: boolean;
  requiredScopes?: string[];
  requiredRoles?: string[];
}

export class TokenValidator {
  private jwtManager: JWTManager;
  private revokedTokens = new Set<string>();

  constructor(jwtManager: JWTManager) {
    this.jwtManager = jwtManager;
  }

  async validate(token: string, options: ValidationOptions = {}): Promise<TokenPayload> {
    // Check if token is revoked
    if (this.revokedTokens.has(token)) {
      throw new Error('Token has been revoked');
    }

    // Verify token signature and decode
    let payload: TokenPayload;

    try {
      payload = this.jwtManager.verifyAccessToken(token);
    } catch (error) {
      logger.error('Token validation failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }

    // Check required scopes
    if (options.requiredScopes && options.requiredScopes.length > 0) {
      if (!this.hasRequiredScopes(payload, options.requiredScopes)) {
        throw new Error('Token does not have required scopes');
      }
    }

    // Check required roles
    if (options.requiredRoles && options.requiredRoles.length > 0) {
      if (!this.hasRequiredRoles(payload, options.requiredRoles)) {
        throw new Error('Token does not have required roles');
      }
    }

    return payload;
  }

  revokeToken(token: string): void {
    this.revokedTokens.add(token);
    logger.info('Token revoked');
  }

  private hasRequiredScopes(payload: TokenPayload, requiredScopes: string[]): boolean {
    if (!payload.scopes) {
      return false;
    }

    return requiredScopes.every(scope => payload.scopes!.includes(scope));
  }

  private hasRequiredRoles(payload: TokenPayload, requiredRoles: string[]): boolean {
    if (!payload.roles) {
      return false;
    }

    return requiredRoles.every(role => payload.roles!.includes(role));
  }

  clearRevokedTokens(): void {
    this.revokedTokens.clear();
    logger.info('Revoked tokens cleared');
  }
}
