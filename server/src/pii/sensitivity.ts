/**
 * Sensitivity Classification System
 *
 * Defines hierarchical sensitivity levels and mappings to PII types,
 * providing a governance layer for data access control and redaction.
 */

import { PIIType, SeverityLevel } from './types.js';

/**
 * Hierarchical sensitivity classification levels
 * Each level implies access restrictions and redaction policies
 */
export enum SensitivityClass {
  /** Public information - no restrictions */
  PUBLIC = 'PUBLIC',

  /** Internal use only - authenticated users */
  INTERNAL = 'INTERNAL',

  /** Confidential - role-based access required */
  CONFIDENTIAL = 'CONFIDENTIAL',

  /** Highly sensitive - restricted access with audit trail */
  HIGHLY_SENSITIVE = 'HIGHLY_SENSITIVE',

  /** Top secret - compartmentalized access only */
  TOP_SECRET = 'TOP_SECRET',
}

/**
 * Regulatory classification tags for compliance tracking
 */
export enum RegulatoryTag {
  /** General Data Protection Regulation */
  GDPR = 'GDPR',

  /** California Consumer Privacy Act */
  CCPA = 'CCPA',

  /** Health Insurance Portability and Accountability Act */
  HIPAA = 'HIPAA',

  /** Payment Card Industry Data Security Standard */
  PCI_DSS = 'PCI_DSS',

  /** Sarbanes-Oxley Act */
  SOX = 'SOX',

  /** International Traffic in Arms Regulations */
  ITAR = 'ITAR',

  /** Export Administration Regulations */
  EAR = 'EAR',

  /** Federal Information Security Management Act */
  FISMA = 'FISMA',
}

/**
 * Data retention and handling policies
 */
export interface RetentionPolicy {
  /** Minimum retention period in days */
  minimumDays: number;

  /** Maximum retention period in days */
  maximumDays: number;

  /** Auto-deletion after maximum period */
  autoDelete: boolean;

  /** Require legal hold capability */
  legalHoldRequired: boolean;

  /** Encryption requirements */
  encryptionRequired: boolean;

  /** Encryption method (e.g., 'AES-256', 'KMS') */
  encryptionMethod?: string;
}

/**
 * Access control requirements for sensitivity class
 */
export interface AccessControlPolicy {
  /** Minimum clearance level required (1-10) */
  minimumClearance: number;

  /** Require step-up authentication */
  requireStepUp: boolean;

  /** Require purpose justification */
  requirePurpose: boolean;

  /** Require manager approval for access */
  requireApproval: boolean;

  /** Maximum bulk export limit */
  maxExportRecords: number;

  /** Audit all access attempts */
  auditAccess: boolean;

  /** Require NDAs or compliance agreements */
  requireAgreement: boolean;
}

/**
 * Comprehensive sensitivity metadata for data classification
 */
export interface SensitivityMetadata {
  /** Primary sensitivity classification */
  sensitivityClass: SensitivityClass;

  /** PII types detected in this data */
  piiTypes: PIIType[];

  /** Severity level (from taxonomy) */
  severity: SeverityLevel;

  /** Applicable regulatory frameworks */
  regulatoryTags: RegulatoryTag[];

  /** Retention and handling policy */
  retentionPolicy: RetentionPolicy;

  /** Access control requirements */
  accessControl: AccessControlPolicy;

  /** Custom policy tags */
  policyTags: string[];

  /** Data lineage tracking */
  lineage?: {
    source: string;
    detectedAt: Date;
    lastValidated?: Date;
    validatedBy?: string;
  };

  /** Redaction hints for display */
  redactionHints?: {
    allowPartialMask: boolean;
    maskPattern?: string;
    showLast?: number;
  };
}

/**
 * Mapping from PII severity to sensitivity class
 */
export const SEVERITY_TO_SENSITIVITY: Record<SeverityLevel, SensitivityClass> = {
  low: SensitivityClass.INTERNAL,
  medium: SensitivityClass.CONFIDENTIAL,
  high: SensitivityClass.HIGHLY_SENSITIVE,
  critical: SensitivityClass.TOP_SECRET,
};

