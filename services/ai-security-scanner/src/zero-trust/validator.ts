/**
 * Zero Trust Validator - Continuous verification for security operations
 *
 * Implements zero-trust principles for all security scanning and remediation:
 * - Never trust, always verify
 * - Least privilege access
 * - Assume breach mentality
 * - Continuous validation
 */

import { createHash, randomUUID } from 'node:crypto';
import type { ZeroTrustContext, AccessEvent, AuditEntry } from '../types.js';
import { ComplianceLogger } from '../compliance/compliance-logger.js';

export interface ZeroTrustConfig {
  maxSessionDuration: number; // milliseconds
  riskThreshold: number; // 0-100
  requireMFA: boolean;
  geoFencing: boolean;
  allowedLocations?: string[];
  deviceTrustRequired: boolean;
  continuousValidation: boolean;
  validationInterval: number; // milliseconds
}

export interface ValidationResult {
  allowed: boolean;
  reason: string;
  riskScore: number;
  requiredActions?: string[];
  validUntil?: Date;
}

export interface DeviceTrust {
  deviceId: string;
  trustLevel: 'high' | 'medium' | 'low' | 'untrusted';
  lastVerified: Date;
  attestations: Attestation[];
}

interface Attestation {
  type: 'hardware' | 'software' | 'configuration' | 'compliance';
  status: 'valid' | 'invalid' | 'expired';
  verifiedAt: Date;
  expiresAt: Date;
}

export class ZeroTrustValidator {
  private config: ZeroTrustConfig;
  private logger: ComplianceLogger;
  private activeSessions: Map<string, ZeroTrustContext> = new Map();
  private deviceTrust: Map<string, DeviceTrust> = new Map();

  constructor(config: Partial<ZeroTrustConfig> = {}) {
    this.config = {
      maxSessionDuration: 3600000, // 1 hour
      riskThreshold: 70,
      requireMFA: true,
      geoFencing: true,
      allowedLocations: [],
      deviceTrustRequired: true,
      continuousValidation: true,
      validationInterval: 300000, // 5 minutes
      ...config,
    };

    this.logger = new ComplianceLogger({
      serviceName: 'zero-trust-validator',
      enableZeroTrust: true,
      retentionDays: 2555,
    });
  }

  /**
   * Validate access request against zero-trust principles
   */
  async validateAccess(
    context: ZeroTrustContext,
    requestedResource: string,
    requestedAction: string
  ): Promise<ValidationResult> {
    const validationId = randomUUID();

    // Check session validity
    const sessionCheck = this.validateSession(context);
    if (!sessionCheck.valid) {
      await this.logAccessDecision(context, requestedResource, requestedAction, 'deny', sessionCheck.reason);
      return {
        allowed: false,
        reason: sessionCheck.reason,
        riskScore: 100,
        requiredActions: ['re-authenticate'],
      };
    }

    // Check device trust
    if (this.config.deviceTrustRequired) {
      const deviceCheck = await this.validateDevice(context.deviceId);
      if (!deviceCheck.valid) {
        await this.logAccessDecision(context, requestedResource, requestedAction, 'deny', deviceCheck.reason);
        return {
          allowed: false,
          reason: deviceCheck.reason,
          riskScore: 90,
          requiredActions: ['verify-device', 'contact-admin'],
        };
      }
    }

    // Check geo-fencing
    if (this.config.geoFencing) {
      const geoCheck = this.validateLocation(context.location);
      if (!geoCheck.valid) {
        await this.logAccessDecision(context, requestedResource, requestedAction, 'deny', geoCheck.reason);
        return {
          allowed: false,
          reason: geoCheck.reason,
          riskScore: 85,
          requiredActions: ['vpn-required', 'location-verification'],
        };
      }
    }

    // Calculate risk score
    const riskScore = this.calculateRiskScore(context, requestedResource, requestedAction);

    // Check if risk exceeds threshold
    if (riskScore > this.config.riskThreshold) {
      await this.logAccessDecision(context, requestedResource, requestedAction, 'challenge', 'high-risk');
      return {
        allowed: false,
        reason: 'Risk score exceeds threshold - additional verification required',
        riskScore,
        requiredActions: this.config.requireMFA ? ['mfa-challenge'] : ['step-up-auth'],
      };
    }

    // Check permissions
    const permCheck = this.validatePermissions(context.permissions, requestedResource, requestedAction);
    if (!permCheck.valid) {
      await this.logAccessDecision(context, requestedResource, requestedAction, 'deny', permCheck.reason);
      return {
        allowed: false,
        reason: permCheck.reason,
        riskScore,
        requiredActions: ['request-access'],
      };
    }

    // Access granted
    await this.logAccessDecision(context, requestedResource, requestedAction, 'allow', 'all-checks-passed');

    const validUntil = new Date(Date.now() + this.config.validationInterval);

    // Record access event
    this.recordAccessEvent(context, requestedResource, requestedAction, 'allowed');

    return {
      allowed: true,
      reason: 'Access granted - all zero-trust checks passed',
      riskScore,
      validUntil,
    };
  }

