/**
 * Policy & Governance Engine
 *
 * Implements Attribute-Based Access Control (ABAC) for graph entities and edges.
 * Evaluates access decisions based on:
 * - User attributes (roles, clearances, jurisdictions)
 * - Object attributes (sensitivity, purpose, need-to-know tags)
 * - Operations (READ, WRITE, EXPORT)
 *
 * @module canonical-entities/policy
 */

import { Sensitivity, PolicyLabels } from './types';

// -----------------------------------------------------------------------------
// User Context
// -----------------------------------------------------------------------------

/**
 * User context for authorization decisions
 */
export interface UserContext {
  /** User identifier */
  userId: string;
  /** User roles (e.g., 'ANALYST', 'LEAD', 'ADMIN', 'OMBUDSMAN') */
  roles: string[];
  /** Clearance levels (e.g., 'PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'SECRET') */
  clearances: Sensitivity[];
  /** Jurisdictions the user can access */
  jurisdictions?: string[];
  /** Purposes the user is authorized for */
  purposes?: string[];
  /** Need-to-know tags the user has access to */
  needToKnowTags?: string[];
  /** Additional user attributes */
  attributes?: Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// Policy Check Types
// -----------------------------------------------------------------------------

/**
 * Operation types for access control
 */
export type Operation = 'READ' | 'WRITE' | 'EXPORT' | 'DELETE';

/**
 * Input for policy check
 */
export interface PolicyCheckInput {
  /** User making the request */
  user: UserContext;
  /** Object being accessed (entity or edge) */
  object: PolicyLabels;
  /** Operation being performed */
  operation: Operation;
  /** Additional context for the decision */
  context?: Record<string, unknown>;
}

/**
 * Result of a policy check
 */
export interface PolicyCheckDecision {
  /** Whether access is allowed */
  allow: boolean;
  /** Human-readable reason for the decision */
  reason: string;
  /** Additional decision metadata */
  metadata?: {
    /** Rules that were evaluated */
    rulesEvaluated?: string[];
    /** Rules that matched */
    rulesMatched?: string[];
    /** Evaluation time in ms */
    evaluationTimeMs?: number;
  };
}

// -----------------------------------------------------------------------------
// Sensitivity Level Hierarchy
// -----------------------------------------------------------------------------

/**
 * Sensitivity level hierarchy (ordered from least to most sensitive)
 */
const SENSITIVITY_HIERARCHY: Sensitivity[] = ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'SECRET'];

/**
 * Check if a clearance level is sufficient for a sensitivity level
 *
 * @param clearance - User's clearance level
 * @param sensitivity - Object's sensitivity level
 * @returns true if clearance is sufficient
 */
export function hasSufficientClearance(clearance: Sensitivity, sensitivity: Sensitivity): boolean {
  const clearanceIndex = SENSITIVITY_HIERARCHY.indexOf(clearance);
  const sensitivityIndex = SENSITIVITY_HIERARCHY.indexOf(sensitivity);

  if (clearanceIndex === -1 || sensitivityIndex === -1) {
    return false;
  }

  return clearanceIndex >= sensitivityIndex;
}

/**
 * Get the highest clearance level from a list
 *
 * @param clearances - List of clearance levels
 * @returns Highest clearance level
 */
export function getHighestClearance(clearances: Sensitivity[]): Sensitivity | null {
  if (clearances.length === 0) return null;

  return clearances.reduce((highest, current) => {
    const highestIndex = SENSITIVITY_HIERARCHY.indexOf(highest);
    const currentIndex = SENSITIVITY_HIERARCHY.indexOf(current);
    return currentIndex > highestIndex ? current : highest;
  });
}

// -----------------------------------------------------------------------------
// License Checking
// -----------------------------------------------------------------------------

/**
 * Simple license registry (in production, this would be a database)
 */
const LICENSE_REGISTRY: Map<string, { canExport: boolean; restrictions: string[] }> = new Map([
  ['EXPORT_LICENSE_US', { canExport: true, restrictions: [] }],
  ['EXPORT_LICENSE_EU', { canExport: true, restrictions: ['non-commercial'] }],
  ['NO_EXPORT', { canExport: false, restrictions: ['no-export'] }],
]);

/**
 * Check if export is allowed for a given license
 *
 * @param licenseId - License identifier
 * @param user - User context
 * @returns true if export is allowed
 */