/**
 * Default retention policies by sensitivity class
 */
export const DEFAULT_RETENTION_POLICIES: Record<SensitivityClass, RetentionPolicy> = {
  [SensitivityClass.PUBLIC]: {
    minimumDays: 0,
    maximumDays: 2555, // 7 years
    autoDelete: false,
    legalHoldRequired: false,
    encryptionRequired: false,
  },
  [SensitivityClass.INTERNAL]: {
    minimumDays: 90,
    maximumDays: 1825, // 5 years
    autoDelete: true,
    legalHoldRequired: false,
    encryptionRequired: true,
    encryptionMethod: 'TLS',
  },
  [SensitivityClass.CONFIDENTIAL]: {
    minimumDays: 365,
    maximumDays: 1095, // 3 years
    autoDelete: true,
    legalHoldRequired: true,
    encryptionRequired: true,
    encryptionMethod: 'AES-256',
  },
  [SensitivityClass.HIGHLY_SENSITIVE]: {
    minimumDays: 365,
    maximumDays: 3650, // 10 years
    autoDelete: false,
    legalHoldRequired: true,
    encryptionRequired: true,
    encryptionMethod: 'KMS',
  },
  [SensitivityClass.TOP_SECRET]: {
    minimumDays: 2555, // 7 years
    maximumDays: 9125, // 25 years
    autoDelete: false,
    legalHoldRequired: true,
    encryptionRequired: true,
    encryptionMethod: 'KMS-FIPS',
  },
};

/**
 * Default access control policies by sensitivity class
 */
export const DEFAULT_ACCESS_POLICIES: Record<SensitivityClass, AccessControlPolicy> = {
  [SensitivityClass.PUBLIC]: {
    minimumClearance: 0,
    requireStepUp: false,
    requirePurpose: false,
    requireApproval: false,
    maxExportRecords: -1, // unlimited
    auditAccess: false,
    requireAgreement: false,
  },
  [SensitivityClass.INTERNAL]: {
    minimumClearance: 1,
    requireStepUp: false,
    requirePurpose: false,
    requireApproval: false,
    maxExportRecords: 10000,
    auditAccess: true,
    requireAgreement: false,
  },
  [SensitivityClass.CONFIDENTIAL]: {
    minimumClearance: 2,
    requireStepUp: false,
    requirePurpose: true,
    requireApproval: false,
    maxExportRecords: 1000,
    auditAccess: true,
    requireAgreement: true,
  },
  [SensitivityClass.HIGHLY_SENSITIVE]: {
    minimumClearance: 3,
    requireStepUp: true,
    requirePurpose: true,
    requireApproval: true,
    maxExportRecords: 100,
    auditAccess: true,
    requireAgreement: true,
  },
  [SensitivityClass.TOP_SECRET]: {
    minimumClearance: 5,
    requireStepUp: true,
    requirePurpose: true,
    requireApproval: true,
    maxExportRecords: 10,
    auditAccess: true,
    requireAgreement: true,
  },
};

/**
 * Regulatory compliance mappings for PII types
 */
