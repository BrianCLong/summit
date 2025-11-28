/**
 * Data Factory Service - Governance Service
 *
 * Enforces policy guardrails, checks training eligibility, and applies redaction rules.
 */

import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from '../db/connection.js';
import {
  GovernanceCheck,
  GovernanceViolation,
  EligibilityResult,
  PolicyProfile,
  Sample,
  Dataset,
  RedactionRule,
} from '../types/index.js';
import { AuditService } from './AuditService.js';
import pino from 'pino';

const logger = pino({ name: 'governance-service' });

const POLICY_VERSION = '1.0.0';

export class GovernanceService {
  private auditService: AuditService;

  constructor(auditService: AuditService) {
    this.auditService = auditService;
  }

  // ============================================================================
  // Policy Profile Management
  // ============================================================================

  async getPolicyProfile(profileId: string): Promise<PolicyProfile | null> {
    const result = await query<{
      profile_id: string;
      profile_name: string;
      allowed_use_cases: string;
      prohibited_use_cases: string;
      required_redactions: string;
      pii_handling: 'remove' | 'mask' | 'encrypt' | 'allow';
      sensitivity_level: 'public' | 'internal' | 'confidential' | 'restricted';
      audit_level: 'minimal' | 'standard' | 'comprehensive';
    }>('SELECT * FROM policy_profiles WHERE profile_id = $1', [profileId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      profileId: row.profile_id,
      profileName: row.profile_name,
      allowedUseCases: JSON.parse(row.allowed_use_cases),
      prohibitedUseCases: JSON.parse(row.prohibited_use_cases),
      requiredRedactions: JSON.parse(row.required_redactions),
      piiHandling: row.pii_handling,
      sensitivityLevel: row.sensitivity_level,
      auditLevel: row.audit_level,
    };
  }

  async listPolicyProfiles(): Promise<PolicyProfile[]> {
    const result = await query<{
      profile_id: string;
      profile_name: string;
      allowed_use_cases: string;
      prohibited_use_cases: string;
      required_redactions: string;
      pii_handling: 'remove' | 'mask' | 'encrypt' | 'allow';
      sensitivity_level: 'public' | 'internal' | 'confidential' | 'restricted';
      audit_level: 'minimal' | 'standard' | 'comprehensive';
    }>('SELECT * FROM policy_profiles ORDER BY profile_name');

    return result.rows.map((row) => ({
      profileId: row.profile_id,
      profileName: row.profile_name,
      allowedUseCases: JSON.parse(row.allowed_use_cases),
      prohibitedUseCases: JSON.parse(row.prohibited_use_cases),
      requiredRedactions: JSON.parse(row.required_redactions),
      piiHandling: row.pii_handling,
      sensitivityLevel: row.sensitivity_level,
      auditLevel: row.audit_level,
    }));
  }

  async createPolicyProfile(
    profile: Omit<PolicyProfile, 'profileId'> & { profileId?: string },
    createdBy: string
  ): Promise<PolicyProfile> {
    const profileId = profile.profileId || uuidv4();

    await query(
      `INSERT INTO policy_profiles (
        profile_id, profile_name, allowed_use_cases, prohibited_use_cases,
        required_redactions, pii_handling, sensitivity_level, audit_level
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        profileId,
        profile.profileName,
        JSON.stringify(profile.allowedUseCases),
        JSON.stringify(profile.prohibitedUseCases),
        JSON.stringify(profile.requiredRedactions),
        profile.piiHandling,
        profile.sensitivityLevel,
        profile.auditLevel,
      ]
    );

    await this.auditService.log({
      entityType: 'dataset',
      entityId: profileId,
      action: 'create_policy_profile',
      actorId: createdBy,
      actorRole: 'admin',
      newState: profile as unknown as Record<string, unknown>,
      metadata: {},
    });

    logger.info({ profileId }, 'Policy profile created');
    return { ...profile, profileId };
  }

  // ============================================================================
  // Governance Checks
  // ============================================================================

  async checkSampleEligibility(
    sample: Sample,
    dataset: Dataset,
    useCase: string,
    checkedBy: string
  ): Promise<EligibilityResult> {
    const violations: GovernanceViolation[] = [];
    const requiredActions: string[] = [];

    const policy = dataset.policyProfile;

    // Check use case
    if (policy.prohibitedUseCases.includes(useCase)) {
      violations.push({
        code: 'PROHIBITED_USE_CASE',
        severity: 'critical',
        message: `Use case '${useCase}' is prohibited by policy`,
        remediation: 'Select a different use case or obtain special authorization',
      });
    }

    if (
      policy.allowedUseCases.length > 0 &&
      !policy.allowedUseCases.includes(useCase)
    ) {
      violations.push({
        code: 'USE_CASE_NOT_ALLOWED',
        severity: 'high',
        message: `Use case '${useCase}' is not in the allowed list`,
        remediation: 'Request policy update or use an approved use case',
      });
    }

    // Check license restrictions
    if (
      !dataset.license.commercialUseAllowed &&
      useCase.includes('commercial')
    ) {
      violations.push({
        code: 'LICENSE_VIOLATION',
        severity: 'critical',
        message: 'Commercial use not allowed by license',
        remediation: 'Use only for non-commercial purposes',
      });
    }

    if (dataset.license.expirationDate) {
      const expirationDate = new Date(dataset.license.expirationDate);
      if (expirationDate < new Date()) {
        violations.push({
          code: 'LICENSE_EXPIRED',
          severity: 'critical',
          message: 'Dataset license has expired',
          remediation: 'Renew license or remove dataset from use',
        });
      }
    }

    // Check jurisdiction restrictions
    if (dataset.jurisdiction.exportRestrictions.length > 0) {
      requiredActions.push('Verify export compliance before use');
    }

    if (dataset.jurisdiction.dataLocalizationRequired) {
      requiredActions.push('Ensure data remains in required jurisdiction');
    }

    // Check PII handling requirements
    if (policy.piiHandling !== 'allow') {
      const piiFields = this.detectPII(sample);
      if (piiFields.length > 0) {
        if (policy.piiHandling === 'remove') {
          violations.push({
            code: 'PII_REQUIRES_REMOVAL',
            severity: 'high',
            message: `PII detected in fields: ${piiFields.join(', ')}`,
            remediation: 'Apply PII removal before export',
          });
          requiredActions.push('Remove PII before training use');
        } else if (policy.piiHandling === 'mask') {
          requiredActions.push('Apply PII masking before training use');
        } else if (policy.piiHandling === 'encrypt') {
          requiredActions.push('Apply PII encryption before training use');
        }
      }
    }

    // Check required redactions
    for (const redactionType of policy.requiredRedactions) {
      requiredActions.push(`Apply ${redactionType} redaction`);
    }

    // Check sensitivity level restrictions
    if (
      policy.sensitivityLevel === 'restricted' ||
      policy.sensitivityLevel === 'confidential'
    ) {
      requiredActions.push('Obtain explicit authorization for training use');
    }

    const eligible = violations.filter((v) => v.severity === 'critical').length === 0;

    // Save governance check
    const checkId = uuidv4();
    await query(
      `INSERT INTO governance_checks (
        id, sample_id, dataset_id, check_type, passed, violations, policy_version
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        checkId,
        sample.id,
        dataset.id,
        'eligibility',
        eligible,
        JSON.stringify(violations),
        POLICY_VERSION,
      ]
    );

    await this.auditService.log({
      entityType: 'sample',
      entityId: sample.id,
      action: 'eligibility_check',
      actorId: checkedBy,
      actorRole: 'system',
      metadata: { eligible, violationCount: violations.length, useCase },
    });

    return {
      eligible,
      reasons: violations.map((v) => v.message),
      requiredActions,
      policyVersion: POLICY_VERSION,
      checkedAt: new Date(),
    };
  }

  async checkDatasetEligibility(
    dataset: Dataset,
    useCase: string,
    checkedBy: string
  ): Promise<EligibilityResult> {
    const violations: GovernanceViolation[] = [];
    const requiredActions: string[] = [];

    const policy = dataset.policyProfile;

    // Check use case
    if (policy.prohibitedUseCases.includes(useCase)) {
      violations.push({
        code: 'PROHIBITED_USE_CASE',
        severity: 'critical',
        message: `Use case '${useCase}' is prohibited by policy`,
      });
    }

    if (
      policy.allowedUseCases.length > 0 &&
      !policy.allowedUseCases.includes(useCase)
    ) {
      violations.push({
        code: 'USE_CASE_NOT_ALLOWED',
        severity: 'high',
        message: `Use case '${useCase}' is not in the allowed list`,
      });
    }

    // Check dataset status
    if (dataset.status !== 'active') {
      violations.push({
        code: 'DATASET_NOT_ACTIVE',
        severity: 'high',
        message: `Dataset status is '${dataset.status}', must be 'active'`,
      });
    }

    // Check labeling completeness
    if (dataset.labeledSampleCount < dataset.sampleCount * 0.8) {
      violations.push({
        code: 'INSUFFICIENT_LABELS',
        severity: 'medium',
        message: 'Less than 80% of samples are labeled',
        remediation: 'Complete labeling before export',
      });
    }

    // Check quality metrics
    if (
      dataset.qualityMetrics.interAnnotatorAgreement &&
      dataset.qualityMetrics.interAnnotatorAgreement < 0.7
    ) {
      violations.push({
        code: 'LOW_AGREEMENT',
        severity: 'medium',
        message: 'Inter-annotator agreement below 70%',
        remediation: 'Review and resolve labeling disagreements',
      });
    }

    const eligible = violations.filter((v) => v.severity === 'critical').length === 0;

    await this.auditService.log({
      entityType: 'dataset',
      entityId: dataset.id,
      action: 'eligibility_check',
      actorId: checkedBy,
      actorRole: 'system',
      metadata: { eligible, violationCount: violations.length, useCase },
    });

    return {
      eligible,
      reasons: violations.map((v) => v.message),
      requiredActions,
      policyVersion: POLICY_VERSION,
      checkedAt: new Date(),
    };
  }

  async getGovernanceHistory(
    entityType: 'sample' | 'dataset',
    entityId: string
  ): Promise<GovernanceCheck[]> {
    const column = entityType === 'sample' ? 'sample_id' : 'dataset_id';
    const result = await query<{
      id: string;
      sample_id: string;
      dataset_id: string;
      check_type: string;
      passed: boolean;
      violations: string;
      checked_at: Date;
      policy_version: string;
    }>(
      `SELECT * FROM governance_checks WHERE ${column} = $1 ORDER BY checked_at DESC`,
      [entityId]
    );

    return result.rows.map((row) => ({
      sampleId: row.sample_id,
      datasetId: row.dataset_id,
      checkType: row.check_type,
      passed: row.passed,
      violations: JSON.parse(row.violations),
      checkedAt: row.checked_at,
      policyVersion: row.policy_version,
    }));
  }

  // ============================================================================
  // Redaction
  // ============================================================================

  async applyRedaction(
    content: Record<string, unknown>,
    rules: RedactionRule[]
  ): Promise<Record<string, unknown>> {
    let redactedContent = JSON.parse(JSON.stringify(content));

    for (const rule of rules) {
      redactedContent = this.applyRedactionRule(redactedContent, rule);
    }

    return redactedContent;
  }

  async getRedactionRulesForPolicy(profileId: string): Promise<RedactionRule[]> {
    const policy = await this.getPolicyProfile(profileId);
    if (!policy) {
      return [];
    }

    const rules: RedactionRule[] = [];

    // Add rules based on required redactions
    for (const redactionType of policy.requiredRedactions) {
      rules.push(...this.getRedactionRulesForType(redactionType));
    }

    // Add PII rules based on handling policy
    if (policy.piiHandling !== 'allow') {
      rules.push(...this.getPIIRedactionRules(policy.piiHandling));
    }

    return rules;
  }

  private applyRedactionRule(
    content: Record<string, unknown>,
    rule: RedactionRule
  ): Record<string, unknown> {
    const pathParts = rule.fieldPath.split('.');
    let current: Record<string, unknown> = content;

    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (current[part] && typeof current[part] === 'object') {
        current = current[part] as Record<string, unknown>;
      } else {
        return content; // Path doesn't exist
      }
    }

    const finalKey = pathParts[pathParts.length - 1];
    if (finalKey in current) {
      switch (rule.redactionType) {
        case 'remove':
          delete current[finalKey];
          break;
        case 'mask':
          if (typeof current[finalKey] === 'string') {
            current[finalKey] = this.maskValue(
              current[finalKey] as string,
              rule.pattern,
              rule.replacement
            );
          }
          break;
        case 'hash':
          if (typeof current[finalKey] === 'string') {
            current[finalKey] = this.hashValue(current[finalKey] as string);
          }
          break;
        case 'generalize':
          if (typeof current[finalKey] === 'string') {
            current[finalKey] = rule.replacement || '[REDACTED]';
          }
          break;
      }
    }

    return content;
  }