  /**
   * Validate session is still active and not expired
   */
  private validateSession(context: ZeroTrustContext): { valid: boolean; reason: string } {
    const sessionAge = Date.now() - context.authenticatedAt.getTime();

    if (sessionAge > this.config.maxSessionDuration) {
      return { valid: false, reason: 'Session expired' };
    }

    // Check for anomalies in access history
    if (context.accessHistory.length > 0) {
      const deniedRecently = context.accessHistory
        .filter((e) => e.timestamp.getTime() > Date.now() - 300000) // Last 5 minutes
        .filter((e) => e.result === 'denied').length;

      if (deniedRecently > 5) {
        return { valid: false, reason: 'Excessive denied requests - possible attack' };
      }
    }

    return { valid: true, reason: '' };
  }

  /**
   * Validate device trust status
   */
  private async validateDevice(deviceId: string): Promise<{ valid: boolean; reason: string }> {
    const trust = this.deviceTrust.get(deviceId);

    if (!trust) {
      return { valid: false, reason: 'Device not registered or trusted' };
    }

    if (trust.trustLevel === 'untrusted') {
      return { valid: false, reason: 'Device marked as untrusted' };
    }

    // Check attestation validity
    const validAttestations = trust.attestations.filter(
      (a) => a.status === 'valid' && a.expiresAt.getTime() > Date.now()
    );

    if (validAttestations.length === 0) {
      return { valid: false, reason: 'Device attestations expired or invalid' };
    }

    // Check if device verification is stale
    const verificationAge = Date.now() - trust.lastVerified.getTime();
    if (verificationAge > 86400000) {
      // 24 hours
      return { valid: false, reason: 'Device verification expired - re-verification required' };
    }

    return { valid: true, reason: '' };
  }

  /**
   * Validate location against geo-fencing rules
   */
  private validateLocation(location: string): { valid: boolean; reason: string } {
    if (!this.config.allowedLocations || this.config.allowedLocations.length === 0) {
      return { valid: true, reason: '' };
    }

    const isAllowed = this.config.allowedLocations.some((allowed) =>
      location.toLowerCase().includes(allowed.toLowerCase())
    );

    if (!isAllowed) {
      return { valid: false, reason: `Access from location '${location}' not permitted` };
    }

    return { valid: true, reason: '' };
  }

  /**
   * Calculate risk score based on context
   */
  private calculateRiskScore(
    context: ZeroTrustContext,
    resource: string,
    action: string
  ): number {
    let score = context.riskScore;

    // Increase risk for sensitive operations
    const sensitiveActions = ['delete', 'modify', 'export', 'admin'];
    if (sensitiveActions.some((a) => action.toLowerCase().includes(a))) {
      score += 15;
    }

    // Increase risk for sensitive resources
    const sensitiveResources = ['secrets', 'credentials', 'pii', 'classified'];
    if (sensitiveResources.some((r) => resource.toLowerCase().includes(r))) {
      score += 20;
    }

    // Check access patterns
    const recentAccess = context.accessHistory.filter(
      (e) => e.timestamp.getTime() > Date.now() - 3600000 // Last hour
    );

    // Unusual volume
    if (recentAccess.length > 100) {
      score += 10;
    }

    // High denial rate
    const denialRate = recentAccess.filter((e) => e.result === 'denied').length / Math.max(recentAccess.length, 1);
    if (denialRate > 0.3) {
      score += 15;
    }

    return Math.min(100, score);
  }

