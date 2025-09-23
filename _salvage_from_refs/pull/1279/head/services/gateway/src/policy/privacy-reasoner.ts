/**
 * Privacy Policy Reasoner
 *
 * Enforces retention tiers, purpose tags, and privacy controls via OPA
 * policies. Implements data protection requirements with automatic
 * classification and retention management.
 */

import { Pool } from 'pg';
import { Redis } from 'ioredis';
import { logger } from '../utils/logger';

interface PrivacyPolicy {
  id: string;
  name: string;
  version: string;
  rules: PrivacyRule[];
  defaultRetention: RetentionTier;
  effectiveDate: Date;
  expiryDate?: Date;
  metadata: Record<string, any>;
}

interface PrivacyRule {
  id: string;
  name: string;
  condition: string; // OPA Rego condition
  action: PrivacyAction;
  priority: number;
  tags: string[];
  purpose: DataPurpose[];
  retention: RetentionTier;
  redactionLevel?: RedactionLevel;
}

interface PrivacyAction {
  type: 'allow' | 'deny' | 'redact' | 'encrypt' | 'anonymize' | 'log_only';
  parameters?: Record<string, any>;
  reason?: string;
}

interface DataClassification {
  level: 'public' | 'internal' | 'confidential' | 'restricted';
  categories: DataCategory[];
  personalData: boolean;
  sensitiveData: boolean;
  geographicRestrictions?: string[];
}

interface RetentionPolicy {
  tier: RetentionTier;
  duration: number; // days
  afterExpiry: 'delete' | 'anonymize' | 'archive';
  legalHoldExempt: boolean;
  reviewRequired: boolean;
}

interface PolicyDecision {
  allowed: boolean;
  action: PrivacyAction;
  appliedRules: string[];
  reason: string;
  retention: RetentionPolicy;
  redactionRequired: boolean;
  metadata: Record<string, any>;
}

type RetentionTier = 'short-30d' | 'medium-1y' | 'long-7y' | 'permanent' | 'legal-hold';
type DataPurpose = 'analytics' | 'marketing' | 'operations' | 'legal' | 'security' | 'research';
type DataCategory = 'pii' | 'financial' | 'health' | 'biometric' | 'location' | 'behavioral' | 'communication';
type RedactionLevel = 'none' | 'partial' | 'full' | 'k-anonymity' | 'differential-privacy';

export class PrivacyPolicyReasoner {
  private db: Pool;
  private redis: Redis;
  private policies: Map<string, PrivacyPolicy>;
  private opa: any; // OPA client

  // Default retention policies
  private static readonly DEFAULT_RETENTION_POLICIES: Record<RetentionTier, RetentionPolicy> = {
    'short-30d': {
      tier: 'short-30d',
      duration: 30,
      afterExpiry: 'delete',
      legalHoldExempt: false,
      reviewRequired: false
    },
    'medium-1y': {
      tier: 'medium-1y',
      duration: 365,
      afterExpiry: 'anonymize',
      legalHoldExempt: false,
      reviewRequired: true
    },
    'long-7y': {
      tier: 'long-7y',
      duration: 2555, // 7 years
      afterExpiry: 'archive',
      legalHoldExempt: true,
      reviewRequired: true
    },
    'permanent': {
      tier: 'permanent',
      duration: -1, // No expiry
      afterExpiry: 'archive',
      legalHoldExempt: true,
      reviewRequired: true
    },
    'legal-hold': {
      tier: 'legal-hold',
      duration: -1, // No expiry until hold is lifted
      afterExpiry: 'archive',
      legalHoldExempt: false,
      reviewRequired: true
    }
  };

