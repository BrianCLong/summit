import { Mandate, MandateVerificationResult, Scope, Limits } from './types';
import { randomUUID } from 'crypto';

export class MandateService {
  private mandates: Map<string, Mandate> = new Map();

  constructor() {}

  createMandate(
    issuer: string,
    description: string,
    scopes: Scope[],
    limits: Limits,
    ttlSeconds: number = 3600
  ): Mandate {
    const now = new Date();
    const mandate: Mandate = {
      id: randomUUID(),
      issuedAt: now,
      expiresAt: new Date(now.getTime() + ttlSeconds * 1000),
      issuer,
      description,
      scopes,
      limits,
    };

    this.mandates.set(mandate.id, mandate);
    return mandate;
  }

  getMandate(id: string): Mandate | undefined {
    return this.mandates.get(id);
  }

  verifyMandate(id: string, requiredScope?: Scope): MandateVerificationResult {
    const mandate = this.mandates.get(id);

    if (!mandate) {
      return { valid: false, reason: 'Mandate not found' };
    }

    const now = new Date();
    if (now > mandate.expiresAt) {
      return { valid: false, reason: 'Mandate expired' };
    }

    if (requiredScope) {
      const hasScope = mandate.scopes.some(
        (s) => s.type === requiredScope.type && s.value === requiredScope.value
      );
      if (!hasScope) {
        return { valid: false, reason: `Missing required scope: ${requiredScope.type}:${requiredScope.value}` };
      }
    }

    return { valid: true, mandate };
  }

  revokeMandate(id: string): boolean {
    return this.mandates.delete(id);
  }
}
