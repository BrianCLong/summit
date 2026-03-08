"use strict";
/**
 * Sensitivity Classification System
 *
 * Defines hierarchical sensitivity levels and mappings to PII types,
 * providing a governance layer for data access control and redaction.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SensitivityClassifier = exports.PII_REGULATORY_MAPPING = exports.DEFAULT_ACCESS_POLICIES = exports.DEFAULT_RETENTION_POLICIES = exports.SEVERITY_TO_SENSITIVITY = exports.RegulatoryTag = exports.SensitivityClass = void 0;
exports.mergeSensitivityMetadata = mergeSensitivityMetadata;
// Added for Privacy Engine visibility
/**
 * Hierarchical sensitivity classification levels
 * Each level implies access restrictions and redaction policies
 */
var SensitivityClass;
(function (SensitivityClass) {
    /** Public information - no restrictions */
    SensitivityClass["PUBLIC"] = "PUBLIC";
    /** Internal use only - authenticated users */
    SensitivityClass["INTERNAL"] = "INTERNAL";
    /** Confidential - role-based access required */
    SensitivityClass["CONFIDENTIAL"] = "CONFIDENTIAL";
    /** Highly sensitive - restricted access with audit trail */
    SensitivityClass["HIGHLY_SENSITIVE"] = "HIGHLY_SENSITIVE";
    /** Top secret - compartmentalized access only */
    SensitivityClass["TOP_SECRET"] = "TOP_SECRET";
})(SensitivityClass || (exports.SensitivityClass = SensitivityClass = {}));
/**
 * Regulatory classification tags for compliance tracking
 */
var RegulatoryTag;
(function (RegulatoryTag) {
    /** General Data Protection Regulation */
    RegulatoryTag["GDPR"] = "GDPR";
    /** California Consumer Privacy Act */
    RegulatoryTag["CCPA"] = "CCPA";
    /** Health Insurance Portability and Accountability Act */
    RegulatoryTag["HIPAA"] = "HIPAA";
    /** Payment Card Industry Data Security Standard */
    RegulatoryTag["PCI_DSS"] = "PCI_DSS";
    /** Sarbanes-Oxley Act */
    RegulatoryTag["SOX"] = "SOX";
    /** International Traffic in Arms Regulations */
    RegulatoryTag["ITAR"] = "ITAR";
    /** Export Administration Regulations */
    RegulatoryTag["EAR"] = "EAR";
    /** Federal Information Security Management Act */
    RegulatoryTag["FISMA"] = "FISMA";
})(RegulatoryTag || (exports.RegulatoryTag = RegulatoryTag = {}));
/**
 * Mapping from PII severity to sensitivity class
 */
exports.SEVERITY_TO_SENSITIVITY = {
    low: SensitivityClass.INTERNAL,
    medium: SensitivityClass.CONFIDENTIAL,
    high: SensitivityClass.HIGHLY_SENSITIVE,
    critical: SensitivityClass.TOP_SECRET,
};
/**
 * Default retention policies by sensitivity class
 */
exports.DEFAULT_RETENTION_POLICIES = {
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
exports.DEFAULT_ACCESS_POLICIES = {
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
exports.PII_REGULATORY_MAPPING = {
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
class SensitivityClassifier {
    /**
     * Classify data based on detected PII types
     */
    classify(piiTypes, severity, customTags) {
        // Determine primary sensitivity class from severity
        const sensitivityClass = exports.SEVERITY_TO_SENSITIVITY[severity];
        // Aggregate regulatory tags from all PII types
        const regulatoryTags = new Set();
        for (const piiType of piiTypes) {
            const tags = exports.PII_REGULATORY_MAPPING[piiType] || [];
            tags.forEach(tag => regulatoryTags.add(tag));
        }
        // Get default policies for this sensitivity class
        const retentionPolicy = { ...exports.DEFAULT_RETENTION_POLICIES[sensitivityClass] };
        const accessControl = { ...exports.DEFAULT_ACCESS_POLICIES[sensitivityClass] };
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
    getPolicyTagsForClass(sensitivityClass) {
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
    getRedactionHints(sensitivityClass, severity) {
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
    canAccess(userClearance, sensitivityClass) {
        const policy = exports.DEFAULT_ACCESS_POLICIES[sensitivityClass];
        return userClearance >= policy.minimumClearance;
    }
    /**
     * Check if purpose justification is required
     */
    requiresPurpose(sensitivityClass) {
        const policy = exports.DEFAULT_ACCESS_POLICIES[sensitivityClass];
        return policy.requirePurpose;
    }
    /**
     * Check if step-up authentication is required
     */
    requiresStepUp(sensitivityClass) {
        const policy = exports.DEFAULT_ACCESS_POLICIES[sensitivityClass];
        return policy.requireStepUp;
    }
    /**
     * Get maximum export limit for sensitivity class
     */
    getMaxExportRecords(sensitivityClass) {
        const policy = exports.DEFAULT_ACCESS_POLICIES[sensitivityClass];
        return policy.maxExportRecords;
    }
}
exports.SensitivityClassifier = SensitivityClassifier;
/**
 * Utility to merge multiple sensitivity metadata into highest classification
 */
function mergeSensitivityMetadata(metadataList) {
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
    const allPiiTypes = new Set();
    const allRegulatoryTags = new Set();
    const allPolicyTags = new Set();
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
