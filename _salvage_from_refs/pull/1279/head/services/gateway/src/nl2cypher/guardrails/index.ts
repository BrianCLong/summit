/**
 * NL→Cypher Guardrails System
 *
 * Main entry point for constraint enforcement and explanation system.
 * Provides unified interface for constraint checking, query modification,
 * and human-readable explanations.
 */

export {
  CypherConstraintEngine,
  DEFAULT_CONSTRAINT_CONFIG,
  ConstraintConfigSchema,
  type ConstraintConfig,
  type ConstraintViolation,
  type ConstraintAnalysis
} from './constraints';

export {
  CypherExplainer,
  defaultExplainer,
  type ExplanationContext,
  type QueryExplanation,
  type ExplanationReason,
  type AutoFix
} from './explain';

import { CypherConstraintEngine, DEFAULT_CONSTRAINT_CONFIG, type ConstraintConfig } from './constraints';
import { CypherExplainer, type ExplanationContext } from './explain';
import pino from 'pino';

const logger = pino({ name: 'nl2cypher-guardrails' });

/**
 * Unified guardrails service combining constraint enforcement and explanation
 */
export class NlToCypherGuardrails {
  private constraintEngine: CypherConstraintEngine;
  private explainer: CypherExplainer;

  constructor(config?: {
    constraints?: Partial<ConstraintConfig>;
    explainer?: { baseUrl?: string; policyVersion?: string };
  }) {
    this.constraintEngine = new CypherConstraintEngine(config?.constraints);
    this.explainer = new CypherExplainer(config?.explainer);

    logger.info('NL→Cypher guardrails system initialized');
  }

  /**
   * Complete analysis with explanation
   */
  async analyzeWithExplanation(
    cypher: string,
    context: {
      user_id: string;
      tenant_id: string;
      user_role?: string;
      scopes?: string[];
      enforcement_mode?: 'block' | 'warn' | 'allow';
      explain_level?: 'basic' | 'detailed' | 'technical';
      include_suggestions?: boolean;
      include_auto_fixes?: boolean;
    }
  ) {
    // Run constraint analysis
    const analysis = await this.constraintEngine.analyzeQuery(cypher, {
      user_id: context.user_id,
      tenant_id: context.tenant_id,
      scopes: context.scopes,
      enforcement_mode: context.enforcement_mode
    });

    // Generate explanation
    const explanation = this.explainer.explainAnalysis(analysis, {
      user_role: context.user_role,
      tenant_id: context.tenant_id,
      user_id: context.user_id,
      explain_level: context.explain_level || 'detailed',
      include_suggestions: context.include_suggestions ?? true,
      include_auto_fixes: context.include_auto_fixes ?? true
    });

    return {
      analysis,
      explanation,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Quick constraint check (no explanation)
   */
  async checkConstraints(
    cypher: string,
    context: {
      user_id: string;
      tenant_id: string;
      scopes?: string[];
      enforcement_mode?: 'block' | 'warn' | 'allow';
    }
  ) {
    return this.constraintEngine.analyzeQuery(cypher, context);
  }

  /**
   * Get available constraint configuration
   */
  getConstraintConfig() {
    return this.constraintEngine['config']; // Access private config
  }

  /**
   * Update constraint configuration
   */
  updateConstraintConfig(config: Partial<ConstraintConfig>) {
    this.constraintEngine = new CypherConstraintEngine({
      ...this.constraintEngine['config'],
      ...config
    });
    logger.info('Constraint configuration updated', { config });
  }
}

/**
 * Default guardrails instance with standard configuration
 */
export const defaultGuardrails = new NlToCypherGuardrails({
  constraints: DEFAULT_CONSTRAINT_CONFIG,
  explainer: {
    baseUrl: 'https://docs.intelgraph.io/nlq-guardrails',
    policyVersion: 'nlq-guardrails-1.0'
  }
});

/**
 * Middleware factory for Express routes
 */
export function createGuardrailsMiddleware(guardrails: NlToCypherGuardrails = defaultGuardrails) {
  return async (req: any, res: any, next: any) => {
    // Extract context from request
    const context = {
      user_id: req.user?.id || req.headers['x-user-id'] || 'anonymous',
      tenant_id: req.tenant?.id || req.headers['x-tenant-id'] || 'default',
      user_role: req.user?.role || req.headers['x-user-role'],
      scopes: req.user?.scopes || req.headers['x-user-scopes']?.split(','),
      enforcement_mode: (req.query.enforcement_mode as any) || 'block',
      explain_level: (req.query.explain_level as any) || 'detailed',
      include_suggestions: req.query.include_suggestions !== 'false',
      include_auto_fixes: req.query.include_auto_fixes !== 'false'
    };

    // Attach guardrails and context to request
    req.guardrails = guardrails;
    req.guardrailsContext = context;

    next();
  };
}

/**
 * Utility functions for common operations
 */
export const GuardrailsUtils = {
  /**
   * Extract metrics from analysis for observability
   */
  extractMetrics(analysis: any) {
    return {
      is_allowed: analysis.is_allowed,
      violation_count: analysis.violations.length,
      error_count: analysis.violations.filter((v: any) => v.severity === 'error').length,
      warning_count: analysis.violations.filter((v: any) => v.severity === 'warning').length,
      complexity_score: analysis.complexity_score,
      estimated_cost: analysis.estimated_cost,
      was_modified: !!analysis.modified_cypher,
      enforcement_mode: analysis.enforcement_mode
    };
  },

  /**
   * Check if query needs user confirmation before execution
   */
  needsConfirmation(analysis: any): boolean {
    const hasWarnings = analysis.violations.some((v: any) => v.severity === 'warning');
    const wasModified = !!analysis.modified_cypher;
    const highComplexity = analysis.complexity_score > 3;

    return hasWarnings || wasModified || highComplexity;
  },

  /**
   * Generate safe query ID for logging
   */
  generateQueryId(cypher: string): string {
    // Generate deterministic ID based on query structure, not content
    const normalized = cypher
      .replace(/\s+/g, ' ')
      .replace(/['"][^'"]*['"]/g, '***') // Mask string literals
      .replace(/\b\d+\b/g, '#') // Mask numbers
      .toLowerCase()
      .trim();

    return Buffer.from(normalized).toString('base64').substring(0, 16);
  }
};