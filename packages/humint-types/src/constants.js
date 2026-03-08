"use strict";
/**
 * HUMINT Source Management Constants
 *
 * Standard intelligence community constants for HUMINT operations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HUMINT_RELATIONSHIP_TYPES = exports.VALIDATION_THRESHOLDS = exports.HANDLING_CAVEATS = exports.CLASSIFICATION_LEVELS = exports.RISK_LEVELS = exports.ACCESS_TYPES = exports.DEBRIEF_STATUS = exports.DEBRIEF_TYPES = exports.SOURCE_STATUS = exports.INFORMATION_RATINGS = exports.CREDIBILITY_RATINGS = exports.SOURCE_TYPES = void 0;
/**
 * Source Types - Categories of human intelligence sources
 */
exports.SOURCE_TYPES = {
    /** Recruited asset with ongoing relationship */
    ASSET: 'ASSET',
    /** Foreign liaison partner */
    LIAISON: 'LIAISON',
    /** Unsolicited volunteer providing information */
    WALK_IN: 'WALK_IN',
    /** One-time contact with specific information */
    CASUAL_CONTACT: 'CASUAL_CONTACT',
    /** Unwitting provider of information */
    UNWITTING: 'UNWITTING',
    /** Defector from adversary organization */
    DEFECTOR: 'DEFECTOR',
    /** Technical consultant or expert */
    CONSULTANT: 'CONSULTANT',
    /** Official cover officer */
    OFFICIAL_COVER: 'OFFICIAL_COVER',
    /** Non-official cover officer */
    NOC: 'NOC',
};
/**
 * Credibility Ratings - Admiralty/NATO System
 * Evaluates the reliability of the source
 */
exports.CREDIBILITY_RATINGS = {
    A: { code: 'A', label: 'Completely Reliable', score: 100 },
    B: { code: 'B', label: 'Usually Reliable', score: 80 },
    C: { code: 'C', label: 'Fairly Reliable', score: 60 },
    D: { code: 'D', label: 'Not Usually Reliable', score: 40 },
    E: { code: 'E', label: 'Unreliable', score: 20 },
    F: { code: 'F', label: 'Cannot Be Judged', score: 0 },
};
/**
 * Information Reliability - Admiralty/NATO System
 * Evaluates the reliability of the information itself
 */
exports.INFORMATION_RATINGS = {
    '1': { code: '1', label: 'Confirmed by other sources', score: 100 },
    '2': { code: '2', label: 'Probably true', score: 80 },
    '3': { code: '3', label: 'Possibly true', score: 60 },
    '4': { code: '4', label: 'Doubtfully true', score: 40 },
    '5': { code: '5', label: 'Improbable', score: 20 },
    '6': { code: '6', label: 'Cannot be judged', score: 0 },
};
/**
 * Source Status - Operational status of the source
 */
exports.SOURCE_STATUS = {
    /** Source is actively providing intelligence */
    ACTIVE: 'ACTIVE',
    /** Source is temporarily inactive */
    DORMANT: 'DORMANT',
    /** Source relationship is terminated */
    TERMINATED: 'TERMINATED',
    /** Source is suspected of being compromised */
    COMPROMISED: 'COMPROMISED',
    /** Source is being developed/recruited */
    DEVELOPMENTAL: 'DEVELOPMENTAL',
    /** Source is under evaluation */
    EVALUATION: 'EVALUATION',
    /** Source has been relocated/resettled */
    RESETTLED: 'RESETTLED',
    /** Source is deceased */
    DECEASED: 'DECEASED',
};
/**
 * Debrief Types - Categories of debriefing sessions
 */
exports.DEBRIEF_TYPES = {
    /** Regular scheduled meeting */
    SCHEDULED: 'SCHEDULED',
    /** Emergency contact initiated by source */
    EMERGENCY: 'EMERGENCY',
    /** Initial recruitment/evaluation meeting */
    INITIAL: 'INITIAL',
    /** Follow-up on specific intelligence */
    FOLLOW_UP: 'FOLLOW_UP',
    /** Tasking delivery session */
    TASKING: 'TASKING',
    /** Operational security review */
    SECURITY_REVIEW: 'SECURITY_REVIEW',
    /** Final termination meeting */
    TERMINATION: 'TERMINATION',
    /** Polygraph examination */
    POLYGRAPH: 'POLYGRAPH',
};
/**
 * Debrief Status - Workflow states for debrief sessions
 */