export const PII_REGULATORY_MAPPING: Partial<Record<PIIType, RegulatoryTag[]>> = {
  // GDPR - Personal identifiers
  fullName: [RegulatoryTag.GDPR, RegulatoryTag.CCPA],
  firstName: [RegulatoryTag.GDPR, RegulatoryTag.CCPA],
  lastName: [RegulatoryTag.GDPR, RegulatoryTag.CCPA],
  email: [RegulatoryTag.GDPR, RegulatoryTag.CCPA],
  phoneNumber: [RegulatoryTag.GDPR, RegulatoryTag.CCPA],
  ipAddress: [RegulatoryTag.GDPR, RegulatoryTag.CCPA],

  // HIPAA - Health records
  patientId: [RegulatoryTag.HIPAA, RegulatoryTag.GDPR],
  healthRecordNumber: [RegulatoryTag.HIPAA, RegulatoryTag.GDPR],
  medicalDiagnosis: [RegulatoryTag.HIPAA, RegulatoryTag.GDPR],
  prescription: [RegulatoryTag.HIPAA, RegulatoryTag.GDPR],
  insurancePolicyNumber: [RegulatoryTag.HIPAA, RegulatoryTag.GDPR],
  geneticMarker: [RegulatoryTag.HIPAA, RegulatoryTag.GDPR],
  biometricDNA: [RegulatoryTag.HIPAA, RegulatoryTag.GDPR],

  // PCI DSS - Payment information
  creditCardNumber: [RegulatoryTag.PCI_DSS, RegulatoryTag.GDPR],
  debitCardNumber: [RegulatoryTag.PCI_DSS, RegulatoryTag.GDPR],
  cardExpiration: [RegulatoryTag.PCI_DSS],
  cardSecurityCode: [RegulatoryTag.PCI_DSS],
  bankAccountNumber: [RegulatoryTag.PCI_DSS, RegulatoryTag.GDPR],

  // SOX - Financial records
  accountNumber: [RegulatoryTag.SOX, RegulatoryTag.GDPR],
  financialTransactionId: [RegulatoryTag.SOX],

  // Government IDs
  socialSecurityNumber: [RegulatoryTag.GDPR, RegulatoryTag.CCPA, RegulatoryTag.FISMA],
  passportNumber: [RegulatoryTag.GDPR, RegulatoryTag.CCPA],
  driverLicenseNumber: [RegulatoryTag.GDPR, RegulatoryTag.CCPA],
  taxId: [RegulatoryTag.GDPR, RegulatoryTag.SOX],

  // Biometrics
  biometricFingerprint: [RegulatoryTag.GDPR, RegulatoryTag.CCPA],
  biometricFace: [RegulatoryTag.GDPR, RegulatoryTag.CCPA],
  biometricVoice: [RegulatoryTag.GDPR, RegulatoryTag.CCPA],
  biometricRetina: [RegulatoryTag.GDPR, RegulatoryTag.CCPA],
};

/**
 * Classifier to determine sensitivity metadata from PII detection results
 */
export class SensitivityClassifier {
  /**
   * Classify data based on detected PII types
   */
  classify(
    piiTypes: PIIType[],
    severity: SeverityLevel,
    customTags?: string[],
  ): SensitivityMetadata {
    // Determine primary sensitivity class from severity
    const sensitivityClass = SEVERITY_TO_SENSITIVITY[severity];

    // Aggregate regulatory tags from all PII types
    const regulatoryTags = new Set<RegulatoryTag>();
    for (const piiType of piiTypes) {
      const tags = PII_REGULATORY_MAPPING[piiType] || [];
      tags.forEach(tag => regulatoryTags.add(tag));
    }

    // Get default policies for this sensitivity class
    const retentionPolicy = { ...DEFAULT_RETENTION_POLICIES[sensitivityClass] };
    const accessControl = { ...DEFAULT_ACCESS_POLICIES[sensitivityClass] };

    // Build policy tags from taxonomy and custom tags
    const policyTags = [...new Set([
      ...(customTags || []),
      this.getPolicyTagsForClass(sensitivityClass),
    ].flat())];

    return {
      sensitivityClass,
      piiTypes,
      severity,
      regulatoryTags: Array.from(regulatoryTags),
      retentionPolicy,
      accessControl,
      policyTags,
      lineage: {
        source: 'pii-detector',
        detectedAt: new Date(),
      },
      redactionHints: this.getRedactionHints(sensitivityClass, severity),
    };
  }

