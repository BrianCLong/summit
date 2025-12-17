/**
 * Policy Engine
 *
 * Core engine for evaluating policies against various inputs.
 * Supports built-in policies, OPA policies, and custom validators.
 *
 * @module pve/evaluator/PolicyEngine
 */

import path from 'node:path';
import type {
  PolicyResult,
  PolicyConfig,
  EvaluationContext,
  EvaluationType,
  PolicySeverity,
} from '../types/index.js';
import { OPAAdapter, type OPAConfig } from './OPAAdapter.js';
import {
  PolicyResultBuilder,
  pass,
  fail,
  aggregateResults,
  formatResults,
} from './PolicyResult.js';
import {
  loadPolicies,
  loadRegoPolicies,
  type LoadedPolicy,
} from '../utils/policyLoader.js';
import { logger, createLogger, type Logger } from '../utils/logger.js';
import { hashObject } from '../utils/hash.js';

// Built-in validators
import { PRDiffValidator } from './validators/PRDiffValidator.js';
import { SchemaDriftValidator } from './validators/SchemaDriftValidator.js';
import { TSConfigValidator } from './validators/TSConfigValidator.js';
import { AgentOutputValidator } from './validators/AgentOutputValidator.js';
import { MetadataInvariantValidator } from './validators/MetadataInvariantValidator.js';
import { CIIntegrityValidator } from './validators/CIIntegrityValidator.js';
import { DependencyAuditValidator } from './validators/DependencyAuditValidator.js';
import { SecurityScanValidator } from './validators/SecurityScanValidator.js';

export interface PolicyEngineConfig {
  /** Directory containing policy files */
  policiesDir?: string;
  /** OPA configuration */
  opa?: OPAConfig;
  /** Whether to use built-in policies */
  useBuiltIn?: boolean;
  /** Custom validators */
  validators?: CustomValidator[];
  /** Logger configuration */
  logger?: Logger;
  /** Whether to fail on first error */
  failFast?: boolean;
  /** Default severity for policies without explicit severity */
  defaultSeverity?: PolicySeverity;
  /** Policy overrides */
  overrides?: PolicyOverride[];
  /** Whether to cache evaluation results */
  cacheResults?: boolean;
}

export interface PolicyOverride {
  /** Policy ID pattern (glob or exact match) */
  pattern: string;
  /** Override enabled status */
  enabled?: boolean;
  /** Override severity */
  severity?: PolicySeverity;
  /** Override config */
  config?: Record<string, unknown>;
}

export interface CustomValidator {
  /** Unique validator ID */
  id: string;
  /** Evaluation types this validator handles */
  handles: EvaluationType[];
  /** Validation function */
  validate: (context: EvaluationContext) => Promise<PolicyResult[]>;
}

export interface EvaluationOptions {
  /** Specific policies to run (by ID) */
  policies?: string[];
  /** Tags to filter policies */
  tags?: string[];
  /** Evaluation types to run */
  types?: EvaluationType[];
  /** Additional context */
  context?: Record<string, unknown>;
  /** Timeout in milliseconds */
  timeout?: number;
}

export interface EvaluationReport {
  /** Overall pass/fail status */
  passed: boolean;
  /** All policy results */
  results: PolicyResult[];
  /** Summary statistics */
  summary: {
    total: number;
    passed: number;
    failed: number;
    errors: number;
    warnings: number;
    infos: number;
  };
  /** Evaluation metadata */
  metadata: {
    timestamp: string;
    duration: number;
    inputHash: string;
    policiesEvaluated: string[];
  };
}

/**
 * Main Policy Engine class
 */
export class PolicyEngine {
  private config: PolicyEngineConfig;
  private opa: OPAAdapter;
  private policies: Map<string, LoadedPolicy> = new Map();
  private regoPolicies: Map<string, string> = new Map();
  private validators: Map<string, CustomValidator> = new Map();
  private resultCache: Map<string, EvaluationReport> = new Map();
  private logger: Logger;
  private initialized = false;

  constructor(config: PolicyEngineConfig = {}) {
    this.config = {
      useBuiltIn: true,
      failFast: false,
      defaultSeverity: 'warning',
      cacheResults: false,
      ...config,
    };

    this.opa = new OPAAdapter(config.opa);
    this.logger = config.logger || createLogger({ level: 'info' });

    // Register built-in validators
    if (this.config.useBuiltIn) {
      this.registerBuiltInValidators();
    }

    // Register custom validators
    if (config.validators) {
      for (const validator of config.validators) {
        this.registerValidator(validator);
      }
    }
  }

