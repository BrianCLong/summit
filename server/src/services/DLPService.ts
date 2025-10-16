/**
 * Data Loss Prevention (DLP) Service
 *
 * Implements automated DLP policies for the IntelGraph Maestro platform
 * including PII detection, data classification, and access controls.
 */

import logger from '../utils/logger.js';
import { CircuitBreaker } from '../utils/CircuitBreaker.js';
import { redisClient } from '../db/redis.js';

export interface DLPPolicy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: number;
  conditions: DLPCondition[];
  actions: DLPAction[];
  exemptions: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DLPCondition {
  type:
    | 'content_match'
    | 'field_match'
    | 'metadata_match'
    | 'user_role'
    | 'tenant_id';
  field?: string;
  pattern?: string;
  operator: 'contains' | 'matches' | 'equals' | 'starts_with' | 'ends_with';
  value: string | RegExp;
  caseSensitive?: boolean;
}

export interface DLPAction {
  type: 'block' | 'redact' | 'quarantine' | 'alert' | 'audit' | 'encrypt';
  severity: 'low' | 'medium' | 'high' | 'critical';
  notification?: {
    channels: ('email' | 'slack' | 'webhook')[];
    recipients: string[];
  };
  metadata?: Record<string, any>;
}

export interface DLPScanResult {
  policyId: string;
  matched: boolean;
  matchedConditions: DLPCondition[];
  confidence: number;
  recommendedActions: DLPAction[];
  metadata: {
    scannedAt: Date;
    scanDuration: number;
    contentSize: number;
    detectedEntities: string[];
  };
}

export interface DLPContext {
  userId: string;
  tenantId: string;
  userRole: string;
  operationType: 'read' | 'write' | 'delete' | 'export' | 'share';
  contentType: string;
  metadata?: Record<string, any>;
}

class DLPService {
  private policies: Map<string, DLPPolicy> = new Map();
  private circuitBreaker: CircuitBreaker;
  private readonly cachePrefix = 'dlp:';

  // Pre-defined PII patterns
  private readonly piiPatterns = {
    ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,
    creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    phone:
      /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
    ipAddress: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
    passport: /\b[A-Z]{1,2}[0-9]{6,9}\b/g,
    driverLicense: /\b[A-Z]{1,2}[0-9]{6,12}\b/g,
    bankAccount: /\b[0-9]{8,17}\b/g,
    taxId: /\b[0-9]{2}-[0-9]{7}\b/g,
    medicalRecord: /\b(MRN|mrn)[:\s]*[0-9]{6,12}\b/gi,
    apiKey: /\b[A-Za-z0-9]{32,}\b/g,
    bearerToken: /bearer\s+[A-Za-z0-9\-_=]+/gi,
    awsAccessKey: /AKIA[0-9A-Z]{16}/g,
    googleApiKey: /AIza[0-9A-Za-z\-_]{35}/g,
    slackToken: /xox[bpars]-[0-9]{12}-[0-9]{12}-[0-9a-zA-Z]{24,32}/g,
  };

