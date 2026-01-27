import { createHash } from 'crypto';
import { cfg } from '../config.js';

/**
 * @class PrivacyService
 * @description Provides utilities for PII masking, salting, and hashing 
 * to ensure privacy-preserving telemetry and logging.
 */
export class PrivacyService {
  private static instance: PrivacyService;
  private readonly salt: string;

  private constructor() {
    // In a real IC environment, the salt would come from a KMS or secure secret store.
    this.salt = cfg.TELEMETRY_SALT || 'summit-intel-graph-default-salt';
  }

  public static getInstance(): PrivacyService {
    if (!PrivacyService.instance) {
      PrivacyService.instance = new PrivacyService();
    }
    return PrivacyService.instance;
  }

  /**
   * @method anonymizeId
   * @description Deterministically anonymizes an ID using a salt and hash.
   * This allows for correlation without exposing the actual ID.
   */
  public anonymizeId(id: string): string {
    if (!id) return '';
    return createHash('sha256')
      .update(`${id}:${this.salt}`)
      .digest('hex')
      .substring(0, 16); // Shortened for log readability while maintaining collision resistance
  }

  /**
   * @method maskPII
   * @description Recursively scans an object and masks known PII keys.
   */
  public maskPII(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;

    const result = Array.isArray(obj) ? [] : {};
    const piiKeys = ['email', 'phone', 'address', 'password', 'token', 'secret', 'fullName'];

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (piiKeys.includes(key.toLowerCase())) {
          (result as any)[key] = '[MASKED]';
        } else if (typeof obj[key] === 'object') {
          (result as any)[key] = this.maskPII(obj[key]);
        } else {
          (result as any)[key] = obj[key];
        }
      }
    }

    return result;
  }

  /**
   * @method anonymizeEvent
   * @description Anonymizes standard sensitive fields in a telemetry event.
   */
  public anonymizeEvent(event: any): any {
    const cloned = this.maskPII({ ...event });

    // Standard ID anonymization
    const idFields = ['userId', 'actorId', 'principalId', 'agentId'];
    for (const field of idFields) {
      if (cloned[field]) {
        cloned[field] = this.anonymizeId(cloned[field]);
      }
    }

    return cloned;
  }
}

export const privacyService = PrivacyService.getInstance();
