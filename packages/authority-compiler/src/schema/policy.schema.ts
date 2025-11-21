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

import { z } from 'zod';

// -----------------------------------------------------------------------------
// Core Policy Types
// -----------------------------------------------------------------------------

/**
 * Classification levels for data sensitivity
 */
export const ClassificationLevel = z.enum([
  'UNCLASSIFIED',
  'CUI', // Controlled Unclassified Information
  'CONFIDENTIAL',
  'SECRET',
  'TOP_SECRET',
]);
export type ClassificationLevel = z.infer<typeof ClassificationLevel>;

/**
 * Compartment identifiers for need-to-know access
 */
export const Compartment = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  parentId: z.string().optional(), // Hierarchical compartments
});
export type Compartment = z.infer<typeof Compartment>;

/**
 * License types that govern data usage
 */
export const LicenseType = z.enum([
  'INTERNAL_ONLY', // Cannot be shared externally
  'RELEASABLE', // Can be shared with approved parties
  'ORCON', // Originator controlled
  'NOFORN', // No foreign nationals
  'PROPIN', // Proprietary information
  'CUSTOM', // Custom license terms
]);
export type LicenseType = z.infer<typeof LicenseType>;

/**
 * Operations that can be controlled
 */
export const Operation = z.enum([
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
export type Operation = z.infer<typeof Operation>;

// -----------------------------------------------------------------------------
// Authority Definitions
// -----------------------------------------------------------------------------

/**
 * An authority grants specific permissions to subjects
 */
export const Authority = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),

  // Who this authority applies to
  subjects: z.object({
    roles: z.array(z.string()).optional(),
    users: z.array(z.string()).optional(),
    groups: z.array(z.string()).optional(),
    tenants: z.array(z.string()).optional(),
  }),

  // What operations are permitted
  permissions: z.array(Operation),

  // Resource constraints
  resources: z.object({
    entityTypes: z.array(z.string()).optional(), // e.g., ['Person', 'Organization']
    classifications: z.array(ClassificationLevel).optional(),
    compartments: z.array(z.string()).optional(),
    licenses: z.array(LicenseType).optional(),
    investigations: z.array(z.string()).optional(), // Specific investigation IDs
  }),

  // Conditions that must be met
  conditions: z
    .object({
      requireMFA: z.boolean().default(false),
      requireJustification: z.boolean().default(false),
      requireTwoPersonControl: z.boolean().default(false),
      maxRecords: z.number().positive().optional(),
      validFrom: z.string().datetime().optional(),
      validTo: z.string().datetime().optional(),
      ipAllowlist: z.array(z.string()).optional(),
      timeWindow: z
        .object({
          startHour: z.number().min(0).max(23),
          endHour: z.number().min(0).max(23),
          timezone: z.string().default('UTC'),
          daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
        })
        .optional(),
    })
    .optional(),

  // Audit requirements
  audit: z
    .object({
      logAccess: z.boolean().default(true),
      logDenials: z.boolean().default(true),
      notifyOnAccess: z.array(z.string()).optional(), // User IDs to notify
      retentionDays: z.number().positive().default(365),
    })
    .optional(),

  // Metadata
  metadata: z
    .object({
      createdBy: z.string(),
      createdAt: z.string().datetime(),
      updatedBy: z.string().optional(),
      updatedAt: z.string().datetime().optional(),
      version: z.number().positive().default(1),
      tags: z.array(z.string()).optional(),
    })
    .optional(),
});
export type Authority = z.infer<typeof Authority>;

// -----------------------------------------------------------------------------
// Two-Person Control
// -----------------------------------------------------------------------------

/**
 * Two-person control workflow definition
 */
