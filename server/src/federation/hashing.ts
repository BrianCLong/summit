import * as crypto from 'crypto';
import { IdentifierType } from './types.js';

export class IdentifierHasher {
  private static tenantSalts: Map<string, string> = new Map();

  private static getSalt(tenantId: string): string {
    if (!this.tenantSalts.has(tenantId)) {
      // For MVP, generate a deterministic salt based on tenantId
      // In production, this would be retrieved from a KMS or secure configuration
      const salt = crypto.createHash('sha256').update(tenantId + 'MVP_SALT_SEED_2025').digest('hex');
      this.tenantSalts.set(tenantId, salt);
    }
    return this.tenantSalts.get(tenantId)!;
  }

  static normalize(value: string, type: IdentifierType): string {
    let normalized = value.trim().toLowerCase();

    if (type === IdentifierType.PHONE) {
      // Basic E.164-ish normalization: remove non-digits
      normalized = normalized.replace(/[^\d+]/g, '');
    }
    // Additional normalization rules can be added here

    return normalized;
  }

  /**
   * Generates a deterministic HMAC-SHA256 hash for the identifier.
   */
  static hash(value: string, type: IdentifierType, tenantId: string): string {
    const normalized = this.normalize(value, type);
    const salt = this.getSalt(tenantId);
    return crypto.createHmac('sha256', salt).update(normalized).digest('hex');
  }
}