  /**
   * Validate user has required permissions
   */
  private validatePermissions(
    permissions: string[],
    resource: string,
    action: string
  ): { valid: boolean; reason: string } {
    // Check for wildcard permission
    if (permissions.includes('*') || permissions.includes('admin:*')) {
      return { valid: true, reason: '' };
    }

    // Check specific permission
    const requiredPerm = `${resource}:${action}`;
    const hasPermission = permissions.some((p) => {
      if (p === requiredPerm) return true;
      if (p.endsWith(':*') && requiredPerm.startsWith(p.slice(0, -1))) return true;
      return false;
    });

    if (!hasPermission) {
      return { valid: false, reason: `Missing permission: ${requiredPerm}` };
    }

    return { valid: true, reason: '' };
  }

  /**
   * Record access event for audit trail
   */
  private recordAccessEvent(
    context: ZeroTrustContext,
    resource: string,
    action: string,
    result: AccessEvent['result']
  ): void {
    const event: AccessEvent = {
      timestamp: new Date(),
      resource,
      action,
      result,
    };

    context.accessHistory.push(event);

    // Trim old history
    const cutoff = Date.now() - 86400000; // Keep 24 hours
    context.accessHistory = context.accessHistory.filter((e) => e.timestamp.getTime() > cutoff);
  }

  /**
   * Log access decision for compliance
   */
  private async logAccessDecision(
    context: ZeroTrustContext,
    resource: string,
    action: string,
    decision: 'allow' | 'deny' | 'challenge',
    reason: string
  ): Promise<void> {
    await this.logger.logZeroTrustValidation(context, decision);
  }

  /**
   * Register or update device trust
   */
  async registerDevice(deviceId: string, attestations: Attestation[]): Promise<void> {
    const trustLevel = this.calculateDeviceTrust(attestations);

    this.deviceTrust.set(deviceId, {
      deviceId,
      trustLevel,
      lastVerified: new Date(),
      attestations,
    });

    await this.logger.logAction('device-registration', 'register-device', {
      deviceId,
      trustLevel,
      attestationCount: attestations.length,
    });
  }

  /**
   * Calculate device trust level based on attestations
   */
  private calculateDeviceTrust(attestations: Attestation[]): DeviceTrust['trustLevel'] {
    const validCount = attestations.filter((a) => a.status === 'valid').length;
    const totalCount = attestations.length;

    if (totalCount === 0) return 'untrusted';

    const ratio = validCount / totalCount;

    if (ratio >= 0.9 && attestations.some((a) => a.type === 'hardware')) {
      return 'high';
    }
    if (ratio >= 0.7) {
      return 'medium';
    }
    if (ratio >= 0.5) {
      return 'low';
    }

    return 'untrusted';
  }

  /**
   * Create a new zero-trust session
   */
  createSession(
    userId: string,
    deviceId: string,
    location: string,
    permissions: string[]
  ): ZeroTrustContext {
    const sessionId = randomUUID();

    const context: ZeroTrustContext = {
      sessionId,
      userId,
      deviceId,
      location,
      riskScore: 0,
      authenticatedAt: new Date(),
      permissions,
      accessHistory: [],
    };

    this.activeSessions.set(sessionId, context);

    return context;
  }

  /**
   * Terminate a session
   */
  async terminateSession(sessionId: string, reason: string): Promise<void> {
    const context = this.activeSessions.get(sessionId);

    if (context) {
      await this.logger.logAction(sessionId, 'session-terminated', {
        userId: context.userId,
        reason,
        accessCount: context.accessHistory.length,
      });

      this.activeSessions.delete(sessionId);
    }
  }
}
