import logger from '../config/logger';
import { randomUUID } from 'crypto';

/**
 * Context for secret access
 */
export interface SecretContext {
  userId: string;
  role: string;
  purpose: string;
  ipAddress?: string;
}

/**
 * SecretManager
 *
 * Centralized manager for accessing sensitive secrets with:
 * - Audit logging
 * - "Break-glass" access control
 * - OPA validation (simulated/placeholder)
 */
export class SecretManager {
  private static instance: SecretManager;
  private secrets: Map<string, string> = new Map();

  private constructor() {
    // Initialize with process.env
    // In a real system, this might fetch from Vault/AWS Secrets Manager
    // For now, we seed from env but control access
    this.seedFromEnv();
  }

  public static getInstance(): SecretManager {
    if (!SecretManager.instance) {
      SecretManager.instance = new SecretManager();
    }
    return SecretManager.instance;
  }

  private seedFromEnv() {
    // Load known sensitive keys
    const sensitiveKeys = [
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'OPENAI_API_KEY',
      'NEO4J_PASSWORD',
      'POSTGRES_PASSWORD',
      'REDIS_PASSWORD',
      'ENCRYPTION_KEY'
    ];

    for (const key of sensitiveKeys) {
      if (process.env[key]) {
        this.secrets.set(key, process.env[key]!);
      }
    }

    // Support rotation for JWT
    if (process.env.JWT_SECRET_OLD) {
        this.secrets.set('JWT_SECRET_OLD', process.env.JWT_SECRET_OLD);
    }
  }

  /**
   * Get a secret with audit logging and policy check
   */
  public getSecret(key: string, context: SecretContext): string | undefined {
    this.validateAccess(key, context);

    logger.debug({
      msg: 'Secret accessed',
      key,
      userId: context.userId,
      purpose: context.purpose
    });

    return this.secrets.get(key);
  }

  /**
   * Break-glass access
   * Logs a high-severity security alert.
   * Only allows admins.
   */
  public getSecretBreakGlass(key: string, context: SecretContext): string | undefined {
    // 1. Strict OPA Check (Simulated)
    if (context.role !== 'ADMIN') {
      logger.error({
        msg: 'Break-glass access denied',
        key,
        userId: context.userId,
        role: context.role
      });
      throw new Error('Access Denied: Break-glass requires ADMIN role');
    }

    // 2. High-severity Audit Log
    logger.error({ // Use ERROR level to trigger alerts
      msg: 'SECURITY ALERT: BREAK-GLASS SECRET ACCESS',
      key,
      userId: context.userId,
      purpose: context.purpose,
      ip: context.ipAddress,
      timestamp: new Date().toISOString()
    });

    return this.secrets.get(key);
  }

  private validateAccess(key: string, context: SecretContext) {
    // Placeholder for OPA check
    // In production: await opa.evaluatePolicy('secrets/access', { key, user: context })

    // Basic invariant: Context must exist
    if (!context || !context.userId) {
       throw new Error('Access Denied: specific context required for secret access');
    }
  }
}
