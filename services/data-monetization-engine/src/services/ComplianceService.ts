/**
 * GDPR & Compliance Checking Service
 * Automated compliance validation for data assets across multiple regulatory frameworks
 */

import { v4 as uuid } from 'uuid';
import {
  ComplianceCheck,
  ComplianceFramework,
  DataAsset,
  PIICategory,
  piiCategories,
  complianceFrameworks,
} from '@intelgraph/data-monetization-types';
import { logger } from '../utils/logger.js';

// PII detection patterns
const PII_PATTERNS: Record<PIICategory, RegExp[]> = {
  DIRECT_IDENTIFIER: [
    /\b(ssn|social.?security|national.?id)\b/i,
    /\b(passport|driver.?licen[cs]e)\b/i,
    /\bemail\b/i,
    /\bphone\b/i,
  ],
  QUASI_IDENTIFIER: [
    /\b(birth.?date|dob|age)\b/i,
    /\b(zip.?code|postal.?code)\b/i,
    /\bgender\b/i,
    /\b(first.?name|last.?name|full.?name)\b/i,
  ],
  SENSITIVE_DATA: [/\b(race|ethnicity|nationality)\b/i, /\b(disability)\b/i],
  BEHAVIORAL_DATA: [
    /\b(browsing|clickstream|purchase.?history)\b/i,
    /\b(preference|interest)\b/i,
  ],
  LOCATION_DATA: [/\b(latitude|longitude|gps|coordinates)\b/i, /\b(address|street)\b/i],
  BIOMETRIC_DATA: [/\b(fingerprint|facial|retina|voice.?print)\b/i],
  GENETIC_DATA: [/\b(dna|genetic|genome)\b/i],
  HEALTH_DATA: [
    /\b(diagnosis|medical|health|patient)\b/i,
    /\b(prescription|medication)\b/i,
  ],
  FINANCIAL_DATA: [
    /\b(credit.?card|bank.?account|iban)\b/i,
    /\b(salary|income|tax)\b/i,
  ],
  POLITICAL_OPINIONS: [/\b(political|party.?affiliation|voting)\b/i],
  RELIGIOUS_BELIEFS: [/\b(religion|faith|worship)\b/i],
  TRADE_UNION: [/\b(union|labor.?organization)\b/i],
  SEXUAL_ORIENTATION: [/\b(sexual.?orientation|gender.?identity)\b/i],
  CRIMINAL_RECORDS: [/\b(criminal|conviction|arrest)\b/i],
};

// Framework-specific requirements
const FRAMEWORK_REQUIREMENTS: Record<ComplianceFramework, FrameworkConfig> = {
  GDPR: {
    maxRetentionDays: 365 * 3,
    requiredLegalBasis: true,
    crossBorderRestrictions: ['NON_EU', 'NON_ADEQUATE'],
    anonymizationThreshold: 'HIGH',
    consentRequired: ['DIRECT_IDENTIFIER', 'SENSITIVE_DATA', 'HEALTH_DATA'],
    breachNotificationHours: 72,
  },
  CCPA: {
    maxRetentionDays: 365 * 2,
    requiredLegalBasis: false,
    crossBorderRestrictions: [],
    anonymizationThreshold: 'MEDIUM',
    consentRequired: ['DIRECT_IDENTIFIER', 'FINANCIAL_DATA'],
    breachNotificationHours: 72,
  },
  HIPAA: {
    maxRetentionDays: 365 * 6,
    requiredLegalBasis: true,
    crossBorderRestrictions: ['NON_US'],
    anonymizationThreshold: 'HIGH',
    consentRequired: ['HEALTH_DATA', 'GENETIC_DATA', 'BIOMETRIC_DATA'],
    breachNotificationHours: 60,
  },
  SOC2: {
    maxRetentionDays: 365 * 7,
    requiredLegalBasis: false,
    crossBorderRestrictions: [],
    anonymizationThreshold: 'LOW',
    consentRequired: [],
    breachNotificationHours: 168,
  },
  ISO27001: {
    maxRetentionDays: undefined,
    requiredLegalBasis: false,
    crossBorderRestrictions: [],
    anonymizationThreshold: 'MEDIUM',
    consentRequired: [],
    breachNotificationHours: 72,
  },
  FEDRAMP: {
    maxRetentionDays: 365 * 3,
    requiredLegalBasis: true,
    crossBorderRestrictions: ['NON_US', 'NON_CONUS'],
    anonymizationThreshold: 'HIGH',
    consentRequired: ['DIRECT_IDENTIFIER'],
    breachNotificationHours: 24,
  },
  PCI_DSS: {
    maxRetentionDays: 365,
    requiredLegalBasis: false,
    crossBorderRestrictions: [],
    anonymizationThreshold: 'HIGH',
    consentRequired: ['FINANCIAL_DATA'],
    breachNotificationHours: 24,
  },
  LGPD: {
    maxRetentionDays: 365 * 5,
    requiredLegalBasis: true,
    crossBorderRestrictions: ['NON_ADEQUATE'],
    anonymizationThreshold: 'HIGH',
    consentRequired: ['DIRECT_IDENTIFIER', 'SENSITIVE_DATA'],
    breachNotificationHours: 48,
  },
  PIPEDA: {
    maxRetentionDays: 365 * 2,
    requiredLegalBasis: true,
    crossBorderRestrictions: [],
    anonymizationThreshold: 'MEDIUM',
    consentRequired: ['DIRECT_IDENTIFIER'],
    breachNotificationHours: 72,
  },
};

