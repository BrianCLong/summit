"use strict";
/**
 * Authority/License Compiler Policy Schema
 *
 * Defines the structure for authority policies that govern:
 * - Data access controls (licenses, compartments)
 * - Operation permissions (read, write, export, delete)
 * - Two-person control requirements
 * - Selector minimization rules
 *
 * @module authority-compiler
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.schemas = exports.PolicyDecision = exports.PolicyBundle = exports.SelectorMinimization = exports.TwoPersonControl = exports.Authority = exports.Operation = exports.LicenseType = exports.Compartment = exports.ClassificationLevel = void 0;
const zod_1 = require("zod");
// -----------------------------------------------------------------------------
// Core Policy Types
// -----------------------------------------------------------------------------
/**
 * Classification levels for data sensitivity
 */
exports.ClassificationLevel = zod_1.z.enum([
    'UNCLASSIFIED',
    'CUI', // Controlled Unclassified Information
    'CONFIDENTIAL',
    'SECRET',
    'TOP_SECRET',
]);
/**
 * Compartment identifiers for need-to-know access
 */
exports.Compartment = zod_1.z.object({
    id: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    parentId: zod_1.z.string().optional(), // Hierarchical compartments
});
/**
 * License types that govern data usage
 */
exports.LicenseType = zod_1.z.enum([
    'INTERNAL_ONLY', // Cannot be shared externally
    'RELEASABLE', // Can be shared with approved parties
    'ORCON', // Originator controlled
    'NOFORN', // No foreign nationals
    'PROPIN', // Proprietary information
    'CUSTOM', // Custom license terms
]);
/**
 * Operations that can be controlled
 */
exports.Operation = zod_1.z.enum([
    'READ',
    'CREATE',
    'UPDATE',
    'DELETE',
    'EXPORT',
    'SHARE',
    'ANNOTATE',
    'LINK', // Create relationships
    'QUERY', // Execute queries
    'COPILOT', // AI copilot interactions
]);
// -----------------------------------------------------------------------------
// Authority Definitions
// -----------------------------------------------------------------------------
/**
 * An authority grants specific permissions to subjects
 */
exports.Authority = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    // Who this authority applies to
    subjects: zod_1.z.object({
        roles: zod_1.z.array(zod_1.z.string()).optional(),
        users: zod_1.z.array(zod_1.z.string()).optional(),
        groups: zod_1.z.array(zod_1.z.string()).optional(),
        tenants: zod_1.z.array(zod_1.z.string()).optional(),
    }),
    // What operations are permitted
    permissions: zod_1.z.array(exports.Operation),
    // Resource constraints
    resources: zod_1.z.object({
        entityTypes: zod_1.z.array(zod_1.z.string()).optional(), // e.g., ['Person', 'Organization']
        classifications: zod_1.z.array(exports.ClassificationLevel).optional(),
        compartments: zod_1.z.array(zod_1.z.string()).optional(),
        licenses: zod_1.z.array(exports.LicenseType).optional(),
        investigations: zod_1.z.array(zod_1.z.string()).optional(), // Specific investigation IDs
    }),
    // Conditions that must be met
    conditions: zod_1.z
        .object({
        requireMFA: zod_1.z.boolean().default(false),
        requireJustification: zod_1.z.boolean().default(false),
        requireTwoPersonControl: zod_1.z.boolean().default(false),
        maxRecords: zod_1.z.number().positive().optional(),
        validFrom: zod_1.z.string().datetime().optional(),
        validTo: zod_1.z.string().datetime().optional(),
        ipAllowlist: zod_1.z.array(zod_1.z.string()).optional(),
        timeWindow: zod_1.z
            .object({
            startHour: zod_1.z.number().min(0).max(23),
            endHour: zod_1.z.number().min(0).max(23),
            timezone: zod_1.z.string().default('UTC'),
            daysOfWeek: zod_1.z.array(zod_1.z.number().min(0).max(6)).optional(),
        })
            .optional(),
    })
        .optional(),
    // Audit requirements
    audit: zod_1.z
        .object({
        logAccess: zod_1.z.boolean().default(true),
        logDenials: zod_1.z.boolean().default(true),
        notifyOnAccess: zod_1.z.array(zod_1.z.string()).optional(), // User IDs to notify
        retentionDays: zod_1.z.number().positive().default(365),
    })
        .optional(),
    // Metadata
    metadata: zod_1.z
        .object({
        createdBy: zod_1.z.string(),
        createdAt: zod_1.z.string().datetime(),
        updatedBy: zod_1.z.string().optional(),
        updatedAt: zod_1.z.string().datetime().optional(),
        version: zod_1.z.number().positive().default(1),
        tags: zod_1.z.array(zod_1.z.string()).optional(),
    })
        .optional(),
});
// -----------------------------------------------------------------------------
// Two-Person Control
// -----------------------------------------------------------------------------
/**
 * Two-person control workflow definition
 */