  // PII detection patterns
  private static readonly PII_PATTERNS = {
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    phone: /(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g,
    ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,
    creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
    ipAddress: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
    coordinates: /[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)/g
  };

  constructor(db: Pool, redis: Redis, opaUrl?: string) {
    this.db = db;
    this.redis = redis;
    this.policies = new Map();

    // Initialize OPA client
    if (opaUrl) {
      // Initialize OPA client (placeholder)
      this.opa = { url: opaUrl };
    }

    this.loadPolicies();
  }

  /**
   * Evaluate privacy policy for a data operation
   */
  async evaluatePolicy(
    operation: {
      type: 'read' | 'write' | 'export' | 'delete' | 'share';
      data: any;
      context: {
        userId: string;
        tenantId: string;
        purpose: DataPurpose[];
        requestedBy?: string;
        externalRecipient?: string;
      };
    }
  ): Promise<PolicyDecision> {
    try {
      // Classify the data
      const classification = await this.classifyData(operation.data);

      // Get applicable policies
      const applicablePolicies = await this.getApplicablePolicies(
        operation.context.tenantId,
        classification
      );

      // Evaluate each policy rule
      let decision: PolicyDecision = {
        allowed: false,
        action: { type: 'deny', reason: 'No matching policy found' },
        appliedRules: [],
        reason: 'Default deny',
        retention: PrivacyPolicyReasoner.DEFAULT_RETENTION_POLICIES['short-30d'],
        redactionRequired: false,
        metadata: {}
      };

      for (const policy of applicablePolicies) {
        for (const rule of policy.rules.sort((a, b) => b.priority - a.priority)) {
          const ruleDecision = await this.evaluateRule(rule, operation, classification);

          if (ruleDecision.matches) {
            decision = {
              allowed: rule.action.type === 'allow',
              action: rule.action,
              appliedRules: [...decision.appliedRules, rule.id],
              reason: rule.action.reason || rule.name,
              retention: PrivacyPolicyReasoner.DEFAULT_RETENTION_POLICIES[rule.retention],
              redactionRequired: rule.redactionLevel !== 'none',
              metadata: {
                ...decision.metadata,
                ruleId: rule.id,
                policyId: policy.id,
                classification,
                redactionLevel: rule.redactionLevel
              }
            };

            // Stop at first matching rule (highest priority)
            break;
          }
        }

        if (decision.appliedRules.length > 0) {
          break;
        }
      }

      // Apply additional checks for sensitive operations
      if (operation.type === 'export' && classification.personalData) {
        decision = await this.applyExportRestrictions(decision, operation, classification);
      }

      // Log the decision for audit
      await this.logPolicyDecision(operation, classification, decision);

      return decision;

    } catch (error) {
      logger.error('Privacy policy evaluation failed:', error);

      // Fail secure - deny by default
      return {
        allowed: false,
        action: { type: 'deny', reason: 'Policy evaluation failed' },
        appliedRules: [],
        reason: 'System error - default deny',
        retention: PrivacyPolicyReasoner.DEFAULT_RETENTION_POLICIES['short-30d'],
        redactionRequired: false,
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Classify data content for privacy assessment
   */
  private async classifyData(data: any): Promise<DataClassification> {
    const dataString = JSON.stringify(data);
    const categories: DataCategory[] = [];
    let personalData = false;
    let sensitiveData = false;

    // Check for PII patterns
    for (const [category, pattern] of Object.entries(PrivacyPolicyReasoner.PII_PATTERNS)) {
      if (pattern.test(dataString)) {
        personalData = true;

        switch (category) {
          case 'email':
          case 'phone':
            categories.push('pii');
            break;
          case 'ssn':
          case 'creditCard':
            categories.push('financial');
            sensitiveData = true;
            break;
          case 'coordinates':
            categories.push('location');
            break;
        }
      }
    }

    // Check for health-related keywords
    const healthKeywords = ['medical', 'health', 'diagnosis', 'treatment', 'prescription', 'symptom'];
    if (healthKeywords.some(keyword => dataString.toLowerCase().includes(keyword))) {
      categories.push('health');
      sensitiveData = true;
    }

    // Check for financial keywords
    const financialKeywords = ['bank', 'account', 'payment', 'transaction', 'income', 'salary'];
    if (financialKeywords.some(keyword => dataString.toLowerCase().includes(keyword))) {
      categories.push('financial');
      sensitiveData = true;
    }

    // Determine classification level
    let level: DataClassification['level'] = 'public';
    if (sensitiveData) {
      level = 'restricted';
    } else if (personalData) {
      level = 'confidential';
    } else if (categories.length > 0) {
      level = 'internal';
    }

    return {
      level,
      categories: [...new Set(categories)], // Remove duplicates
      personalData,
      sensitiveData
    };
  }

  /**
   * Get applicable policies for tenant and data classification
   */
  private async getApplicablePolicies(
    tenantId: string,
    classification: DataClassification
  ): Promise<PrivacyPolicy[]> {
    // Get tenant-specific policies
    const tenantPolicies = Array.from(this.policies.values()).filter(
      policy => policy.metadata.tenantId === tenantId || policy.metadata.global === true
    );

    // Filter by classification level
    return tenantPolicies.filter(policy => {
      const policyLevel = policy.metadata.minClassificationLevel || 'public';
      const levelHierarchy = ['public', 'internal', 'confidential', 'restricted'];

      return levelHierarchy.indexOf(classification.level) >= levelHierarchy.indexOf(policyLevel);
    });
  }

  /**
   * Evaluate a specific privacy rule
   */
  private async evaluateRule(
    rule: PrivacyRule,
    operation: any,
    classification: DataClassification
  ): Promise<{ matches: boolean; reason?: string }> {
    try {
      // Simple rule evaluation (in production, use OPA)
      const context = {
        operation,
        classification,
        rule
      };

      // Evaluate OPA condition (simplified for now)
      const matches = await this.evaluateOPACondition(rule.condition, context);

      return { matches };

    } catch (error) {
      logger.error('Rule evaluation failed:', error);
      return { matches: false, reason: 'Rule evaluation error' };
    }
  }

  /**
   * Apply export-specific restrictions
   */
  private async applyExportRestrictions(
    decision: PolicyDecision,
    operation: any,
    classification: DataClassification
  ): Promise<PolicyDecision> {
    // Check if export contains sensitive data
    if (classification.sensitiveData) {
      // Require additional approval for sensitive data exports
      decision.metadata.requiresApproval = true;
      decision.metadata.approvalReason = 'Export contains sensitive personal data';
    }

    // Check export destination
    if (operation.context.externalRecipient) {
      // External sharing requires higher scrutiny
      decision.redactionRequired = true;
      decision.metadata.redactionLevel = 'k-anonymity';
    }

    // Apply geographic restrictions
    if (classification.geographicRestrictions) {
      decision.metadata.geographicRestrictions = classification.geographicRestrictions;
    }

    return decision;
  }

  /**
   * Simple OPA condition evaluation (placeholder)
   */
  private async evaluateOPACondition(condition: string, context: any): Promise<boolean> {
    // In production, this would call OPA with the condition and context
    // For now, implement basic pattern matching

    try {
      // Parse simple conditions
      if (condition.includes('data.operation.type == "export"')) {
        return context.operation.type === 'export';
      }

      if (condition.includes('data.classification.personalData == true')) {
        return context.classification.personalData === true;
      }

      if (condition.includes('data.classification.level == "restricted"')) {
        return context.classification.level === 'restricted';
      }

      // Default to false for unrecognized conditions
      return false;

    } catch (error) {
      logger.error('OPA condition evaluation failed:', error);
      return false;
    }
  }

  /**
   * Log policy decision for audit trail
   */
  private async logPolicyDecision(
    operation: any,
    classification: DataClassification,
    decision: PolicyDecision
  ): Promise<void> {
    try {
      const auditRecord = {
        timestamp: new Date(),
        operationType: operation.type,
        userId: operation.context.userId,
        tenantId: operation.context.tenantId,
        dataClassification: classification,
        policyDecision: decision,
        dataHash: this.hashData(operation.data)
      };

      // Store in audit log
      await this.db.query(`
        INSERT INTO privacy_audit_log (
          timestamp,
          operation_type,
          user_id,
          tenant_id,
          data_classification,
          policy_decision,
          data_hash
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        auditRecord.timestamp,
        auditRecord.operationType,
        auditRecord.userId,
        auditRecord.tenantId,
        JSON.stringify(auditRecord.dataClassification),
        JSON.stringify(auditRecord.policyDecision),
        auditRecord.dataHash
      ]);

      // Cache recent decisions for performance
      await this.redis.setex(
        `privacy_decision:${auditRecord.dataHash}`,
        300, // 5 minutes
        JSON.stringify(decision)
      );

    } catch (error) {
      logger.error('Failed to log privacy decision:', error);
      // Don't fail the operation for logging errors
    }
  }

  /**
   * Apply data redaction based on policy decision
   */
  async applyRedaction(
    data: any,
    redactionLevel: RedactionLevel,
    classification: DataClassification
  ): Promise<any> {
    if (redactionLevel === 'none') {
      return data;
    }

    const redactedData = JSON.parse(JSON.stringify(data)); // Deep clone

    switch (redactionLevel) {
      case 'partial':
        return this.applyPartialRedaction(redactedData, classification);

      case 'full':
        return this.applyFullRedaction(redactedData, classification);

      case 'k-anonymity':
        return this.applyKAnonymity(redactedData, classification);

      case 'differential-privacy':
        return this.applyDifferentialPrivacy(redactedData, classification);

      default:
        return redactedData;
    }
  }

  /**
   * Apply partial redaction (mask sensitive fields)
   */
  private applyPartialRedaction(data: any, classification: DataClassification): any {
    const dataString = JSON.stringify(data);
    let redactedString = dataString;

    // Redact emails
    redactedString = redactedString.replace(
      PrivacyPolicyReasoner.PII_PATTERNS.email,
      (match) => {
        const [local, domain] = match.split('@');
        return `${local.substring(0, 2)}***@${domain}`;
      }
    );

    // Redact phone numbers
    redactedString = redactedString.replace(
      PrivacyPolicyReasoner.PII_PATTERNS.phone,
      '***-***-****'
    );

    // Redact SSNs
    redactedString = redactedString.replace(
      PrivacyPolicyReasoner.PII_PATTERNS.ssn,
      '***-**-****'
    );

    return JSON.parse(redactedString);
  }

  /**
   * Apply full redaction (remove sensitive fields)
   */
  private applyFullRedaction(data: any, classification: DataClassification): any {
    if (Array.isArray(data)) {
      return data.map(item => this.applyFullRedaction(item, classification));
    }

    if (typeof data === 'object' && data !== null) {
      const redacted: any = {};

      for (const [key, value] of Object.entries(data)) {
        const keyLower = key.toLowerCase();

        // Remove sensitive fields entirely
        if (this.isSensitiveField(keyLower)) {
          redacted[key] = '[REDACTED]';
        } else {
          redacted[key] = this.applyFullRedaction(value, classification);
        }
      }

      return redacted;
    }

    return data;
  }

  /**
   * Apply k-anonymity (generalize data)
   */
  private applyKAnonymity(data: any, classification: DataClassification): any {
    // Simplified k-anonymity implementation
    // In production, use proper anonymization libraries

    if (Array.isArray(data)) {
      return data.map(item => this.applyKAnonymity(item, classification));
    }

    if (typeof data === 'object' && data !== null) {
      const anonymized: any = {};

      for (const [key, value] of Object.entries(data)) {
        const keyLower = key.toLowerCase();

        if (keyLower.includes('age')) {
          // Generalize ages to ranges
          anonymized[key] = this.generalizeAge(value);
        } else if (keyLower.includes('location') || keyLower.includes('address')) {
          // Generalize locations to regions
          anonymized[key] = this.generalizeLocation(value);
        } else if (this.isSensitiveField(keyLower)) {
          anonymized[key] = '[ANONYMIZED]';
        } else {
          anonymized[key] = this.applyKAnonymity(value, classification);
        }
      }

      return anonymized;
    }

    return data;
  }

  /**
   * Apply differential privacy (add noise)
   */
  private applyDifferentialPrivacy(data: any, classification: DataClassification): any {
    // Simplified differential privacy implementation
    // In production, use proper DP libraries

    if (Array.isArray(data)) {
      return data.map(item => this.applyDifferentialPrivacy(item, classification));
    }

    if (typeof data === 'object' && data !== null) {
      const noised: any = {};

      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'number') {
          // Add Laplace noise to numeric values
          noised[key] = this.addLaplaceNoise(value, 1.0);
        } else {
          noised[key] = this.applyDifferentialPrivacy(value, classification);
        }
      }

      return noised;
    }

    return data;
  }

  // Helper methods
  private isSensitiveField(fieldName: string): boolean {
    const sensitiveFields = [
      'ssn', 'social_security', 'tax_id',
      'password', 'secret', 'token',
      'credit_card', 'bank_account',
      'medical_record', 'diagnosis'
    ];

    return sensitiveFields.some(field => fieldName.includes(field));
  }

  private generalizeAge(age: any): string {
    if (typeof age !== 'number') return '[GENERALIZED]';

    if (age < 18) return '0-17';
    if (age < 30) return '18-29';
    if (age < 50) return '30-49';
    if (age < 65) return '50-64';
    return '65+';
  }

  private generalizeLocation(location: any): string {
    // Very simplified location generalization
    if (typeof location === 'string') {
      // Extract state/country level information
      const parts = location.split(',');
      if (parts.length > 1) {
        return parts[parts.length - 1].trim(); // Return last part (usually state/country)
      }
    }
    return '[GENERALIZED_LOCATION]';
  }

  private addLaplaceNoise(value: number, sensitivity: number): number {
    // Add Laplace noise for differential privacy
    const epsilon = 1.0; // Privacy parameter
    const scale = sensitivity / epsilon;

    // Generate Laplace random variable
    const u = Math.random() - 0.5;
    const noise = -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));

    return Math.round(value + noise);
  }

  private hashData(data: any): string {
    // Simple hash for audit trail (use crypto.hash in production)
    return Buffer.from(JSON.stringify(data)).toString('base64').substring(0, 32);
  }

  /**
   * Load privacy policies from database
   */
  private async loadPolicies(): Promise<void> {
    try {
      const result = await this.db.query(`
        SELECT id, name, version, rules, default_retention, effective_date, expiry_date, metadata
        FROM privacy_policies
        WHERE effective_date <= NOW() AND (expiry_date IS NULL OR expiry_date > NOW())
        ORDER BY version DESC
      `);

      this.policies.clear();

      for (const row of result.rows) {
        const policy: PrivacyPolicy = {
          id: row.id,
          name: row.name,
          version: row.version,
          rules: JSON.parse(row.rules),
          defaultRetention: row.default_retention,
          effectiveDate: row.effective_date,
          expiryDate: row.expiry_date,
          metadata: JSON.parse(row.metadata || '{}')
        };

        this.policies.set(policy.id, policy);
      }

      logger.info(`Loaded ${this.policies.size} privacy policies`);

    } catch (error) {
      logger.error('Failed to load privacy policies:', error);
    }
  }

  /**
   * Get retention policy for data
   */
  getRetentionPolicy(tier: RetentionTier): RetentionPolicy {
    return PrivacyPolicyReasoner.DEFAULT_RETENTION_POLICIES[tier];
  }

  /**
   * Check if data is subject to legal hold
   */
  async checkLegalHold(tenantId: string, dataId: string): Promise<boolean> {
    try {
      const result = await this.db.query(`
        SELECT COUNT(*) as count
        FROM legal_holds
        WHERE tenant_id = $1 AND (
          data_id = $2 OR
          data_pattern = ANY(
            SELECT pattern FROM legal_hold_patterns WHERE $2 ~ pattern
          )
        ) AND status = 'active'
      `, [tenantId, dataId]);

      return parseInt(result.rows[0].count) > 0;

    } catch (error) {
      logger.error('Failed to check legal hold:', error);
      return false; // Fail safe
    }
  }
}

export default PrivacyPolicyReasoner;