  /**
   * Initialize the policy engine
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Load policies from directory
    if (this.config.policiesDir) {
      const loaded = await loadPolicies({
        baseDir: this.config.policiesDir,
      });
      for (const policy of loaded) {
        this.policies.set(policy.config.id, policy);
      }

      // Load Rego policies
      this.regoPolicies = await loadRegoPolicies(this.config.policiesDir);
    }

    // Load built-in policies
    if (this.config.useBuiltIn) {
      const builtInDir = path.join(__dirname, '..', 'policies');
      try {
        const builtIn = await loadPolicies({ baseDir: builtInDir });
        for (const policy of builtIn) {
          if (!this.policies.has(policy.config.id)) {
            this.policies.set(policy.config.id, policy);
          }
        }

        const builtInRego = await loadRegoPolicies(builtInDir);
        for (const [id, content] of builtInRego) {
          if (!this.regoPolicies.has(id)) {
            this.regoPolicies.set(id, content);
          }
        }
      } catch {
        // Built-in policies may not exist yet
        this.logger.debug('No built-in policies found');
      }
    }

    // Apply overrides
    this.applyOverrides();

    this.initialized = true;
    this.logger.info('Policy engine initialized', {
      policies: this.policies.size,
      regoPolicies: this.regoPolicies.size,
      validators: this.validators.size,
    });
  }

  /**
   * Register built-in validators
   */
  private registerBuiltInValidators(): void {
    const builtInValidators: CustomValidator[] = [
      {
        id: 'pve.pr_diff',
        handles: ['pr_diff'],
        validate: (ctx) => new PRDiffValidator().validate(ctx),
      },
      {
        id: 'pve.schema_drift',
        handles: ['schema_drift'],
        validate: (ctx) => new SchemaDriftValidator().validate(ctx),
      },
      {
        id: 'pve.tsconfig_integrity',
        handles: ['tsconfig_integrity'],
        validate: (ctx) => new TSConfigValidator().validate(ctx),
      },
      {
        id: 'pve.agent_output',
        handles: ['agent_output'],
        validate: (ctx) => new AgentOutputValidator().validate(ctx),
      },
      {
        id: 'pve.metadata_invariant',
        handles: ['metadata_invariant'],
        validate: (ctx) => new MetadataInvariantValidator().validate(ctx),
      },
      {
        id: 'pve.ci_integrity',
        handles: ['ci_integrity'],
        validate: (ctx) => new CIIntegrityValidator().validate(ctx),
      },
      {
        id: 'pve.dependency_audit',
        handles: ['dependency_audit'],
        validate: (ctx) => new DependencyAuditValidator().validate(ctx),
      },
      {
        id: 'pve.security_scan',
        handles: ['security_scan'],
        validate: (ctx) => new SecurityScanValidator().validate(ctx),
      },
    ];

    for (const validator of builtInValidators) {
      this.validators.set(validator.id, validator);
    }
  }

  /**
   * Register a custom validator
   */
  registerValidator(validator: CustomValidator): void {
    this.validators.set(validator.id, validator);
    this.logger.debug('Registered validator', { id: validator.id });
  }

  /**
   * Unregister a validator
   */
  unregisterValidator(id: string): boolean {
    return this.validators.delete(id);
  }

  /**
   * Apply policy overrides
   */
  private applyOverrides(): void {
    if (!this.config.overrides) {
      return;
    }

    for (const override of this.config.overrides) {
      const matchingPolicies = this.findMatchingPolicies(override.pattern);
      for (const policy of matchingPolicies) {
        if (override.enabled !== undefined) {
          policy.config.enabled = override.enabled;
        }
        if (override.severity !== undefined) {
          policy.config.severity = override.severity;
        }
        if (override.config !== undefined) {
          policy.config.config = {
            ...policy.config.config,
            ...override.config,
          };
        }
      }
    }
  }

  /**
   * Find policies matching a pattern
   */
  private findMatchingPolicies(pattern: string): LoadedPolicy[] {
    const results: LoadedPolicy[] = [];
    const isGlob = pattern.includes('*');

    for (const [id, policy] of this.policies) {
      if (isGlob) {
        const regex = new RegExp(
          '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$',
        );
        if (regex.test(id)) {
          results.push(policy);
        }
      } else if (id === pattern) {
        results.push(policy);
      }
    }

    return results;
  }

