/**
 * Invariant Validator
 *
 * Validates context capsules against embedded invariants at MCP assembly time.
 *
 * @see docs/adr/ADR-010_invariant_carrying_context_capsules.md
 */

import { loadPolicy, LoadedPolicy } from '@open-policy-agent/opa-wasm';
import {
  ContextCapsule,
  Invariant,
  InvariantViolation,
  ValidationResult,
  ExecutionContext,
  ViolationType
} from './types.js';
import { ContextCapsuleFactory } from './ContextCapsule.js';

/**
 * InvariantValidator
 *
 * Checks capsules for cryptographic integrity and invariant compliance.
 */
export class InvariantValidator {
  private factory: ContextCapsuleFactory;
  private policyCache: Map<string, LoadedPolicy>;

  constructor() {
    this.factory = new ContextCapsuleFactory();
    this.policyCache = new Map();
  }

  /**
   * Validate a set of capsules against execution context
   */
  async validate(
    capsules: ContextCapsule[],
    executionContext: ExecutionContext
  ): Promise<ValidationResult> {
    const violations: InvariantViolation[] = [];

    for (const capsule of capsules) {
      // 1. Verify cryptographic integrity
      if (!this.factory.verifyCapsuleHash(capsule)) {
        violations.push(this.createViolation(
          capsule.id,
          undefined,
          'hash_mismatch',
          'block',
          'Capsule content has been tampered with',
          'Reject capsule; investigate source of corruption'
        ));
      }

      // 2. Verify signature if present
      if (capsule.signature && executionContext.agentPublicKey) {
        if (!this.factory.verifyCapsuleSignature(capsule, executionContext.agentPublicKey)) {
          violations.push(this.createViolation(
            capsule.id,
            undefined,
            'invalid_signature',
            'block',
            'Capsule signature verification failed',
            'Reject capsule; verify agent identity and public key'
          ));
        }
      }

      // 3. Check expiration
      if (capsule.metadata.validUntil && new Date() > capsule.metadata.validUntil) {
        violations.push(this.createViolation(
          capsule.id,
          undefined,
          'expired',
          'block',
          `Capsule expired at ${capsule.metadata.validUntil.toISOString()}`,
          'Reject expired capsule; request fresh context from source'
        ));
      }

      // 4. Validate each invariant
      for (const invariant of capsule.invariants) {
        const violation = await this.checkInvariant(invariant, capsule, executionContext);
        if (violation) {
          violations.push(violation);
        }
      }
    }

    // Determine overall result
    const blockingViolations = violations.filter(v => v.severity === 'block');

    if (blockingViolations.length > 0) {
      return {
        valid: false,
        violations,
        action: 'deny_execution'
      };
    }

    const warnViolations = violations.filter(v => v.severity === 'warn');
    if (warnViolations.length > 0) {
      return {
        valid: true,
        violations,
        action: 'flag'
      };
    }

    return {
      valid: true,
      violations,
      action: 'permit'
    };
  }

  /**
   * Check a single invariant against execution context
   */
  private async checkInvariant(
    invariant: Invariant,
    capsule: ContextCapsule,
    executionContext: ExecutionContext
  ): Promise<InvariantViolation | undefined> {
    switch (invariant.rule.kind) {
      case 'forbid_topics':
        return this.checkForbiddenTopics(invariant, capsule, executionContext);

      case 'require_clearance':
        return this.checkClearance(invariant, capsule, executionContext);

      case 'no_external_calls':
        return this.checkExternalCalls(invariant, capsule, executionContext);

      case 'data_retention':
        // Data retention is enforced post-execution, not at validation time
        return undefined;

      case 'output_must_match':
        // Output schema is validated after model generates output
        return undefined;

      case 'custom_expression':
        return await this.checkCustomExpression(invariant, capsule, executionContext);

      default:
        return this.createViolation(
          capsule.id,
          invariant.id,
          'invariant_violated',
          'warn',
          `Unknown invariant rule kind: ${(invariant.rule as any).kind}`,
          'Update validator to support this invariant type'
        );
    }
  }

  /**
   * Check forbidden topics invariant
   */
  private checkForbiddenTopics(
    invariant: Invariant,
    capsule: ContextCapsule,
    _executionContext: ExecutionContext
  ): InvariantViolation | undefined {
    if (invariant.rule.kind !== 'forbid_topics') return undefined;

    const forbiddenTopics = invariant.rule.topics;
    const content = capsule.content.content.toLowerCase();

    // Simple keyword matching (production would use NLP/embedding similarity)
    const foundTopics = forbiddenTopics.filter(topic =>
      content.includes(topic.toLowerCase())
    );

    if (foundTopics.length > 0) {
      return this.createViolation(
        capsule.id,
        invariant.id,
        'forbidden_topic',
        invariant.severity,
        `Forbidden topics detected: ${foundTopics.join(', ')}`,
        invariant.remediation || 'Redact or remove content containing forbidden topics'
      );
    }

    return undefined;
  }