interface FrameworkConfig {
  maxRetentionDays?: number;
  requiredLegalBasis: boolean;
  crossBorderRestrictions: string[];
  anonymizationThreshold: 'LOW' | 'MEDIUM' | 'HIGH';
  consentRequired: PIICategory[];
  breachNotificationHours: number;
}

interface Finding {
  code: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  recommendation?: string;
  field?: string;
}

export class ComplianceService {
  /**
   * Run comprehensive compliance checks across specified frameworks
   */
  async checkCompliance(
    asset: DataAsset,
    frameworks: ComplianceFramework[],
    deepScan = false,
  ): Promise<ComplianceCheck[]> {
    logger.info({ assetId: asset.id, frameworks }, 'Starting compliance check');

    const results: ComplianceCheck[] = [];

    for (const framework of frameworks) {
      const check = await this.checkFramework(asset, framework, deepScan);
      results.push(check);
    }

    return results;
  }

  /**
   * Check compliance for a single framework
   */
  private async checkFramework(
    asset: DataAsset,
    framework: ComplianceFramework,
    deepScan: boolean,
  ): Promise<ComplianceCheck> {
    const config = FRAMEWORK_REQUIREMENTS[framework];
    const findings: Finding[] = [];
    const detectedPII: PIICategory[] = [];

    // Detect PII in schema fields
    if (asset.schema) {
      const schemaFields = Object.keys(asset.schema);
      for (const field of schemaFields) {
        for (const [category, patterns] of Object.entries(PII_PATTERNS)) {
          for (const pattern of patterns) {
            if (pattern.test(field)) {
              if (!detectedPII.includes(category as PIICategory)) {
                detectedPII.push(category as PIICategory);
              }
            }
          }
        }
      }
    }

    // Check sensitivity level alignment
    if (asset.sensitivityLevel === 'PUBLIC' && detectedPII.length > 0) {
      findings.push({
        code: `${framework}_PII_PUBLIC`,
        severity: 'CRITICAL',
        description: `Asset marked PUBLIC contains PII: ${detectedPII.join(', ')}`,
        recommendation: 'Reclassify asset or remove PII fields',
      });
    }

    // Check consent requirements
    const needsConsent = detectedPII.filter((pii) =>
      config.consentRequired.includes(pii),
    );
    if (needsConsent.length > 0) {
      findings.push({
        code: `${framework}_CONSENT_REQUIRED`,
        severity: 'HIGH',
        description: `Consent required for: ${needsConsent.join(', ')}`,
        recommendation: 'Implement consent collection mechanism',
      });
    }

    // Check retention policy
    if (config.maxRetentionDays && !asset.metadata.lastUpdated) {
      findings.push({
        code: `${framework}_RETENTION_UNKNOWN`,
        severity: 'MEDIUM',
        description: 'Data retention period not tracked',
        recommendation: 'Implement data lifecycle tracking',
      });
    }

    // Check cross-border restrictions
    if (config.crossBorderRestrictions.length > 0) {
      findings.push({
        code: `${framework}_CROSS_BORDER`,
        severity: 'MEDIUM',
        description: `Cross-border restrictions apply: ${config.crossBorderRestrictions.join(', ')}`,
        recommendation: 'Ensure data residency compliance',
      });
    }

    // Determine overall status
    const criticalCount = findings.filter((f) => f.severity === 'CRITICAL').length;
    const highCount = findings.filter((f) => f.severity === 'HIGH').length;

    let status: 'PENDING' | 'PASSED' | 'FAILED' | 'REQUIRES_REVIEW';
    if (criticalCount > 0) {
      status = 'FAILED';
    } else if (highCount > 0) {
      status = 'REQUIRES_REVIEW';
    } else if (findings.length > 0) {
      status = 'REQUIRES_REVIEW';
    } else {
      status = 'PASSED';
    }

    return {
      id: uuid(),
      assetId: asset.id,
      framework,
      status,
      piiDetected: detectedPII,
      findings,
      consentRequirements: needsConsent.map(
        (pii) => `Obtain explicit consent for ${pii} processing`,
      ),
      crossBorderRestrictions: config.crossBorderRestrictions,
      anonymizationRequired:
        config.anonymizationThreshold === 'HIGH' && detectedPII.length > 0,
      retentionPolicy: config.maxRetentionDays
        ? {
            maxRetentionDays: config.maxRetentionDays,
            deletionRequired: detectedPII.length > 0,
          }
        : undefined,
      checkedAt: new Date().toISOString(),
      checkedBy: 'compliance-service',
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  /**
   * Get all supported compliance frameworks
   */
  getSupportedFrameworks(): ComplianceFramework[] {
    return [...complianceFrameworks];
  }

  /**
   * Generate compliance report summary
   */
  generateComplianceSummary(checks: ComplianceCheck[]): {
    overallStatus: string;
    passRate: number;
    criticalFindings: number;
    recommendations: string[];
  } {
    const passed = checks.filter((c) => c.status === 'PASSED').length;
    const criticalFindings = checks.reduce(
      (sum, c) => sum + c.findings.filter((f) => f.severity === 'CRITICAL').length,
      0,
    );

    const recommendations = [
      ...new Set(
        checks.flatMap((c) =>
          c.findings.filter((f) => f.recommendation).map((f) => f.recommendation!),
        ),
      ),
    ];

    return {
      overallStatus: criticalFindings > 0 ? 'FAILED' : passed === checks.length ? 'PASSED' : 'PARTIAL',
      passRate: checks.length > 0 ? (passed / checks.length) * 100 : 0,
      criticalFindings,
      recommendations,
    };
  }
}

export const complianceService = new ComplianceService();