export function isExportAllowed(licenseId: string, user: UserContext): boolean {
  const license = LICENSE_REGISTRY.get(licenseId);
  if (!license) {
    // Unknown license - deny by default
    return false;
  }

  return license.canExport;
}

// -----------------------------------------------------------------------------
// Core Policy Evaluation
// -----------------------------------------------------------------------------

/**
 * Check access to an object based on policy rules
 *
 * This is the main policy evaluation function. It checks:
 * 1. Sensitivity vs clearance
 * 2. Purpose limitation
 * 3. Need-to-know tags
 * 4. License restrictions (for EXPORT)
 *
 * @param input - Policy check input
 * @returns Policy decision
 *
 * @example
 * ```ts
 * const decision = checkAccess({
 *   user: {
 *     userId: 'analyst1',
 *     roles: ['ANALYST'],
 *     clearances: ['INTERNAL'],
 *     purposes: ['CTI_ANALYSIS']
 *   },
 *   object: {
 *     sensitivity: 'INTERNAL',
 *     purpose: ['CTI_ANALYSIS'],
 *   },
 *   operation: 'READ'
 * });
 *
 * if (decision.allow) {
 *   console.log('Access granted');
 * } else {
 *   console.log('Access denied:', decision.reason);
 * }
 * ```
 */
export function checkAccess(input: PolicyCheckInput): PolicyCheckDecision {
  const startTime = Date.now();
  const rulesEvaluated: string[] = [];
  const rulesMatched: string[] = [];

  const { user, object, operation } = input;

  // Rule 1: Check sensitivity level
  rulesEvaluated.push('sensitivity-clearance');
  if (object.sensitivity) {
    const highestClearance = getHighestClearance(user.clearances);

    if (!highestClearance || !hasSufficientClearance(highestClearance, object.sensitivity)) {
      return {
        allow: false,
        reason: `User clearance level ${highestClearance || 'NONE'} is insufficient for object sensitivity ${object.sensitivity}`,
        metadata: {
          rulesEvaluated,
          rulesMatched,
          evaluationTimeMs: Date.now() - startTime,
        },
      };
    }
    rulesMatched.push('sensitivity-clearance');
  }

  // Rule 2: Check purpose limitation
  rulesEvaluated.push('purpose-limitation');
  if (object.purpose && object.purpose.length > 0) {
    const objectPurposes = Array.isArray(object.purpose) ? object.purpose : [object.purpose];
    const userPurposes = user.purposes || [];

    // User must have at least one purpose that matches object purposes
    const hasMatchingPurpose = objectPurposes.some((objPurpose) =>
      userPurposes.includes(objPurpose),
    );

    if (!hasMatchingPurpose && (operation === 'READ' || operation === 'EXPORT')) {
      return {
        allow: false,
        reason: `User purposes ${JSON.stringify(userPurposes)} do not match required purposes ${JSON.stringify(objectPurposes)}`,
        metadata: {
          rulesEvaluated,
          rulesMatched,
          evaluationTimeMs: Date.now() - startTime,
        },
      };
    }

    if (hasMatchingPurpose) {
      rulesMatched.push('purpose-limitation');
    }
  }

  // Rule 3: Check need-to-know tags
  rulesEvaluated.push('need-to-know');
  if (object.needToKnowTags && object.needToKnowTags.length > 0) {
    const userTags = user.needToKnowTags || [];

    // User must have ALL required need-to-know tags (strict interpretation)
    const hasAllRequiredTags = object.needToKnowTags.every((tag) => userTags.includes(tag));

    if (!hasAllRequiredTags) {
      return {
        allow: false,
        reason: `User is missing required need-to-know tags. Required: ${JSON.stringify(object.needToKnowTags)}, User has: ${JSON.stringify(userTags)}`,
        metadata: {
          rulesEvaluated,
          rulesMatched,
          evaluationTimeMs: Date.now() - startTime,
        },
      };
    }
    rulesMatched.push('need-to-know');
  }

  // Rule 4: Check license for EXPORT operations
  if (operation === 'EXPORT') {
    rulesEvaluated.push('export-license');
    if (object.licenseId) {
      if (!isExportAllowed(object.licenseId, user)) {
        return {
          allow: false,
          reason: `Export not allowed under license ${object.licenseId}`,
          metadata: {
            rulesEvaluated,
            rulesMatched,
            evaluationTimeMs: Date.now() - startTime,
          },
        };
      }
      rulesMatched.push('export-license');
    }
  }

  // Rule 5: Role-based checks (RBAC component)
  rulesEvaluated.push('role-based');
  if (operation === 'DELETE' || operation === 'WRITE') {
    // Only certain roles can write/delete
    const writeRoles = ['ADMIN', 'LEAD', 'ANALYST'];
    const hasWriteRole = user.roles.some((role) => writeRoles.includes(role));

    if (!hasWriteRole) {
      return {
        allow: false,
        reason: `User role(s) ${JSON.stringify(user.roles)} do not have ${operation} permission`,
        metadata: {
          rulesEvaluated,
          rulesMatched,
          evaluationTimeMs: Date.now() - startTime,
        },
      };
    }
    rulesMatched.push('role-based');
  }

  // All checks passed
  return {
    allow: true,
    reason: 'Access granted - all policy checks passed',
    metadata: {
      rulesEvaluated,
      rulesMatched,
      evaluationTimeMs: Date.now() - startTime,
    },
  };
}

