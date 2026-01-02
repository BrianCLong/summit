/**
 * GA Enforcement Service
 *
 * Comprehensive governance enforcement for the IntelGraph platform.
 * Ensures all API responses include mandatory governance verdicts and provenance.
 *
 * SOC 2 Controls:
 * - CC6.1: Logical and physical access controls
 * - CC6.2: Prior to issuing system credentials, the entity identifies and authenticates users
 * - PI1.1: The entity obtains or generates only that personal information relevant to achieving objectives
 * - PI1.4: The entity limits the processing of personal information to what is necessary to achieve objectives
 *
 * @module ga-enforcement
 */

import { createHash, randomUUID } from 'crypto';
import {
  DataEnvelope,
  GovernanceResult,
  GovernanceVerdict,
  Provenance,
  LineageNode,
  DataClassification,
} from '../types/data-envelope.js';
import { RequestContext } from '../observability/request-context.js';
import { appLogger } from '../observability/request-context.js';

/**
 * Error thrown when governance enforcement fails
 */
export class GovernanceEnforcementError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, any>
  ) {
    super(message);
    this.name = 'GovernanceEnforcementError';
  }
}

/**
 * Error thrown when provenance is required but missing
 */
export class ProvenanceRequiredError extends GovernanceEnforcementError {
  constructor(message: string = 'Provenance is required but missing') {
    super(message, 'PROVENANCE_REQUIRED');
    this.name = 'ProvenanceRequiredError';
  }
}

/**
 * Error thrown when governance verdict is bypassable (security violation)
 */
export class BypassableGovernanceError extends GovernanceEnforcementError {
  constructor(
    message: string = 'Governance verdict cannot be bypassed',
    verdictId?: string
  ) {
    super(message, 'GOVERNANCE_BYPASS_ATTEMPTED', { verdictId });
    this.name = 'BypassableGovernanceError';
  }
}

/**
 * GA Enforcement Service Configuration
 */
export interface GAEnforcementConfig {
  /** Require provenance for all envelopes */
  requireProvenance?: boolean;

  /** Default data classification level */
  defaultClassification?: DataClassification;

  /** Enable strict mode (all governance verdicts required) */
  strictMode?: boolean;

  /** Auto-generate lineage nodes */
  autoGenerateLineage?: boolean;

  /** Default evaluator for governance verdicts */
  defaultEvaluator?: string;
}

/**
 * GA Enforcement Service
 *
 * Provides comprehensive governance enforcement capabilities including:
 * - Mandatory governance verdict wrapping
 * - Provenance validation
 * - Bypass prevention
 * - Audit logging
 *
 * SOC 2 Control CC6.1 - Access Controls
 * SOC 2 Control PI1.1 - Personal Information Processing
 */
export class GAEnforcementService {
  private config: Required<GAEnforcementConfig>;
  private logger = appLogger.child({ component: 'GAEnforcementService' });

  /**
   * Creates a new GA Enforcement Service instance
   *
   * @param config - Configuration options
   */
  constructor(config: GAEnforcementConfig = {}) {
    this.config = {
      requireProvenance: config.requireProvenance ?? true,
      defaultClassification: config.defaultClassification ?? DataClassification.INTERNAL,
      strictMode: config.strictMode ?? true,
      autoGenerateLineage: config.autoGenerateLineage ?? true,
      defaultEvaluator: config.defaultEvaluator ?? 'system',
    };

    this.logger.info('GA Enforcement Service initialized', {
      config: this.config,
    });
  }