exports.DEBRIEF_STATUS = {
    /** Debrief is planned but not yet conducted */
    PLANNED: 'PLANNED',
    /** Debrief is currently in progress */
    IN_PROGRESS: 'IN_PROGRESS',
    /** Debrief completed, pending review */
    PENDING_REVIEW: 'PENDING_REVIEW',
    /** Debrief approved by supervisor */
    APPROVED: 'APPROVED',
    /** Intelligence disseminated */
    DISSEMINATED: 'DISSEMINATED',
    /** Debrief was cancelled */
    CANCELLED: 'CANCELLED',
    /** Debrief requires further action */
    ACTION_REQUIRED: 'ACTION_REQUIRED',
};
/**
 * Access Types - Categories of source access
 */
exports.ACCESS_TYPES = {
    /** Direct personal access to target */
    DIRECT: 'DIRECT',
    /** Access through intermediaries */
    INDIRECT: 'INDIRECT',
    /** Access to physical locations */
    PHYSICAL: 'PHYSICAL',
    /** Access to digital/technical systems */
    TECHNICAL: 'TECHNICAL',
    /** Access to documents/records */
    DOCUMENTARY: 'DOCUMENTARY',
    /** Social access to target networks */
    SOCIAL: 'SOCIAL',
    /** Institutional/organizational access */
    INSTITUTIONAL: 'INSTITUTIONAL',
};
/**
 * Risk Levels - Operational security risk assessment
 */
exports.RISK_LEVELS = {
    MINIMAL: { code: 'MINIMAL', score: 1, label: 'Minimal Risk' },
    LOW: { code: 'LOW', score: 2, label: 'Low Risk' },
    MODERATE: { code: 'MODERATE', score: 3, label: 'Moderate Risk' },
    ELEVATED: { code: 'ELEVATED', score: 4, label: 'Elevated Risk' },
    HIGH: { code: 'HIGH', score: 5, label: 'High Risk' },
    CRITICAL: { code: 'CRITICAL', score: 6, label: 'Critical Risk' },
};
/**
 * Classification Levels - Security classification
 */
exports.CLASSIFICATION_LEVELS = {
    UNCLASSIFIED: 'UNCLASSIFIED',
    CONFIDENTIAL: 'CONFIDENTIAL',
    SECRET: 'SECRET',
    TOP_SECRET: 'TOP_SECRET',
    TOP_SECRET_SCI: 'TOP_SECRET_SCI',
};
/**
 * Handling Caveats - Special handling requirements
 */
exports.HANDLING_CAVEATS = {
    NOFORN: 'NOFORN',
    ORCON: 'ORCON',
    PROPIN: 'PROPIN',
    REL_TO: 'REL_TO',
    WAIVED: 'WAIVED',
    LIMDIS: 'LIMDIS',
    EXDIS: 'EXDIS',
    NODIS: 'NODIS',
};
/**
 * Validation Thresholds
 */
exports.VALIDATION_THRESHOLDS = {
    /** Minimum credibility score for auto-approval */
    AUTO_APPROVE_CREDIBILITY: 80,
    /** Minimum information rating for priority processing */
    PRIORITY_PROCESSING_INFO: 60,
    /** Maximum days between contact before dormancy warning */
    DORMANCY_WARNING_DAYS: 30,
    /** Maximum days between contact before auto-dormancy */
    AUTO_DORMANCY_DAYS: 90,
    /** Minimum corroboration percentage for high-confidence intel */
    HIGH_CONFIDENCE_CORROBORATION: 75,
};
/**
 * Graph Relationship Types for HUMINT
 */
exports.HUMINT_RELATIONSHIP_TYPES = {
    /** Source provides information about target */
    REPORTS_ON: 'REPORTS_ON',
    /** Source has access to target */
    HAS_ACCESS_TO: 'HAS_ACCESS_TO',
    /** Handler manages source */
    HANDLES: 'HANDLES',
    /** Debrief session with source */
    DEBRIEFED_BY: 'DEBRIEFED_BY',
    /** Intelligence derived from source */
    DERIVED_FROM_SOURCE: 'DERIVED_FROM_SOURCE',
    /** Source corroborates other source */
    CORROBORATES: 'CORROBORATES',
    /** Source contradicts other source */
    CONTRADICTS: 'CONTRADICTS',
    /** Source recruited by another source */
    RECRUITED_BY: 'RECRUITED_BY',
    /** Source associated with organization */
    AFFILIATED_WITH: 'AFFILIATED_WITH',
    /** Source located at location */
    OPERATES_IN: 'OPERATES_IN',
    /** Payment to source */
    COMPENSATED_BY: 'COMPENSATED_BY',
    /** Tasking assigned to source */
    TASKED_WITH: 'TASKED_WITH',
};