// -----------------------------------------------------------------------------
// Batch Filtering
// -----------------------------------------------------------------------------

/**
 * Filter a collection of objects based on user access
 *
 * @param user - User context
 * @param objects - Collection of objects to filter
 * @param operation - Operation being performed
 * @returns Filtered array of objects the user can access
 *
 * @example
 * ```ts
 * const visibleEntities = filterByAccess(
 *   userContext,
 *   allEntities.map(e => ({ id: e.id, ...e })),
 *   'READ'
 * );
 * ```
 */
export function filterByAccess<T extends PolicyLabels & { id: string }>(
  user: UserContext,
  objects: T[],
  operation: Operation,
): T[] {
  return objects.filter((obj) => {
    const decision = checkAccess({ user, object: obj, operation });
    return decision.allow;
  });
}

/**
 * Check access to multiple objects and return decisions
 *
 * @param user - User context
 * @param objects - Objects to check
 * @param operation - Operation being performed
 * @returns Map of object ID to decision
 */
export function batchCheckAccess<T extends PolicyLabels & { id: string }>(
  user: UserContext,
  objects: T[],
  operation: Operation,
): Map<string, PolicyCheckDecision> {
  const decisions = new Map<string, PolicyCheckDecision>();

  for (const obj of objects) {
    const decision = checkAccess({ user, object: obj, operation });
    decisions.set(obj.id, decision);
  }

  return decisions;
}

// -----------------------------------------------------------------------------
// Policy Helpers
// -----------------------------------------------------------------------------

/**
 * Create a default user context with minimal permissions
 */
export function createDefaultUserContext(userId: string): UserContext {
  return {
    userId,
    roles: [],
    clearances: ['PUBLIC'],
    jurisdictions: [],
    purposes: [],
    needToKnowTags: [],
  };
}

/**
 * Create an admin user context with maximum permissions
 */
export function createAdminUserContext(userId: string): UserContext {
  return {
    userId,
    roles: ['ADMIN'],
    clearances: ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'SECRET'],
    jurisdictions: ['*'],
    purposes: ['*'],
    needToKnowTags: ['*'],
  };
}

/**
 * Merge multiple user contexts (useful for delegation)
 */
export function mergeUserContexts(...contexts: UserContext[]): UserContext {
  if (contexts.length === 0) {
    throw new Error('At least one user context required');
  }

  const merged: UserContext = {
    userId: contexts[0].userId,
    roles: [],
    clearances: [],
    jurisdictions: [],
    purposes: [],
    needToKnowTags: [],
  };

  for (const ctx of contexts) {
    merged.roles.push(...(ctx.roles || []));
    merged.clearances.push(...(ctx.clearances || []));
    merged.jurisdictions?.push(...(ctx.jurisdictions || []));
    merged.purposes?.push(...(ctx.purposes || []));
    merged.needToKnowTags?.push(...(ctx.needToKnowTags || []));
  }

  // Deduplicate
  merged.roles = [...new Set(merged.roles)];
  merged.clearances = [...new Set(merged.clearances)];
  merged.jurisdictions = [...new Set(merged.jurisdictions || [])];
  merged.purposes = [...new Set(merged.purposes || [])];
  merged.needToKnowTags = [...new Set(merged.needToKnowTags || [])];

  return merged;
}