  /**
   * Enforces governance on data and wraps it in a data envelope with mandatory governance verdict
   *
   * SOC 2 Control CC6.2 - User Authentication
   * SOC 2 Control PI1.4 - Personal Information Processing Limits
   *
   * @template T - Type of data being wrapped
   * @param data - The data to wrap with governance
   * @param context - Request context with user/tenant information
   * @param options - Optional override configuration
   * @returns Promise resolving to data envelope with governance verdict
   *
   * @throws {GovernanceEnforcementError} If governance cannot be enforced
   *
   * @example
   * const envelope = await service.enforceGovernance(
   *   { userId: '123', name: 'John' },
   *   { correlationId: 'abc', userId: '123', tenantId: 'tenant1' }
   * );
   */
  async enforceGovernance<T>(
    data: T,
    context: RequestContext,
    options?: {
      policyId?: string;
      classification?: DataClassification;
      isSimulated?: boolean;
      confidence?: number;
      source?: string;
      version?: string;
      warnings?: string[];
      customVerdict?: Partial<GovernanceVerdict>;
    }
  ): Promise<DataEnvelope<T>> {
    const startTime = Date.now();

    try {
      // Generate provenance
      const provenance = this.generateProvenance(
        context,
        options?.source || 'ga-enforcement',
        options?.version
      );

      // Create governance verdict (mandatory in strict mode)
      const verdict = await this.createMandatoryVerdict(
        context,
        options?.policyId || 'default-policy',
        options?.customVerdict
      );

      // Build envelope
      const envelope = wrapWithEnvelope(
        data,
        provenance,
        verdict,
        {
          classification: options?.classification || this.config.defaultClassification,
          isSimulated: options?.isSimulated || false,
          confidence: options?.confidence,
          warnings: options?.warnings || [],
        }
      );

      // Add lineage if auto-generation enabled
      if (this.config.autoGenerateLineage) {
        envelope.provenance.lineage.push(this.createLineageNode(
          'ga-enforcement',
          [],
          context.userId,
          {
            policyId: options?.policyId || 'default-policy',
            verdictId: verdict.verdictId,
            correlationId: context.correlationId,
          }
        ));
      }

      // Validate the envelope
      this.validateProvenanceRequired(envelope);

      // Audit log
      this.logger.info('Governance enforced', {
        verdictId: verdict.verdictId,
        result: verdict.result,
        classification: envelope.classification,
        userId: context.userId,
        tenantId: context.tenantId,
        correlationId: context.correlationId,
        durationMs: Date.now() - startTime,
      });

      return envelope;
    } catch (error: any) {
      this.logger.error('Governance enforcement failed', {
        error: error instanceof Error ? error.message : String(error),
        userId: context.userId,
        tenantId: context.tenantId,
        correlationId: context.correlationId,
        durationMs: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Validates that provenance is present in the envelope
   *
   * SOC 2 Control PI1.1 - Personal Information Processing
   *
   * @param envelope - Data envelope to validate
   * @throws {ProvenanceRequiredError} If provenance is missing or incomplete
   *
   * @example
   * service.validateProvenanceRequired(envelope);
   */
  validateProvenanceRequired(envelope: DataEnvelope<any>): void {
    if (!this.config.requireProvenance) {
      return;
    }

    if (!envelope.provenance) {
      throw new ProvenanceRequiredError('Envelope missing provenance');
    }

    if (!envelope.provenance.source) {
      throw new ProvenanceRequiredError('Provenance missing source');
    }

    if (!envelope.provenance.provenanceId) {
      throw new ProvenanceRequiredError('Provenance missing ID');
    }

    if (!envelope.provenance.generatedAt) {
      throw new ProvenanceRequiredError('Provenance missing timestamp');
    }

    if (!Array.isArray(envelope.provenance.lineage)) {
      throw new ProvenanceRequiredError('Provenance missing lineage array');
    }

    this.logger.debug('Provenance validation passed', {
      provenanceId: envelope.provenance.provenanceId,
      source: envelope.provenance.source,
    });
  }

  /**
   * Asserts that a governance verdict cannot be bypassed
   *
   * Prevents security violations where DENY or REVIEW_REQUIRED verdicts are circumvented.
   *
   * SOC 2 Control CC6.1 - Access Controls
   *
   * @param verdict - Governance verdict to check
   * @throws {BypassableGovernanceError} If verdict indicates denial or review but could be bypassed
   *
   * @example
   * service.assertNotBypassable(envelope.governanceVerdict);
   */
  assertNotBypassable(verdict: GovernanceVerdict): void {
    // Check for bypassable DENY verdicts
    if (verdict.result === GovernanceResult.DENY) {
      // A DENY verdict is non-bypassable by design
      // Log for audit trail
      this.logger.warn('DENY verdict enforced - operation blocked', {
        verdictId: verdict.verdictId,
        policyId: verdict.policyId,
        reason: verdict.reason,
      });

      throw new BypassableGovernanceError(
        `Access denied by governance policy: ${verdict.reason || 'No reason provided'}`,
        verdict.verdictId
      );
    }

    // Check for bypassable REVIEW_REQUIRED verdicts
    if (verdict.result === GovernanceResult.REVIEW_REQUIRED) {
      if (!verdict.requiredApprovals || verdict.requiredApprovals.length === 0) {
        throw new BypassableGovernanceError(
          'REVIEW_REQUIRED verdict missing required approvals list',
          verdict.verdictId
        );
      }

      this.logger.warn('REVIEW_REQUIRED verdict enforced - approvals needed', {
        verdictId: verdict.verdictId,
        policyId: verdict.policyId,
        requiredApprovals: verdict.requiredApprovals,
      });

      throw new BypassableGovernanceError(
        `Review required by governance policy. Required approvals: ${verdict.requiredApprovals.join(', ')}`,
        verdict.verdictId
      );
    }

    // FLAG verdicts are allowed but logged
    if (verdict.result === GovernanceResult.FLAG) {
      this.logger.warn('FLAG verdict applied - operation allowed but flagged', {
        verdictId: verdict.verdictId,
        policyId: verdict.policyId,
        reason: verdict.reason,
      });
    }
  }

  /**
   * Creates a mandatory governance verdict for enforcement
   *
   * @private
   * @param context - Request context
   * @param policyId - Policy ID to apply
   * @param customVerdict - Optional custom verdict overrides
   * @returns Promise resolving to governance verdict
   */
  private async createMandatoryVerdict(
    context: RequestContext,
    policyId: string,
    customVerdict?: Partial<GovernanceVerdict>
  ): Promise<GovernanceVerdict> {
    // In strict mode, verdicts are mandatory
    if (this.config.strictMode && !customVerdict) {
      // Default to ALLOW for legitimate requests
      // In production, this would call OPA or policy engine
      return createGovernanceVerdict(
        GovernanceResult.ALLOW,
        policyId,
        'Default allow - strict mode enabled',
        {
          evaluator: this.config.defaultEvaluator,
        }
      );
    }

    // Use custom verdict if provided
    if (customVerdict) {
      return createGovernanceVerdict(
        customVerdict.result || GovernanceResult.ALLOW,
        customVerdict.policyId || policyId,
        customVerdict.reason,
        {
          evaluator: customVerdict.evaluator || this.config.defaultEvaluator,
          requiredApprovals: customVerdict.requiredApprovals,
        }
      );
    }

    // Default verdict
    return createGovernanceVerdict(
      GovernanceResult.ALLOW,
      policyId,
      'Default allow',
      {
        evaluator: this.config.defaultEvaluator,
      }
    );
  }

  /**
   * Generates provenance metadata from request context
   *
   * @private
   * @param context - Request context
   * @param source - Source system identifier
   * @param version - Optional version string
   * @returns Provenance object
   */
  private generateProvenance(
    context: RequestContext,
    source: string,
    version?: string
  ): Provenance {
    return {
      source,
      generatedAt: new Date(),
      lineage: [],
      actor: context.userId,
      version: version || process.env.APP_VERSION || '1.0.0',
      provenanceId: `prov-${Date.now()}-${randomUUID()}`,
    };
  }

  /**
   * Creates a lineage node for tracking data transformations
   *
   * @private
   * @param operation - Operation name
   * @param inputs - Input identifiers
   * @param actor - Actor performing operation
   * @param metadata - Additional metadata
   * @returns Lineage node
   */
  private createLineageNode(
    operation: string,
    inputs: string[],
    actor?: string,
    metadata?: Record<string, any>
  ): LineageNode {
    return {
      id: `lineage-${Date.now()}-${randomUUID()}`,
      operation,
      inputs,
      timestamp: new Date(),
      actor,
      metadata,
    };
  }
}

/**
 * Helper function to create a governance verdict
 *
 * @param result - Governance result (ALLOW, DENY, FLAG, REVIEW_REQUIRED)
 * @param policyId - Policy that was evaluated
 * @param reason - Optional reason for the decision
 * @param options - Optional additional fields
 * @returns GovernanceVerdict object
 *
 * @example
 * const verdict = createGovernanceVerdict(
 *   GovernanceResult.ALLOW,
 *   'data-access-policy',
 *   'User has required permissions'
 * );
 */
export function createGovernanceVerdict(
  result: GovernanceResult,
  policyId: string,
  reason?: string,
  options?: {
    evaluator?: string;
    requiredApprovals?: string[];
  }
): GovernanceVerdict {
  return {
    verdictId: `verdict-${Date.now()}-${randomUUID()}`,
    policyId,
    result,
    decidedAt: new Date(),
    reason,
    requiredApprovals: options?.requiredApprovals,
    evaluator: options?.evaluator || 'system',
  };
}

/**
 * Helper function to wrap data with envelope including governance verdict
 *
 * @template T - Type of data being wrapped
 * @param data - The data to wrap
 * @param provenance - Provenance metadata
 * @param verdict - Governance verdict
 * @param options - Optional envelope configuration
 * @returns DataEnvelope wrapping the data
 *
 * @example
 * const envelope = wrapWithEnvelope(
 *   { userId: '123' },
 *   provenance,
 *   verdict,
 *   { classification: DataClassification.CONFIDENTIAL }
 * );
 */
export function wrapWithEnvelope<T>(
  data: T,
  provenance: Provenance,
  verdict: GovernanceVerdict,
  options?: {
    classification?: DataClassification;
    isSimulated?: boolean;
    confidence?: number;
    warnings?: string[];
    signature?: string;
  }
): DataEnvelope<T> {
  // Calculate data hash for integrity
  const dataString = JSON.stringify(data);
  const dataHash = createHash('sha256').update(dataString).digest('hex');

  // Validate confidence if provided
  if (options?.confidence !== undefined) {
    if (options.confidence < 0 || options.confidence > 1) {
      throw new GovernanceEnforcementError(
        'Confidence score must be between 0 and 1',
        'INVALID_CONFIDENCE',
        { confidence: options.confidence }
      );
    }
  }

  return {
    data,
    provenance,
    confidence: options?.confidence,
    isSimulated: options?.isSimulated || false,
    governanceVerdict: verdict,
    classification: options?.classification || DataClassification.INTERNAL,
    dataHash,
    signature: options?.signature,
    warnings: options?.warnings || [],
  };
}

/**
 * Default GA Enforcement Service instance
 */
export const defaultGAEnforcementService = new GAEnforcementService();