  /**
   * Check clearance requirement invariant
   */
  private checkClearance(
    invariant: Invariant,
    capsule: ContextCapsule,
    executionContext: ExecutionContext
  ): InvariantViolation | undefined {
    if (invariant.rule.kind !== 'require_clearance') return undefined;

    const requiredLevel = invariant.rule.level;
    const agentClearance = executionContext.clearanceLevel;

    // If no clearance specified, deny access to classified content
    if (!agentClearance) {
      return this.createViolation(
        capsule.id,
        invariant.id,
        'insufficient_clearance',
        invariant.severity,
        `Agent lacks required clearance: ${requiredLevel}`,
        invariant.remediation || `Execution context must have clearance level ${requiredLevel}`
      );
    }

    // Compare clearance levels (production would use hierarchical comparison)
    const clearanceLevels = ['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET'];
    const requiredIndex = clearanceLevels.indexOf(requiredLevel.toUpperCase());
    const agentIndex = clearanceLevels.indexOf(agentClearance.toUpperCase());

    if (agentIndex < requiredIndex) {
      return this.createViolation(
        capsule.id,
        invariant.id,
        'insufficient_clearance',
        invariant.severity,
        `Insufficient clearance: ${agentClearance} < ${requiredLevel}`,
        invariant.remediation || `Upgrade execution context clearance to ${requiredLevel}`
      );
    }

    return undefined;
  }

  /**
   * Check no external calls invariant
   */
  private checkExternalCalls(
    invariant: Invariant,
    capsule: ContextCapsule,
    executionContext: ExecutionContext
  ): InvariantViolation | undefined {
    if (invariant.rule.kind !== 'no_external_calls') return undefined;

    // Check if execution context has external call capabilities enabled
    const hasExternalCalls = (executionContext as any).externalCallsEnabled;

    if (hasExternalCalls && invariant.rule.strict) {
      return this.createViolation(
        capsule.id,
        invariant.id,
        'unauthorized_operation',
        invariant.severity,
        'External calls are forbidden but enabled in execution context',
        invariant.remediation || 'Disable external API calls for this execution'
      );
    }

    return undefined;
  }

  /**
   * Check custom expression invariant (Rego integration)
   */
  private async checkCustomExpression(
    invariant: Invariant,
    capsule: ContextCapsule,
    executionContext: ExecutionContext
  ): Promise<InvariantViolation | undefined> {
    if (invariant.rule.kind !== 'custom_expression') return undefined;

    if (invariant.rule.language === 'rego') {
      try {
        let policy = this.policyCache.get(invariant.rule.expr);

        if (!policy) {
          // Assume expr is base64 encoded WASM
          const wasmBuffer = Buffer.from(invariant.rule.expr, 'base64');
          policy = await loadPolicy(wasmBuffer);
          this.policyCache.set(invariant.rule.expr, policy);
        }

        const input = {
          capsule,
          executionContext
        };

        // Evaluate the policy
        const resultSet = policy.evaluate(input);

        // Interpret result
        // Default deny if no result
        if (!resultSet || resultSet.length === 0) {
          return this.createViolation(
            capsule.id,
            invariant.id,
            'invariant_violated',
            invariant.severity,
            'Policy evaluation returned no result (default deny)'
          );
        }

        const result = resultSet[0].result;

        // Case 1: Result is boolean true (allowed)
        if (result === true) return undefined;

        // Case 2: Result is object with 'allow' property
        if (typeof result === 'object' && result.allow === true) return undefined;

        // Case 3: Result contains violations list
        if (typeof result === 'object' && Array.isArray(result.violations) && result.violations.length > 0) {
           return this.createViolation(
            capsule.id,
            invariant.id,
            'invariant_violated',
            invariant.severity,
            `Policy violations: ${result.violations.join(', ')}`
           );
        }

        // Case 4: Result is explicitly false or otherwise "not allowed"
        return this.createViolation(
          capsule.id,
          invariant.id,
          'invariant_violated',
          invariant.severity,
          'Policy evaluation denied execution'
        );

      } catch (error) {
        return this.createViolation(
          capsule.id,
          invariant.id,
          'invariant_violated',
          invariant.severity,
          `Policy evaluation error: ${(error as Error).message}`
        );
      }
    } else {
      // CEL or other not yet supported
      return this.createViolation(
        capsule.id,
        invariant.id,
        'invariant_violated',
        'warn',
        `Unsupported policy language: ${invariant.rule.language}`
      );
    }
  }

  /**
   * Create a violation record
   */
  private createViolation(
    capsuleId: string,
    invariantId: string | undefined,
    violation: ViolationType,
    severity: 'info' | 'warn' | 'block',
    message: string,
    remediation?: string
  ): InvariantViolation {
    return {
      capsuleId,
      invariantId,
      violation,
      severity,
      message,
      remediation,
      timestamp: new Date()
    };
  }
}