exports.TwoPersonControl = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    // What triggers this control
    triggers: zod_1.z.object({
        operations: zod_1.z.array(exports.Operation),
        entityTypes: zod_1.z.array(zod_1.z.string()).optional(),
        classifications: zod_1.z.array(exports.ClassificationLevel).optional(),
        thresholds: zod_1.z
            .object({
            recordCount: zod_1.z.number().positive().optional(),
            exportSize: zod_1.z.number().positive().optional(), // bytes
        })
            .optional(),
    }),
    // Approval requirements
    approval: zod_1.z.object({
        requiredApprovers: zod_1.z.number().min(1).default(1),
        approverRoles: zod_1.z.array(zod_1.z.string()),
        approverExclusions: zod_1.z.array(zod_1.z.string()).optional(), // Cannot approve own requests
        timeoutHours: zod_1.z.number().positive().default(24),
        escalationPath: zod_1.z.array(zod_1.z.string()).optional(),
    }),
    // Workflow settings
    workflow: zod_1.z
        .object({
        requireComment: zod_1.z.boolean().default(true),
        allowDelegation: zod_1.z.boolean().default(false),
        notifyOnRequest: zod_1.z.boolean().default(true),
        notifyOnApproval: zod_1.z.boolean().default(true),
        notifyOnDenial: zod_1.z.boolean().default(true),
    })
        .optional(),
});
// -----------------------------------------------------------------------------
// Selector Minimization
// -----------------------------------------------------------------------------
/**
 * Selector minimization rules for need-to-know enforcement
 */
exports.SelectorMinimization = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    // Query constraints
    constraints: zod_1.z.object({
        // Maximum records that can be returned
        maxResults: zod_1.z.number().positive().default(1000),
        // Required filters (must specify at least one)
        requiredFilters: zod_1.z.array(zod_1.z.string()).optional(), // e.g., ['investigationId', 'timeRange']
        // Fields that must be redacted
        redactedFields: zod_1.z.array(zod_1.z.string()).optional(),
        // Fields that require explicit justification
        sensitiveFields: zod_1.z.array(zod_1.z.string()).optional(),
        // Maximum traversal depth for graph queries
        maxHops: zod_1.z.number().min(1).max(10).default(3),
        // Time range limits
        maxTimeRange: zod_1.z
            .object({
            value: zod_1.z.number().positive(),
            unit: zod_1.z.enum(['hours', 'days', 'weeks', 'months']),
        })
            .optional(),
    }),
    // Applies to these entity types
    entityTypes: zod_1.z.array(zod_1.z.string()).optional(),
    // Applies to these classifications
    classifications: zod_1.z.array(exports.ClassificationLevel).optional(),
});
// -----------------------------------------------------------------------------
// Policy Bundle
// -----------------------------------------------------------------------------
/**
 * Complete policy bundle containing all authority definitions
 */
exports.PolicyBundle = zod_1.z.object({
    version: zod_1.z.string().regex(/^\d+\.\d+\.\d+$/), // semver
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    // Policy effective dates
    effectiveFrom: zod_1.z.string().datetime(),
    effectiveTo: zod_1.z.string().datetime().optional(),
    // Authority definitions
    authorities: zod_1.z.array(exports.Authority),
    // Two-person control workflows
    twoPersonControls: zod_1.z.array(exports.TwoPersonControl).optional(),
    // Selector minimization rules
    selectorMinimization: zod_1.z.array(exports.SelectorMinimization).optional(),
    // Compartment definitions
    compartments: zod_1.z.array(exports.Compartment).optional(),
    // Bundle metadata
    metadata: zod_1.z.object({
        createdBy: zod_1.z.string(),
        createdAt: zod_1.z.string().datetime(),
        signedBy: zod_1.z.string().optional(),
        signature: zod_1.z.string().optional(), // JWS signature
        hash: zod_1.z.string().optional(), // SHA-256 of bundle content
    }),
});
// -----------------------------------------------------------------------------
// Evaluation Results
// -----------------------------------------------------------------------------
/**
 * Result of policy evaluation
 */
exports.PolicyDecision = zod_1.z.object({
    allowed: zod_1.z.boolean(),
    authorityId: zod_1.z.string().uuid().optional(), // Which authority granted access
    reason: zod_1.z.string(), // Human-readable explanation
    conditions: zod_1.z.array(zod_1.z.string()).optional(), // Conditions that must be met
    requiresTwoPersonControl: zod_1.z.boolean().default(false),
    twoPersonControlId: zod_1.z.string().uuid().optional(),
    redactedFields: zod_1.z.array(zod_1.z.string()).optional(),
    maxResults: zod_1.z.number().optional(),
    auditId: zod_1.z.string().uuid(), // ID for audit trail
});
// -----------------------------------------------------------------------------
// Exports
// -----------------------------------------------------------------------------
exports.schemas = {
    ClassificationLevel: exports.ClassificationLevel,
    Compartment: exports.Compartment,
    LicenseType: exports.LicenseType,
    Operation: exports.Operation,
    Authority: exports.Authority,
    TwoPersonControl: exports.TwoPersonControl,
    SelectorMinimization: exports.SelectorMinimization,
    PolicyBundle: exports.PolicyBundle,
    PolicyDecision: exports.PolicyDecision,
};
exports.default = exports.schemas;