  private maskValue(
    value: string,
    pattern?: string,
    replacement?: string
  ): string {
    if (pattern) {
      return value.replace(new RegExp(pattern, 'g'), replacement || '***');
    }
    // Default masking: show first and last character
    if (value.length <= 2) {
      return '***';
    }
    return value[0] + '*'.repeat(value.length - 2) + value[value.length - 1];
  }

  private hashValue(value: string): string {
    // Simple hash for demonstration - in production use proper crypto
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      const char = value.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return `HASH:${Math.abs(hash).toString(16)}`;
  }

  private detectPII(sample: Sample): string[] {
    const piiFields: string[] = [];
    const content = sample.content;

    // Check for common PII patterns
    const piiPatterns: Record<string, RegExp> = {
      email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
      phone: /\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/,
      ssn: /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/,
      creditCard: /\b\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4}\b/,
    };

    const checkValue = (value: unknown, path: string): void => {
      if (typeof value === 'string') {
        for (const [piiType, pattern] of Object.entries(piiPatterns)) {
          if (pattern.test(value)) {
            piiFields.push(`${path} (${piiType})`);
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        for (const [key, val] of Object.entries(value)) {
          checkValue(val, `${path}.${key}`);
        }
      }
    };

    checkValue(content, 'content');

    return piiFields;
  }

  private getRedactionRulesForType(redactionType: string): RedactionRule[] {
    const rulesByType: Record<string, RedactionRule[]> = {
      ssn: [
        {
          id: uuidv4(),
          fieldPath: '*',
          redactionType: 'mask',
          pattern: '\\b\\d{3}[-.]?\\d{2}[-.]?\\d{4}\\b',
          replacement: '***-**-****',
        },
      ],
      credit_card: [
        {
          id: uuidv4(),
          fieldPath: '*',
          redactionType: 'mask',
          pattern: '\\b\\d{4}[-\\s]?\\d{4}[-\\s]?\\d{4}[-\\s]?\\d{4}\\b',
          replacement: '****-****-****-****',
        },
      ],
      phone: [
        {
          id: uuidv4(),
          fieldPath: '*',
          redactionType: 'mask',
          pattern: '\\b(\\+?1[-.]?)?\\(?\\d{3}\\)?[-.]?\\d{3}[-.]?\\d{4}\\b',
          replacement: '(***) ***-****',
        },
      ],
      email: [
        {
          id: uuidv4(),
          fieldPath: '*',
          redactionType: 'mask',
          pattern: '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b',
          replacement: '***@***.***',
        },
      ],
    };

    return rulesByType[redactionType] || [];
  }

  private getPIIRedactionRules(
    handling: 'remove' | 'mask' | 'encrypt'
  ): RedactionRule[] {
    const redactionType =
      handling === 'remove' ? 'remove' : handling === 'mask' ? 'mask' : 'hash';

    return [
      ...this.getRedactionRulesForType('ssn').map((r) => ({
        ...r,
        redactionType,
      })),
      ...this.getRedactionRulesForType('credit_card').map((r) => ({
        ...r,
        redactionType,
      })),
      ...this.getRedactionRulesForType('phone').map((r) => ({
        ...r,
        redactionType,
      })),
      ...this.getRedactionRulesForType('email').map((r) => ({
        ...r,
        redactionType,
      })),
    ] as RedactionRule[];
  }
}
