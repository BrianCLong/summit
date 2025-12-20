/**
 * Gate Implementations
 *
 * Precondition and postcondition gates for DAG-based runbooks.
 * Includes legal basis, data license, KPI, citation, and proof gates.
 */

import {
  PreconditionGate,
  PostconditionGate,
  GateResult,
  RunbookContext,
  NodeExecutionResult,
  LegalBasis,
  DataLicense,
} from './types';
import { CitationValidator } from './citation-validator';

/**
 * Gate Executor
 */
export class GateExecutor {
  /**
   * Execute a precondition gate
   */
  static async executePrecondition(gate: PreconditionGate, context: RunbookContext): Promise<GateResult> {
    switch (gate.type) {
      case 'legal_basis':
        return this.checkLegalBasis(gate, context);

      case 'data_license':
        return this.checkDataLicense(gate, context);

      case 'approval':
        return this.checkApproval(gate, context);

      case 'dependency':
        return this.checkDependency(gate, context);

      case 'custom':
        if (gate.validate) {
          return gate.validate(context);
        }
        return { passed: true };

      default:
        return {
          passed: false,
          reason: `Unknown gate type: ${gate.type}`,
        };
    }
  }

  /**
   * Execute a postcondition gate
   */
  static async executePostcondition(
    gate: PostconditionGate,
    context: RunbookContext,
    result: NodeExecutionResult,
  ): Promise<GateResult> {
    switch (gate.type) {
      case 'kpi':
        return this.checkKPI(gate, result);

      case 'citation':
        return this.checkCitation(gate, result);

      case 'proof':
        return this.checkProof(gate, result);

      case 'quality':
        return this.checkQuality(gate, result);

      case 'custom':
        if (gate.validate) {
          return gate.validate(context, result);
        }
        return { passed: true };

      default:
        return {
          passed: false,
          reason: `Unknown gate type: ${gate.type}`,
        };
    }
  }

  /**
   * Check legal basis precondition
   */
  private static checkLegalBasis(gate: PreconditionGate, context: RunbookContext): GateResult {
    if (!gate.legalBasis || gate.legalBasis.length === 0) {
      return { passed: true };
    }

    if (!context.legalBasis) {
      return {
        passed: false,
        reason: 'No legal basis specified in context',
      };
    }

    if (!gate.legalBasis.includes(context.legalBasis)) {
      return {
        passed: false,
        reason: `Legal basis ${context.legalBasis} not in allowed list: ${gate.legalBasis.join(', ')}`,
      };
    }

    return {
      passed: true,
      metadata: {
        legalBasis: context.legalBasis,
      },
    };
  }

  /**
   * Check data license precondition
   */
  private static checkDataLicense(gate: PreconditionGate, context: RunbookContext): GateResult {
    if (!gate.requiredLicenses || gate.requiredLicenses.length === 0) {
      return { passed: true };
    }

    if (!context.dataLicenses || context.dataLicenses.length === 0) {
      return {
        passed: false,
        reason: 'No data licenses specified in context',
      };
    }

    // Check if any of the context licenses match the required licenses
    const matchingLicenses = context.dataLicenses.filter((license) => gate.requiredLicenses!.includes(license));

    if (matchingLicenses.length === 0) {
      return {
        passed: false,
        reason: `None of the data licenses [${context.dataLicenses.join(', ')}] match required licenses [${gate.requiredLicenses.join(', ')}]`,
      };
    }

    return {
      passed: true,
      metadata: {
        matchingLicenses,
      },
    };
  }

  /**
   * Check approval precondition
   */
  private static checkApproval(gate: PreconditionGate, context: RunbookContext): GateResult {
    // In a real implementation, this would check an approval workflow
    // For now, we'll check if an approval flag is in the context
    const approved = context.state.get('approved');

    if (!approved) {
      return {
        passed: false,
        reason: 'Manual approval required before execution',
      };
    }

    return {
      passed: true,
      metadata: {
        approvedBy: context.state.get('approvedBy'),
        approvedAt: context.state.get('approvedAt'),
      },
    };
  }

  /**
   * Check dependency precondition
   */
  private static checkDependency(gate: PreconditionGate, context: RunbookContext): GateResult {
    // Dependencies are handled by the DAG executor, so this always passes
    return { passed: true };
  }

  /**
   * Check KPI postcondition
   */
  private static checkKPI(gate: PostconditionGate, result: NodeExecutionResult): GateResult {
    if (!gate.kpi) {
      return { passed: true };
    }

    const { metric, threshold, operator } = gate.kpi;

    const actualValue = result.kpis[metric];

    if (actualValue === undefined) {
      return {
        passed: false,
        reason: `KPI metric '${metric}' not found in result`,
      };
    }

    let passed = false;
    switch (operator) {
      case 'gt':
        passed = actualValue > threshold;
        break;
      case 'gte':
        passed = actualValue >= threshold;
        break;
      case 'lt':
        passed = actualValue < threshold;
        break;
      case 'lte':
        passed = actualValue <= threshold;
        break;
      case 'eq':
        passed = actualValue === threshold;
        break;
    }

    return {
      passed,
      reason: passed
        ? undefined
        : `KPI metric '${metric}' value ${actualValue} does not meet threshold ${operator} ${threshold}`,
      metadata: {
        metric,
        actualValue,
        threshold,
        operator,
      },
    };
  }

