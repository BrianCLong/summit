/**
 * GraphRAG Policy Guard
 * Enforces policy/access controls and filters evidence based on user permissions
 */

import logger from '../../utils/logger.js';
import {
  PolicyEngine,
  PolicyDecision,
  UserContext,
  EvidenceSnippet,
  GraphContext,
} from './types.js';

// Classification level hierarchy (higher = more restricted)
const CLASSIFICATION_LEVELS: Record<string, number> = {
  PUBLIC: 0,
  UNCLASSIFIED: 0,
  CONFIDENTIAL: 1,
  RESTRICTED: 2,
  SECRET: 3,
  TS: 4, // Top Secret
  'TS-SCI': 5, // Top Secret - Sensitive Compartmented Information
};

// License types that allow analytic use
const ANALYTICS_ALLOWED_LICENSES = [
  'INGEST',
  'ANALYZE',
  'INTERNAL_USE',
  'FULL_ACCESS',
];

/**
 * Default policy engine implementation
 */
export class DefaultPolicyEngine implements PolicyEngine {
  canViewEvidence(params: {
    user: UserContext;
    evidenceId: string;
    metadata?: Record<string, any>;
  }): PolicyDecision {
    const { user, metadata } = params;

    // Check classification level
    const evidenceClassification = metadata?.classification;
    if (evidenceClassification) {
      const userLevel = this.getUserClassificationLevel(user);
      const evidenceLevel = CLASSIFICATION_LEVELS[evidenceClassification.toUpperCase()] ?? 0;

      if (userLevel < evidenceLevel) {
        return {
          allow: false,
          reason: `Insufficient clearance: user has ${user.classification || 'none'}, evidence requires ${evidenceClassification}`,
        };
      }
    }

    // Check need-to-know tags
    const requiredTags = metadata?.needToKnowTags as string[] | undefined;
    if (requiredTags && requiredTags.length > 0) {
      const userTags = new Set(user.needToKnowTags || []);
      const hasRequiredTags = requiredTags.some((tag) => userTags.has(tag));

      if (!hasRequiredTags) {
        return {
          allow: false,
          reason: `Missing need-to-know tag: requires one of [${requiredTags.join(', ')}]`,
        };
      }
    }

    // Check license restrictions
    const licenseType = metadata?.licenseType;
    if (licenseType && !ANALYTICS_ALLOWED_LICENSES.includes(licenseType)) {
      return {
        allow: false,
        reason: `License type "${licenseType}" does not allow analytic use`,
      };
    }

    // Check tenant isolation
    const evidenceTenantId = metadata?.tenantId;
    if (evidenceTenantId && user.tenantId && evidenceTenantId !== user.tenantId) {
      return {
        allow: false,
        reason: 'Evidence belongs to a different tenant',
      };
    }

    return { allow: true, reason: 'Access granted' };
  }

  canViewClaim(params: {
    user: UserContext;
    claimId: string;
    metadata?: Record<string, any>;
  }): PolicyDecision {
    // Claims inherit policy from their evidence
    // For now, use same logic as evidence
    return this.canViewEvidence({
      user: params.user,
      evidenceId: params.claimId,
      metadata: params.metadata,
    });
  }

  private getUserClassificationLevel(user: UserContext): number {
    // Check clearances first (array of classifications user can access)
    if (user.clearances && user.clearances.length > 0) {
      return Math.max(
        ...user.clearances.map(
          (c) => CLASSIFICATION_LEVELS[c.toUpperCase()] ?? 0,
        ),
      );
    }

    // Fall back to single classification field
    if (user.classification) {
      return CLASSIFICATION_LEVELS[user.classification.toUpperCase()] ?? 0;
    }

    // Default to lowest level
    return 0;
  }
}

/**
 * Filter evidence snippets based on user policy
 */
export function filterEvidenceByPolicy(
  evidenceSnippets: EvidenceSnippet[],
  user: UserContext,
  policyEngine: PolicyEngine,
): {
  allowed: EvidenceSnippet[];
  filtered: EvidenceSnippet[];
  filterReasons: Map<string, string>;
} {
  const allowed: EvidenceSnippet[] = [];
  const filtered: EvidenceSnippet[] = [];
  const filterReasons = new Map<string, string>();

  for (const snippet of evidenceSnippets) {
    const decision = policyEngine.canViewEvidence({
      user,
      evidenceId: snippet.evidenceId,
      metadata: {
        classification: snippet.classification,
        licenseType: snippet.licenseId,
        needToKnowTags: snippet.metadata?.needToKnowTags,
        tenantId: snippet.metadata?.tenantId,
      },
    });

    if (decision.allow) {
      allowed.push(snippet);
    } else {
      filtered.push(snippet);
      filterReasons.set(snippet.evidenceId, decision.reason);
    }
  }

  if (filtered.length > 0) {
    logger.info({
      message: 'Evidence filtered by policy',
      userId: user.userId,
      allowedCount: allowed.length,
      filteredCount: filtered.length,
    });
  }

  return { allowed, filtered, filterReasons };
}

/**
 * Apply policy filtering to entire graph context
 */
export function applyPolicyToContext(
  context: GraphContext,
  user: UserContext,
  policyEngine: PolicyEngine,
): {
  filteredContext: GraphContext;
  policyDecisions: {
    filteredEvidenceCount: number;
    allowedEvidenceCount: number;
  };
} {
  const { allowed, filtered } = filterEvidenceByPolicy(
    context.evidenceSnippets,
    user,
    policyEngine,
  );

  const filteredContext: GraphContext = {
    nodes: context.nodes, // Nodes are not filtered (just structure)
    edges: context.edges,
    evidenceSnippets: allowed,
  };

  return {
    filteredContext,
    policyDecisions: {
      filteredEvidenceCount: filtered.length,
      allowedEvidenceCount: allowed.length,
    },
  };
}

/**
 * Check if user has access to case
 */
export function canAccessCase(user: UserContext, caseId: string): boolean {
  // Check if user is member of case
  if (user.cases && Array.isArray(user.cases)) {
    return user.cases.includes(caseId);
  }

  // If no case membership tracking, allow access (rely on other controls)
  return true;
}

/**
 * Mock policy engine for testing
 */
export class MockPolicyEngine implements PolicyEngine {
  private allowAll: boolean = true;
  private deniedIds: Set<string> = new Set();

  setAllowAll(allow: boolean): void {
    this.allowAll = allow;
  }

  denyEvidence(evidenceId: string): void {
    this.deniedIds.add(evidenceId);
  }

  clearDenied(): void {
    this.deniedIds.clear();
  }

  canViewEvidence(params: {
    user: UserContext;
    evidenceId: string;
    metadata?: Record<string, any>;
  }): PolicyDecision {
    if (this.deniedIds.has(params.evidenceId)) {
      return { allow: false, reason: 'Explicitly denied for testing' };
    }

    if (!this.allowAll) {
      return { allow: false, reason: 'Policy engine set to deny all' };
    }

    return { allow: true, reason: 'Allowed by mock policy' };
  }

  canViewClaim(params: {
    user: UserContext;
    claimId: string;
    metadata?: Record<string, any>;
  }): PolicyDecision {
    return { allow: this.allowAll, reason: 'Mock claim policy' };
  }
}

export function createPolicyEngine(): PolicyEngine {
  if (process.env.NODE_ENV === 'test') {
    return new MockPolicyEngine();
  }
  return new DefaultPolicyEngine();
}