  /**
   * Get policy tags for sensitivity class
   */
  private getPolicyTagsForClass(sensitivityClass: SensitivityClass): string[] {
    switch (sensitivityClass) {
      case SensitivityClass.PUBLIC:
        return ['public'];
      case SensitivityClass.INTERNAL:
        return ['internal', 'authenticated'];
      case SensitivityClass.CONFIDENTIAL:
        return ['confidential', 'restricted'];
      case SensitivityClass.HIGHLY_SENSITIVE:
        return ['highly-sensitive', 'restricted', 'audit'];
      case SensitivityClass.TOP_SECRET:
        return ['top-secret', 'compartmented', 'restricted', 'audit'];
      default:
        return [];
    }
  }

  /**
   * Get redaction hints for sensitivity class
   */
  private getRedactionHints(
    sensitivityClass: SensitivityClass,
    severity: SeverityLevel,
  ): { allowPartialMask: boolean; maskPattern?: string; showLast?: number } {
    // Critical and high severity should be fully redacted by default
    if (severity === 'critical') {
      return {
        allowPartialMask: false,
      };
    }

    // High sensitivity allows partial masking for ANALYST role
    if (severity === 'high') {
      return {
        allowPartialMask: true,
        showLast: 4,
        maskPattern: '***',
      };
    }

    // Medium and low allow more flexible masking
    return {
      allowPartialMask: true,
      showLast: 6,
      maskPattern: '***',
    };
  }

  /**
   * Determine if user has clearance for sensitivity class
   */
  canAccess(
    userClearance: number,
    sensitivityClass: SensitivityClass,
  ): boolean {
    const policy = DEFAULT_ACCESS_POLICIES[sensitivityClass];
    return userClearance >= policy.minimumClearance;
  }

  /**
   * Check if purpose justification is required
   */
  requiresPurpose(sensitivityClass: SensitivityClass): boolean {
    const policy = DEFAULT_ACCESS_POLICIES[sensitivityClass];
    return policy.requirePurpose;
  }

  /**
   * Check if step-up authentication is required
   */
  requiresStepUp(sensitivityClass: SensitivityClass): boolean {
    const policy = DEFAULT_ACCESS_POLICIES[sensitivityClass];
    return policy.requireStepUp;
  }

  /**
   * Get maximum export limit for sensitivity class
   */
  getMaxExportRecords(sensitivityClass: SensitivityClass): number {
    const policy = DEFAULT_ACCESS_POLICIES[sensitivityClass];
    return policy.maxExportRecords;
  }
}

/**
 * Utility to merge multiple sensitivity metadata into highest classification
 */
export function mergeSensitivityMetadata(
  metadataList: SensitivityMetadata[],
): SensitivityMetadata {
  if (metadataList.length === 0) {
    throw new Error('Cannot merge empty metadata list');
  }

  if (metadataList.length === 1) {
    return metadataList[0];
  }

  // Use highest sensitivity class
  const classOrder = [
    SensitivityClass.PUBLIC,
    SensitivityClass.INTERNAL,
    SensitivityClass.CONFIDENTIAL,
    SensitivityClass.HIGHLY_SENSITIVE,
    SensitivityClass.TOP_SECRET,
  ];

  const highestClass = metadataList.reduce((highest, current) => {
    const highestIdx = classOrder.indexOf(highest.sensitivityClass);
    const currentIdx = classOrder.indexOf(current.sensitivityClass);
    return currentIdx > highestIdx ? current : highest;
  });

  // Merge all PII types
  const allPiiTypes = new Set<PIIType>();
  const allRegulatoryTags = new Set<RegulatoryTag>();
  const allPolicyTags = new Set<string>();

  for (const metadata of metadataList) {
    metadata.piiTypes.forEach(type => allPiiTypes.add(type));
    metadata.regulatoryTags.forEach(tag => allRegulatoryTags.add(tag));
    metadata.policyTags.forEach(tag => allPolicyTags.add(tag));
  }

  return {
    ...highestClass,
    piiTypes: Array.from(allPiiTypes),
    regulatoryTags: Array.from(allRegulatoryTags),
    policyTags: Array.from(allPolicyTags),
  };
}
