/**
 * Policy Enforcement Engine for Context Provenance
 *
 * Evaluates policy rules against context segments at MCP assembly time.
 * Supports permit/deny/redact/flag actions.
 *
 * @see docs/adr/ADR-009_context_provenance_graph.md
 */

import {
  PolicyRule,
  PolicyViolation,
  EnforcementResult,
  ContextSegment,
  TrustTier,
} from "./types.js";

/**
 * PolicyEngine
 *
 * Evaluates context segments against security and governance policies
 * before model invocation.
 */
export class PolicyEngine {
  private rules: Map<string, PolicyRule> = new Map();

  constructor(initialRules?: PolicyRule[]) {
    if (initialRules) {
      for (const rule of initialRules) {
        this.addRule(rule);
      }
    }
  }

  /**
   * Register a new policy rule
   */
  addRule(rule: PolicyRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Remove a policy rule
   */
  removeRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  /**
   * Enforce policies against a set of context segments
   */
  enforce(segments: ContextSegment[]): EnforcementResult {
    const violations: PolicyViolation[] = [];
    const redactedSegments: string[] = [];
    const flaggedSegments: string[] = [];
    let allowed = true;

    for (const segment of segments) {
      // Skip already-revoked segments
      if (segment.metadata.verificationStatus === "revoked") {
        violations.push({
          ruleId: "revocation-check",
          segmentId: segment.id,
          message: "Segment has been revoked",
          action: "deny",
          timestamp: new Date(),
        });
        allowed = false;
        continue;
      }

      // Evaluate all rules against this segment
      for (const rule of this.rules.values()) {
        if (rule.condition(segment)) {
          const violation: PolicyViolation = {
            ruleId: rule.id,
            segmentId: segment.id,
            message: `Policy violation: ${rule.description}`,
            action: rule.action,
            timestamp: new Date(),
            remediation: rule.justification,
          };

          violations.push(violation);

          // Apply action
          switch (rule.action) {
            case "deny":
              if (rule.severity === "block") {
                allowed = false;
              }
              break;

            case "redact":
              redactedSegments.push(segment.id);
              break;

            case "flag":
              flaggedSegments.push(segment.id);
              break;

            case "permit":
              // Explicit permit (no-op, but logged)
              break;
          }
        }
      }
    }

    return {
      allowed,
      violations,
      redactedSegments,
      flaggedSegments,
    };
  }

  /**
   * Apply redactions to segments (returns modified copies)
   */
  applyRedactions(segments: ContextSegment[], redactedIds: string[]): ContextSegment[] {
    const redactedSet = new Set(redactedIds);

    return segments.map((segment) => {
      if (redactedSet.has(segment.id)) {
        return {
          ...segment,
          content: `[REDACTED: Policy domain ${segment.metadata.policyDomain}]`,
          metadata: {
            ...segment.metadata,
            // Mark as redacted in metadata
            redacted: true,
          } as any,
        };
      }
      return segment;
    });
  }
}

/**
 * Default policy rules for common scenarios
 */

/**
 * Block segments from revoked agents
 */
export function revokedAgentRule(): PolicyRule {
  return {
    id: "revoked-agent-block",
    description: "Block context from revoked agents",
    condition: (segment) => segment.metadata.verificationStatus === "revoked",
    action: "deny",
    justification: "Agent has been revoked due to security concerns",
    severity: "block",
  };
}

/**
 * Redact segments from external trust tier in high-security sessions
 */
export function externalTrustRedactionRule(highSecurityMode: boolean): PolicyRule {
  return {
    id: "external-trust-redaction",
    description: "Redact external trust tier content in high-security mode",
    condition: (segment) => highSecurityMode && segment.metadata.trustTier === "external",
    action: "redact",
    justification: "High-security mode requires verified or system-level context only",
    severity: "warn",
  };
}

/**
 * Flag unsigned segments for audit
 */
export function unsignedSegmentAuditRule(): PolicyRule {
  return {
    id: "unsigned-segment-audit",
    description: "Flag unsigned segments for review",
    condition: (segment) => segment.metadata.verificationStatus === "unsigned",
    action: "flag",
    justification: "Unsigned segments should be audited for origin verification",
    severity: "info",
  };
}

/**
 * Deny segments with mismatched policy domains
 */
export function policyDomainMismatchRule(allowedDomains: string[]): PolicyRule {
  const allowedSet = new Set(allowedDomains);

  return {
    id: "policy-domain-mismatch",
    description: "Block segments from unauthorized policy domains",
    condition: (segment) => !allowedSet.has(segment.metadata.policyDomain),
    action: "deny",
    justification: `Only policy domains ${allowedDomains.join(", ")} are permitted`,
    severity: "block",
  };
}

/**
 * Redact segments from specific agents (e.g., during incident response)
 */
export function agentQuarantineRule(quarantinedAgentIds: string[]): PolicyRule {
  const quarantinedSet = new Set(quarantinedAgentIds);

  return {
    id: "agent-quarantine",
    description: "Redact context from quarantined agents",
    condition: (segment) => {
      return (
        segment.metadata.sourceAgentId !== undefined &&
        quarantinedSet.has(segment.metadata.sourceAgentId)
      );
    },
    action: "redact",
    justification: "Agent is under investigation; context quarantined",
    severity: "block",
  };
}

/**
 * Trust tier escalation rule: deny lower-tier context in high-tier sessions
 */
export function trustTierEscalationRule(
  requiredTier: TrustTier,
  tierHierarchy: TrustTier[] = ["system", "verified", "user", "external"]
): PolicyRule {
  const requiredLevel = tierHierarchy.indexOf(requiredTier);

  return {
    id: "trust-tier-escalation",
    description: `Require trust tier ${requiredTier} or higher`,
    condition: (segment) => {
      const segmentLevel = tierHierarchy.indexOf(segment.metadata.trustTier);
      return segmentLevel > requiredLevel; // Lower trust tier (higher index)
    },
    action: "deny",
    justification: `Session requires minimum trust tier: ${requiredTier}`,
    severity: "block",
  };
}

/**
 * Time-based expiration rule: deny segments older than N days
 */
export function contextExpirationRule(maxAgeDays: number): PolicyRule {
  return {
    id: "context-expiration",
    description: `Block context older than ${maxAgeDays} days`,
    condition: (segment) => {
      const ageMs = Date.now() - segment.metadata.timestamp.getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      return ageDays > maxAgeDays;
    },
    action: "deny",
    justification: "Expired context may contain outdated or invalid information",
    severity: "warn",
  };
}