  constructor() {
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      recoveryTimeout: 30000,
      monitoringPeriod: 60000,
    });

    this.initializeDefaultPolicies();
  }

  /**
   * Initialize default DLP policies for common PII and sensitive data
   */
  private initializeDefaultPolicies(): void {
    // PII Detection Policy
    this.addPolicy({
      id: 'pii-detection',
      name: 'PII Detection',
      description: 'Detect and protect personally identifiable information',
      enabled: true,
      priority: 1,
      conditions: [
        {
          type: 'content_match',
          pattern: 'pii_combined',
          operator: 'matches',
          value: this.createCombinedPIIRegex(),
        },
      ],
      actions: [
        {
          type: 'redact',
          severity: 'high',
          notification: {
            channels: ['slack', 'email'],
            recipients: ['security@intelgraph.ai', 'compliance@intelgraph.ai'],
          },
        },
        {
          type: 'audit',
          severity: 'high',
        },
      ],
      exemptions: ['system', 'admin'],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Credentials Detection Policy
    this.addPolicy({
      id: 'credentials-detection',
      name: 'Credentials Detection',
      description: 'Detect API keys, tokens, and other credentials',
      enabled: true,
      priority: 1,
      conditions: [
        {
          type: 'content_match',
          pattern: 'credentials',
          operator: 'matches',
          value:
            /(?:api[_-]?key|secret[_-]?key|access[_-]?token|bearer[_-]?token|password)["\s]*[:=]["\s]*[A-Za-z0-9\-_=+\/]{20,}/gi,
        },
      ],
      actions: [
        {
          type: 'block',
          severity: 'critical',
          notification: {
            channels: ['slack', 'webhook'],
            recipients: ['security-alerts@intelgraph.ai'],
          },
        },
      ],
      exemptions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Financial Data Policy
    this.addPolicy({
      id: 'financial-data',
      name: 'Financial Data Protection',
      description:
        'Protect credit cards, bank accounts, and financial information',
      enabled: true,
      priority: 2,
      conditions: [
        {
          type: 'content_match',
          pattern: 'financial',
          operator: 'matches',
          value: this.piiPatterns.creditCard,
        },
        {
          type: 'content_match',
          pattern: 'banking',
          operator: 'matches',
          value: this.piiPatterns.bankAccount,
        },
      ],
      actions: [
        {
          type: 'encrypt',
          severity: 'high',
        },
        {
          type: 'audit',
          severity: 'high',
        },
      ],
      exemptions: ['finance-team', 'compliance-officer'],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Healthcare Data Policy (HIPAA)
    this.addPolicy({
      id: 'healthcare-data',
      name: 'Healthcare Data Protection (HIPAA)',
      description: 'Protect medical records and healthcare information',
      enabled: true,
      priority: 1,
      conditions: [
        {
          type: 'content_match',
          pattern: 'medical',
          operator: 'matches',
          value: this.piiPatterns.medicalRecord,
        },
        {
          type: 'metadata_match',
          field: 'contentType',
          operator: 'contains',
          value: 'medical',
        },
      ],
      actions: [
        {
          type: 'block',
          severity: 'critical',
          notification: {
            channels: ['email', 'slack'],
            recipients: ['hipaa-compliance@intelgraph.ai'],
          },
        },
      ],
      exemptions: ['healthcare-provider'],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    logger.info('DLP default policies initialized', {
      component: 'DLPService',
      policyCount: this.policies.size,
    });
  }

  /**
   * Scan content for DLP policy violations
   */
  async scanContent(
    content: string | Record<string, any>,
    context: DLPContext,
  ): Promise<DLPScanResult[]> {
    const startTime = Date.now();

    try {
      return await this.circuitBreaker.execute(async () => {
        const results: DLPScanResult[] = [];
        const contentStr =
          typeof content === 'string' ? content : JSON.stringify(content);

        // Check cache first
        const cacheKey = `${this.cachePrefix}scan:${this.hashContent(contentStr)}:${context.tenantId}`;
        const cachedResult = await this.getCachedResult(cacheKey);

        if (cachedResult) {
          logger.debug('DLP scan cache hit', {
            component: 'DLPService',
            contentSize: contentStr.length,
            tenantId: context.tenantId,
          });
          return cachedResult;
        }

        // Apply policies in priority order
        const sortedPolicies = Array.from(this.policies.values())
          .filter((policy) => policy.enabled)
          .sort((a, b) => a.priority - b.priority);

        for (const policy of sortedPolicies) {
          // Check if user/tenant is exempted
          if (this.isExempted(policy, context)) {
            continue;
          }

          const result = await this.evaluatePolicy(policy, contentStr, context);
          if (result.matched) {
            results.push(result);

            // If this is a blocking policy, stop further evaluation
            if (policy.actions.some((action) => action.type === 'block')) {
              break;
            }
          }
        }

        // Cache results for 5 minutes
        await this.cacheResult(cacheKey, results, 300);

        const scanDuration = Date.now() - startTime;

        // Log scan results
        logger.info('DLP content scan completed', {
          component: 'DLPService',
          tenantId: context.tenantId,
          userId: context.userId,
          scanDuration,
          contentSize: contentStr.length,
          violationCount: results.length,
          highSeverityViolations: results.filter((r) =>
            r.recommendedActions.some(
              (a) => a.severity === 'high' || a.severity === 'critical',
            ),
          ).length,
        });

        return results;
      });
    } catch (error) {
      logger.error('DLP scan failed', {
        component: 'DLPService',
        error: error.message,
        tenantId: context.tenantId,
        userId: context.userId,
      });
      throw error;
    }
  }

  /**
   * Apply DLP actions to content
   */
  async applyActions(
    content: string | Record<string, any>,
    scanResults: DLPScanResult[],
    context: DLPContext,
  ): Promise<{
    processedContent: string | Record<string, any>;
    actionsApplied: string[];
    blocked: boolean;
  }> {
    const actionsApplied: string[] = [];
    let processedContent = content;
    let blocked = false;

    for (const result of scanResults) {
      for (const action of result.recommendedActions) {
        try {
          switch (action.type) {
            case 'block':
              blocked = true;
              actionsApplied.push('blocked');
              await this.sendNotification(action, result, context);
              break;

            case 'redact':
              processedContent = await this.redactContent(
                processedContent,
                result,
              );
              actionsApplied.push('redacted');
              break;

            case 'encrypt':
              processedContent = await this.encryptSensitiveData(
                processedContent,
                result,
              );
              actionsApplied.push('encrypted');
              break;

            case 'quarantine':
              await this.quarantineContent(content, result, context);
              actionsApplied.push('quarantined');
              break;

            case 'alert':
              await this.sendAlert(action, result, context);
              actionsApplied.push('alerted');
              break;

            case 'audit':
              await this.auditViolation(result, context);
              actionsApplied.push('audited');
              break;
          }
        } catch (error) {
          logger.error('Failed to apply DLP action', {
            component: 'DLPService',
            action: action.type,
            error: error.message,
            policyId: result.policyId,
            tenantId: context.tenantId,
          });
        }
      }
    }

    return {
      processedContent,
      actionsApplied,
      blocked,
    };
  }

  /**
   * Add a new DLP policy
   */
  addPolicy(policy: Omit<DLPPolicy, 'id'> & { id?: string }): void {
    const policyId = policy.id || `policy-${Date.now()}`;
    const fullPolicy: DLPPolicy = {
      ...policy,
      id: policyId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.policies.set(policyId, fullPolicy);

    logger.info('DLP policy added', {
      component: 'DLPService',
      policyId,
      name: policy.name,
      enabled: policy.enabled,
    });
  }

  /**
   * Get DLP policy by ID
   */
  getPolicy(policyId: string): DLPPolicy | undefined {
    return this.policies.get(policyId);
  }

  /**
   * List all DLP policies
   */
  listPolicies(): DLPPolicy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Update DLP policy
   */
  updatePolicy(policyId: string, updates: Partial<DLPPolicy>): boolean {
    const policy = this.policies.get(policyId);
    if (!policy) {
      return false;
    }

    const updatedPolicy = {
      ...policy,
      ...updates,
      id: policyId, // Ensure ID doesn't change
      updatedAt: new Date(),
    };

    this.policies.set(policyId, updatedPolicy);

    logger.info('DLP policy updated', {
      component: 'DLPService',
      policyId,
      changes: Object.keys(updates),
    });

    return true;
  }

  /**
   * Delete DLP policy
   */
  deletePolicy(policyId: string): boolean {
    const deleted = this.policies.delete(policyId);

    if (deleted) {
      logger.info('DLP policy deleted', {
        component: 'DLPService',
        policyId,
      });
    }

    return deleted;
  }

  // Private helper methods

  private createCombinedPIIRegex(): RegExp {
    const patterns = Object.values(this.piiPatterns)
      .map((pattern) => pattern.source)
      .join('|');
    return new RegExp(patterns, 'gi');
  }

  private async evaluatePolicy(
    policy: DLPPolicy,
    content: string,
    context: DLPContext,
  ): Promise<DLPScanResult> {
    const startTime = Date.now();
    const matchedConditions: DLPCondition[] = [];
    let confidence = 0;

    for (const condition of policy.conditions) {
      if (await this.evaluateCondition(condition, content, context)) {
        matchedConditions.push(condition);
        confidence += 1 / policy.conditions.length;
      }
    }

    const matched = matchedConditions.length > 0;
    const detectedEntities = matched
      ? this.extractDetectedEntities(content)
      : [];

    return {
      policyId: policy.id,
      matched,
      matchedConditions,
      confidence,
      recommendedActions: matched ? policy.actions : [],
      metadata: {
        scannedAt: new Date(),
        scanDuration: Date.now() - startTime,
        contentSize: content.length,
        detectedEntities,
      },
    };
  }

  private async evaluateCondition(
    condition: DLPCondition,
    content: string,
    context: DLPContext,
  ): Promise<boolean> {
    switch (condition.type) {
      case 'content_match':
        return this.evaluateContentMatch(condition, content);
      case 'field_match':
        return this.evaluateFieldMatch(condition, content);
      case 'metadata_match':
        return this.evaluateMetadataMatch(condition, context);
      case 'user_role':
        return condition.value === context.userRole;
      case 'tenant_id':
        return condition.value === context.tenantId;
      default:
        return false;
    }
  }

  private evaluateContentMatch(
    condition: DLPCondition,
    content: string,
  ): boolean {
    const pattern =
      condition.value instanceof RegExp
        ? condition.value
        : new RegExp(
            condition.value as string,
            condition.caseSensitive ? 'g' : 'gi',
          );

    switch (condition.operator) {
      case 'contains':
        return content.includes(condition.value as string);
      case 'matches':
        return pattern.test(content);
      case 'equals':
        return content === condition.value;
      case 'starts_with':
        return content.startsWith(condition.value as string);
      case 'ends_with':
        return content.endsWith(condition.value as string);
      default:
        return false;
    }
  }

  private evaluateFieldMatch(
    condition: DLPCondition,
    content: string,
  ): boolean {
    try {
      const data = JSON.parse(content);
      const fieldValue = condition.field ? data[condition.field] : content;
      return this.evaluateContentMatch(
        { ...condition, type: 'content_match' },
        fieldValue,
      );
    } catch {
      return false;
    }
  }

  private evaluateMetadataMatch(
    condition: DLPCondition,
    context: DLPContext,
  ): boolean {
    if (!condition.field || !context.metadata) {
      return false;
    }

    const metadataValue = context.metadata[condition.field];
    return this.evaluateContentMatch(
      { ...condition, type: 'content_match' },
      String(metadataValue || ''),
    );
  }

  private isExempted(policy: DLPPolicy, context: DLPContext): boolean {
    return (
      policy.exemptions.includes(context.userRole) ||
      policy.exemptions.includes(context.userId) ||
      policy.exemptions.includes(context.tenantId)
    );
  }

  private extractDetectedEntities(content: string): string[] {
    const entities: string[] = [];

    for (const [entityType, pattern] of Object.entries(this.piiPatterns)) {
      if (pattern.test(content)) {
        entities.push(entityType);
      }
    }

    return entities;
  }

  private async redactContent(
    content: string | Record<string, any>,
    result: DLPScanResult,
  ): Promise<string | Record<string, any>> {
    if (typeof content === 'string') {
      let redacted = content;

      // Apply redaction patterns based on detected entities
      for (const entityType of result.metadata.detectedEntities) {
        const pattern =
          this.piiPatterns[entityType as keyof typeof this.piiPatterns];
        if (pattern) {
          redacted = redacted.replace(pattern, '[REDACTED]');
        }
      }

      return redacted;
    }

    // For objects, recursively redact string fields
    const redactedObject = { ...content };
    for (const [key, value] of Object.entries(redactedObject)) {
      if (typeof value === 'string') {
        redactedObject[key] = (await this.redactContent(
          value,
          result,
        )) as string;
      }
    }

    return redactedObject;
  }

  private async encryptSensitiveData(
    content: string | Record<string, any>,
    result: DLPScanResult,
  ): Promise<string | Record<string, any>> {
    // Simplified encryption - in production, use proper encryption service
    const encrypted = Buffer.from(JSON.stringify(content)).toString('base64');
    return `[ENCRYPTED:${encrypted.substring(0, 20)}...]`;
  }

  private async quarantineContent(
    content: string | Record<string, any>,
    result: DLPScanResult,
    context: DLPContext,
  ): Promise<void> {
    const quarantineKey = `${this.cachePrefix}quarantine:${context.tenantId}:${Date.now()}`;

    await redisClient.setex(
      quarantineKey,
      86400 * 7,
      JSON.stringify({
        content,
        scanResult: result,
        context,
        quarantinedAt: new Date(),
      }),
    );

    logger.warn('Content quarantined due to DLP violation', {
      component: 'DLPService',
      quarantineKey,
      policyId: result.policyId,
      tenantId: context.tenantId,
      userId: context.userId,
    });
  }

  private async sendNotification(
    action: DLPAction,
    result: DLPScanResult,
    context: DLPContext,
  ): Promise<void> {
    if (!action.notification) return;

    const message = {
      title: 'DLP Policy Violation Detected',
      severity: action.severity,
      details: {
        policyId: result.policyId,
        tenantId: context.tenantId,
        userId: context.userId,
        detectedEntities: result.metadata.detectedEntities,
        timestamp: new Date(),
      },
    };

    // Send to configured channels
    for (const channel of action.notification.channels) {
      try {
        switch (channel) {
          case 'slack':
            // Integration with Slack webhook would go here
            break;
          case 'email':
            // Integration with email service would go here
            break;
          case 'webhook':
            // Send to configured webhooks
            break;
        }
      } catch (error) {
        logger.error('Failed to send DLP notification', {
          component: 'DLPService',
          channel,
          error: error.message,
        });
      }
    }
  }

  private async sendAlert(
    action: DLPAction,
    result: DLPScanResult,
    context: DLPContext,
  ): Promise<void> {
    await this.sendNotification(action, result, context);
  }

  private async auditViolation(
    result: DLPScanResult,
    context: DLPContext,
  ): Promise<void> {
    const auditEntry = {
      timestamp: new Date(),
      eventType: 'dlp_violation',
      severity: 'high',
      tenantId: context.tenantId,
      userId: context.userId,
      operationType: context.operationType,
      policyId: result.policyId,
      detectedEntities: result.metadata.detectedEntities,
      confidence: result.confidence,
    };

    logger.warn('DLP violation audit entry', {
      component: 'DLPService',
      ...auditEntry,
    });

    // Store in audit log database/system
  }

  private hashContent(content: string): string {
    // Simple hash for caching - in production use crypto.createHash
    return Buffer.from(content).toString('base64').substring(0, 16);
  }

  private async getCachedResult(key: string): Promise<DLPScanResult[] | null> {
    try {
      const cached = await redisClient.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  }

  private async cacheResult(
    key: string,
    results: DLPScanResult[],
    ttl: number,
  ): Promise<void> {
    try {
      await redisClient.setex(key, ttl, JSON.stringify(results));
    } catch (error) {
      logger.warn('Failed to cache DLP results', {
        component: 'DLPService',
        error: error.message,
      });
    }
  }
}

export const dlpService = new DLPService();
export default dlpService;