export const TwoPersonControl = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),

  // What triggers this control
  triggers: z.object({
    operations: z.array(Operation),
    entityTypes: z.array(z.string()).optional(),
    classifications: z.array(ClassificationLevel).optional(),
    thresholds: z
      .object({
        recordCount: z.number().positive().optional(),
        exportSize: z.number().positive().optional(), // bytes
      })
      .optional(),
  }),

  // Approval requirements
  approval: z.object({
    requiredApprovers: z.number().min(1).default(1),
    approverRoles: z.array(z.string()),
    approverExclusions: z.array(z.string()).optional(), // Cannot approve own requests
    timeoutHours: z.number().positive().default(24),
    escalationPath: z.array(z.string()).optional(),
  }),

  // Workflow settings
  workflow: z
    .object({
      requireComment: z.boolean().default(true),
      allowDelegation: z.boolean().default(false),
      notifyOnRequest: z.boolean().default(true),
      notifyOnApproval: z.boolean().default(true),
      notifyOnDenial: z.boolean().default(true),
    })
    .optional(),
});
export type TwoPersonControl = z.infer<typeof TwoPersonControl>;

// -----------------------------------------------------------------------------
// Selector Minimization
// -----------------------------------------------------------------------------

/**
 * Selector minimization rules for need-to-know enforcement
 */
export const SelectorMinimization = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),

  // Query constraints
  constraints: z.object({
    // Maximum records that can be returned
    maxResults: z.number().positive().default(1000),

    // Required filters (must specify at least one)
    requiredFilters: z.array(z.string()).optional(), // e.g., ['investigationId', 'timeRange']

    // Fields that must be redacted
    redactedFields: z.array(z.string()).optional(),

    // Fields that require explicit justification
    sensitiveFields: z.array(z.string()).optional(),

    // Maximum traversal depth for graph queries
    maxHops: z.number().min(1).max(10).default(3),

    // Time range limits
    maxTimeRange: z
      .object({
        value: z.number().positive(),
        unit: z.enum(['hours', 'days', 'weeks', 'months']),
      })
      .optional(),
  }),

  // Applies to these entity types
  entityTypes: z.array(z.string()).optional(),

  // Applies to these classifications
  classifications: z.array(ClassificationLevel).optional(),
});
export type SelectorMinimization = z.infer<typeof SelectorMinimization>;

// -----------------------------------------------------------------------------
// Policy Bundle
// -----------------------------------------------------------------------------

/**
 * Complete policy bundle containing all authority definitions
 */
export const PolicyBundle = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/), // semver
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),

  // Policy effective dates
  effectiveFrom: z.string().datetime(),
  effectiveTo: z.string().datetime().optional(),

  // Authority definitions
  authorities: z.array(Authority),

  // Two-person control workflows
  twoPersonControls: z.array(TwoPersonControl).optional(),

  // Selector minimization rules
  selectorMinimization: z.array(SelectorMinimization).optional(),

  // Compartment definitions
  compartments: z.array(Compartment).optional(),

  // Bundle metadata
  metadata: z.object({
    createdBy: z.string(),
    createdAt: z.string().datetime(),
    signedBy: z.string().optional(),
    signature: z.string().optional(), // JWS signature
    hash: z.string().optional(), // SHA-256 of bundle content
  }),
});
export type PolicyBundle = z.infer<typeof PolicyBundle>;

// -----------------------------------------------------------------------------
// Evaluation Results
// -----------------------------------------------------------------------------

/**
 * Result of policy evaluation
 */
export const PolicyDecision = z.object({
  allowed: z.boolean(),
  authorityId: z.string().uuid().optional(), // Which authority granted access
  reason: z.string(), // Human-readable explanation
  conditions: z.array(z.string()).optional(), // Conditions that must be met
  requiresTwoPersonControl: z.boolean().default(false),
  twoPersonControlId: z.string().uuid().optional(),
  redactedFields: z.array(z.string()).optional(),
  maxResults: z.number().optional(),
  auditId: z.string().uuid(), // ID for audit trail
});
export type PolicyDecision = z.infer<typeof PolicyDecision>;

// -----------------------------------------------------------------------------
// Exports
// -----------------------------------------------------------------------------

export const schemas = {
  ClassificationLevel,
  Compartment,
  LicenseType,
  Operation,
  Authority,
  TwoPersonControl,
  SelectorMinimization,
  PolicyBundle,
  PolicyDecision,
};

export default schemas;