  /**
   * Check citation postcondition
   */
  private static checkCitation(gate: PostconditionGate, result: NodeExecutionResult): GateResult {
    if (!gate.citationRequirement) {
      return { passed: true };
    }

    const { minCitations, requireSourceLinks, requireTimestamps } = gate.citationRequirement;

    // Validate citations
    const validationResult = CitationValidator.validateCitations(result.evidence, result.citations, {
      minCitationsPerEvidence: minCitations,
      requireSourceLinks,
      requireTimestamps,
    });

    if (!validationResult.valid) {
      return {
        passed: false,
        reason: `Citation validation failed: ${validationResult.errors.join('; ')}`,
        metadata: {
          validationResult,
        },
      };
    }

    return {
      passed: true,
      metadata: {
        citationCount: result.citations.length,
        validationResult,
      },
    };
  }

  /**
   * Check proof postcondition
   */
  private static checkProof(gate: PostconditionGate, result: NodeExecutionResult): GateResult {
    if (!gate.proofRequirement) {
      return { passed: true };
    }

    const { requireCryptographicProof, requireChainOfCustody } = gate.proofRequirement;

    if (requireCryptographicProof && result.proofs.length === 0) {
      return {
        passed: false,
        reason: 'Cryptographic proof required but none provided',
      };
    }

    if (requireChainOfCustody) {
      const hasChainOfCustody = result.proofs.some((proof) => proof.chainOfCustodyHash);

      if (!hasChainOfCustody) {
        return {
          passed: false,
          reason: 'Chain of custody proof required but none provided',
        };
      }
    }

    return {
      passed: true,
      metadata: {
        proofCount: result.proofs.length,
      },
    };
  }

  /**
   * Check quality postcondition
   */
  private static checkQuality(gate: PostconditionGate, result: NodeExecutionResult): GateResult {
    // Quality checks can be custom per runbook
    // For now, we'll check basic quality metrics

    // Check if evidence has metadata quality scores
    const qualityScores = result.evidence
      .filter((ev) => ev.metadata?.qualityScore !== undefined)
      .map((ev) => ev.metadata!.qualityScore as number);

    if (qualityScores.length === 0) {
      return {
        passed: false,
        reason: 'No quality scores found in evidence metadata',
      };
    }

    const avgQuality = qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length;
    const minAcceptableQuality = 0.7; // 70%

    if (avgQuality < minAcceptableQuality) {
      return {
        passed: false,
        reason: `Average quality score ${avgQuality.toFixed(2)} below minimum ${minAcceptableQuality}`,
        metadata: {
          avgQuality,
          minAcceptableQuality,
          qualityScores,
        },
      };
    }

    return {
      passed: true,
      metadata: {
        avgQuality,
        qualityScores,
      },
    };
  }
}

/**
 * Common gate factory functions
 */
export class GateFactory {
  /**
   * Create a legal basis precondition gate
   */
  static legalBasisGate(allowedBases: LegalBasis[], description?: string): PreconditionGate {
    return {
      type: 'legal_basis',
      name: 'Legal Basis Check',
      description: description || `Requires legal basis to be one of: ${allowedBases.join(', ')}`,
      legalBasis: allowedBases,
    };
  }

  /**
   * Create a data license precondition gate
   */
  static dataLicenseGate(requiredLicenses: DataLicense[], description?: string): PreconditionGate {
    return {
      type: 'data_license',
      name: 'Data License Check',
      description: description || `Requires data license to be one of: ${requiredLicenses.join(', ')}`,
      requiredLicenses,
    };
  }

  /**
   * Create a KPI postcondition gate
   */
  static kpiGate(
    metric: string,
    threshold: number,
    operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq',
    description?: string,
  ): PostconditionGate {
    return {
      type: 'kpi',
      name: `KPI: ${metric}`,
      description: description || `Requires ${metric} ${operator} ${threshold}`,
      kpi: {
        metric,
        threshold,
        operator,
      },
    };
  }

  /**
   * Create a citation postcondition gate
   */
  static citationGate(
    minCitations: number,
    requireSourceLinks: boolean,
    requireTimestamps: boolean,
    description?: string,
  ): PostconditionGate {
    return {
      type: 'citation',
      name: 'Citation Check',
      description:
        description ||
        `Requires at least ${minCitations} citation(s) per evidence${requireSourceLinks ? ' with source links' : ''}${requireTimestamps ? ' and timestamps' : ''}`,
      citationRequirement: {
        minCitations,
        requireSourceLinks,
        requireTimestamps,
      },
    };
  }

  /**
   * Create a proof postcondition gate
   */
  static proofGate(
    requireCryptographicProof: boolean,
    requireChainOfCustody: boolean,
    description?: string,
  ): PostconditionGate {
    return {
      type: 'proof',
      name: 'Proof Check',
      description:
        description ||
        `Requires ${requireCryptographicProof ? 'cryptographic proof' : ''}${requireCryptographicProof && requireChainOfCustody ? ' and ' : ''}${requireChainOfCustody ? 'chain of custody' : ''}`,
      proofRequirement: {
        requireCryptographicProof,
        requireChainOfCustody,
      },
    };
  }
}