  /**
   * Evaluate policies against the given context
   */
  async evaluate(
    context: EvaluationContext,
    options: EvaluationOptions = {},
  ): Promise<EvaluationReport> {
    await this.initialize();

    const startTime = Date.now();
    const inputHash = hashObject(context.input);

    // Check cache
    if (this.config.cacheResults) {
      const cacheKey = `${context.type}:${inputHash}`;
      const cached = this.resultCache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const results: PolicyResult[] = [];
    const policiesEvaluated: string[] = [];

    // Run built-in validators
    for (const [id, validator] of this.validators) {
      if (
        validator.handles.includes(context.type) &&
        (!options.types || options.types.includes(context.type))
      ) {
        try {
          const validatorResults = await validator.validate(context);
          results.push(...validatorResults);
          policiesEvaluated.push(id);

          if (
            this.config.failFast &&
            validatorResults.some((r) => !r.allowed && r.severity === 'error')
          ) {
            break;
          }
        } catch (error) {
          this.logger.error('Validator failed', {
            validator: id,
            error: error instanceof Error ? error.message : String(error),
          });
          results.push(
            fail(`${id}:execution`, `Validator execution failed: ${error}`, {
              severity: 'error',
            }),
          );
        }
      }
    }

    // Run configured policies
    for (const [id, policy] of this.policies) {
      if (!policy.config.enabled) {
        continue;
      }

      if (
        !policy.config.appliesTo.includes(context.type) &&
        !policy.config.appliesTo.includes('custom')
      ) {
        continue;
      }

      if (options.policies && !options.policies.includes(id)) {
        continue;
      }

      if (
        options.tags &&
        !options.tags.some((t) => policy.config.tags?.includes(t))
      ) {
        continue;
      }

      try {
        const policyResult = await this.evaluatePolicy(policy, context);
        results.push(policyResult);
        policiesEvaluated.push(id);

        if (
          this.config.failFast &&
          !policyResult.allowed &&
          policyResult.severity === 'error'
        ) {
          break;
        }
      } catch (error) {
        this.logger.error('Policy evaluation failed', {
          policy: id,
          error: error instanceof Error ? error.message : String(error),
        });
        results.push(
          fail(id, `Policy evaluation failed: ${error}`, {
            severity: 'error',
          }),
        );
      }
    }

    const aggregate = aggregateResults(results);
    const duration = Date.now() - startTime;

    const report: EvaluationReport = {
      passed: aggregate.passed,
      results,
      summary: {
        total: aggregate.total,
        passed: aggregate.passed_count,
        failed: aggregate.failed_count,
        errors: aggregate.errors.length,
        warnings: aggregate.warnings.length,
        infos: aggregate.infos.length,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        duration,
        inputHash,
        policiesEvaluated,
      },
    };

    // Cache result
    if (this.config.cacheResults) {
      const cacheKey = `${context.type}:${inputHash}`;
      this.resultCache.set(cacheKey, report);
    }

    this.logger.info('Evaluation complete', {
      passed: report.passed,
      total: report.summary.total,
      duration,
    });

    return report;
  }

  /**
   * Evaluate a single policy
   */
  private async evaluatePolicy(
    policy: LoadedPolicy,
    context: EvaluationContext,
  ): Promise<PolicyResult> {
    // If this is a Rego policy, use OPA
    const regoContent = this.regoPolicies.get(policy.config.id);
    if (regoContent) {
      const opaResult = await this.opa.evaluate(
        policy.source,
        context.input,
      );

      if (!opaResult.allow) {
        const violations = opaResult.violations || [];
        return fail(policy.config.id, violations[0]?.message || 'Policy violation', {
          severity: policy.config.severity,
          details: {
            violations,
            ...opaResult.details,
          },
        });
      }

      return pass(policy.config.id);
    }

    // Default: pass if no specific evaluator
    return pass(policy.config.id, 'No evaluator configured');
  }

  /**
   * Assert that all policies pass
   */
  async assertAll(
    context: EvaluationContext,
    options?: EvaluationOptions,
  ): Promise<void> {
    const report = await this.evaluate(context, options);

    if (!report.passed) {
      const errorMessages = report.results
        .filter((r) => !r.allowed && r.severity === 'error')
        .map((r) => `${r.policy}: ${r.message}`)
        .join('\n');

      throw new PolicyViolationError(
        `Policy validation failed:\n${errorMessages}`,
        report,
      );
    }
  }

  /**
   * Get all registered policies
   */
  getPolicies(): PolicyConfig[] {
    return Array.from(this.policies.values()).map((p) => p.config);
  }

  /**
   * Get a specific policy by ID
   */
  getPolicy(id: string): PolicyConfig | undefined {
    return this.policies.get(id)?.config;
  }

  /**
   * Enable or disable a policy
   */
  setEnabled(id: string, enabled: boolean): boolean {
    const policy = this.policies.get(id);
    if (policy) {
      policy.config.enabled = enabled;
      return true;
    }
    return false;
  }

  /**
   * Clear the result cache
   */
  clearCache(): void {
    this.resultCache.clear();
  }

  /**
   * Format results for display
   */
  formatReport(
    report: EvaluationReport,
    options?: { verbose?: boolean; colors?: boolean },
  ): string {
    return formatResults(report.results, options);
  }
}

/**
 * Error thrown when policy validation fails
 */
export class PolicyViolationError extends Error {
  constructor(
    message: string,
    public readonly report: EvaluationReport,
  ) {
    super(message);
    this.name = 'PolicyViolationError';
  }
}

/**
 * Create a new PolicyEngine instance
 */
export function createPolicyEngine(config?: PolicyEngineConfig): PolicyEngine {
  return new PolicyEngine(config);
}

// Re-export types and utilities
export { PolicyResultBuilder, pass, fail, aggregateResults, formatResults };
