/**
 * NL→Cypher Constraint System
 *
 * Enforces read-only policies, LIMIT injection/capping,
 * path complexity budgets, and provides explainable constraint violations.
 */

import { z } from 'zod';
import pino from 'pino';
import { randomUUID } from 'crypto';

const logger = pino({ name: 'nl2cypher-constraints' });

// Configuration schema
export const ConstraintConfigSchema = z.object({
  readonly: z.object({
    enabled: z.boolean().default(true),
    allowed_write_functions: z.array(z.string()).default([]),
    allowed_procedures: z.array(z.string()).default([])
  }),
  limits: z.object({
    default_limit: z.number().min(1).max(10000).default(100),
    max_limit: z.number().min(1).max(100000).default(10000),
    auto_inject: z.boolean().default(true)
  }),
  complexity: z.object({
    max_var_length_paths: z.number().min(1).max(10).default(3),
    max_traversal_depth: z.number().min(1).max(8).default(5),
    max_cartesian_product_size: z.number().min(1).max(1000).default(100),
    cost_budget: z.number().min(0.001).max(10.0).default(1.0)
  }),
  timeouts: z.object({
    query_timeout_ms: z.number().min(1000).max(300000).default(30000),
    parse_timeout_ms: z.number().min(100).max(10000).default(5000)
  }),
  patterns: z.object({
    forbidden_patterns: z.array(z.string()).default([
      'CALL\\s+apoc\\.cypher\\.run',
      'CALL\\s+apoc\\.load\\.json',
      'CALL\\s+dbms\\.',
      'LOAD\\s+CSV',
      'USING\\s+PERIODIC\\s+COMMIT'
    ]),
    warning_patterns: z.array(z.string()).default([
      '\\[\\*\\]',  // Variable length relationships
      'OPTIONAL\\s+MATCH.*OPTIONAL\\s+MATCH',  // Multiple optionals
      'UNWIND.*UNWIND'  // Nested unwinds
    ])
  })
});

export type ConstraintConfig = z.infer<typeof ConstraintConfigSchema>;

// Constraint violation types
export interface ConstraintViolation {
  code: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  category: 'readonly' | 'limit' | 'complexity' | 'pattern' | 'timeout';
  suggestion?: string;
  auto_fix?: string;
}

// Analysis result
export interface ConstraintAnalysis {
  query_id: string;
  original_cypher: string;
  modified_cypher?: string;
  violations: ConstraintViolation[];
  estimated_cost: number;
  complexity_score: number;
  is_allowed: boolean;
  enforcement_mode: 'block' | 'warn' | 'allow';
  reasons: string[];
}

// Constraint enforcement engine
export class CypherConstraintEngine {
  private config: ConstraintConfig;

  constructor(config: Partial<ConstraintConfig> = {}) {
    this.config = ConstraintConfigSchema.parse(config);
    logger.info('CypherConstraintEngine initialized', { config: this.config });
  }

  /**
   * Analyze and potentially modify Cypher query to enforce constraints
   */
  async analyzeQuery(
    cypher: string,
    context: {
      user_id: string;
      tenant_id: string;
      scopes?: string[];
      enforcement_mode?: 'block' | 'warn' | 'allow';
    }
  ): Promise<ConstraintAnalysis> {
    const query_id = randomUUID();
    const start_time = Date.now();

    try {
      logger.debug({ query_id, cypher }, 'Analyzing Cypher query constraints');

      const violations: ConstraintViolation[] = [];
      let modified_cypher = cypher;
      let estimated_cost = 0;
      let complexity_score = 0;

      // 1. Check read-only constraints
      const readonlyViolations = this.checkReadOnlyConstraints(cypher);
      violations.push(...readonlyViolations);

      // 2. Check and inject LIMIT constraints
      const limitAnalysis = this.analyzeLimitConstraints(cypher);
      violations.push(...limitAnalysis.violations);
      if (limitAnalysis.modified_query) {
        modified_cypher = limitAnalysis.modified_query;
      }

      // 3. Check complexity constraints
      const complexityAnalysis = this.analyzeComplexity(modified_cypher);
      violations.push(...complexityAnalysis.violations);
      estimated_cost = complexityAnalysis.estimated_cost;
      complexity_score = complexityAnalysis.complexity_score;

      // 4. Check forbidden patterns
      const patternViolations = this.checkForbiddenPatterns(cypher);
      violations.push(...patternViolations);

      // 5. Determine enforcement action
      const enforcement_mode = context.enforcement_mode || 'block';
      const blocking_violations = violations.filter(v => v.severity === 'error');
      const is_allowed = blocking_violations.length === 0 || enforcement_mode === 'allow';

      // 6. Generate human-readable reasons
      const reasons = this.generateReasons(violations, complexity_score);

      const analysis: ConstraintAnalysis = {
        query_id,
        original_cypher: cypher,
        modified_cypher: modified_cypher !== cypher ? modified_cypher : undefined,
        violations,
        estimated_cost,
        complexity_score,
        is_allowed,
        enforcement_mode,
        reasons
      };

      const duration = Date.now() - start_time;
      logger.info({
        query_id,
        user_id: context.user_id,
        tenant_id: context.tenant_id,
        is_allowed,
        violation_count: violations.length,
        complexity_score,
        estimated_cost,
        duration
      }, 'Cypher constraint analysis completed');

      return analysis;

    } catch (error) {
      logger.error({ query_id, error }, 'Constraint analysis failed');
      throw new Error(`Constraint analysis failed: ${error.message}`);
    }
  }

  /**
   * Check for write operations and non-allowed procedures
   */
  private checkReadOnlyConstraints(cypher: string): ConstraintViolation[] {
    if (!this.config.readonly.enabled) {
      return [];
    }

    const violations: ConstraintViolation[] = [];
    const normalizedCypher = cypher.toUpperCase();

    // Check for forbidden write operations
    const writeOperations = [
      { pattern: /\bCREATE\b/, operation: 'CREATE' },
      { pattern: /\bMERGE\b/, operation: 'MERGE' },
      { pattern: /\bDELETE\b/, operation: 'DELETE' },
      { pattern: /\bREMOVE\b/, operation: 'REMOVE' },
      { pattern: /\bSET\b/, operation: 'SET' },
      { pattern: /\bDROP\b/, operation: 'DROP' },
      { pattern: /\bFOREACH\b/, operation: 'FOREACH' }
    ];

    for (const { pattern, operation } of writeOperations) {
      if (pattern.test(normalizedCypher)) {
        violations.push({
          code: 'READONLY_VIOLATION',
          message: `Write operation not allowed: ${operation}`,
          severity: 'error',
          category: 'readonly',
          suggestion: 'Use read-only operations like MATCH and RETURN instead'
        });
      }
    }

    // Check for dangerous CALL procedures
    const callMatches = normalizedCypher.match(/CALL\s+([a-z0-9_.]+)/gi);
    if (callMatches) {
      for (const match of callMatches) {
        const procedure = match.split(/\s+/)[1].toLowerCase();

        if (!this.config.readonly.allowed_procedures.includes(procedure)) {
          // Check for known dangerous procedures
          const dangerousProcedures = [
            'apoc.cypher.run',
            'apoc.load.json',
            'apoc.load.csv',
            'dbms.executeQuery',
            'dbms.security.',
            'apoc.export.',
            'apoc.import.'
          ];

          if (dangerousProcedures.some(danger => procedure.startsWith(danger))) {
            violations.push({
              code: 'DANGEROUS_PROCEDURE',
              message: `Dangerous procedure not allowed: ${procedure}`,
              severity: 'error',
              category: 'readonly',
              suggestion: 'Use built-in Cypher functions or approved read-only procedures'
            });
          }
        }
      }
    }

    return violations;
  }

  /**
   * Analyze and inject LIMIT constraints
   */
  private analyzeLimitConstraints(cypher: string): {
    violations: ConstraintViolation[];
    modified_query?: string;
  } {
    const violations: ConstraintViolation[] = [];
    let modified_query = cypher;

    // Check if query already has LIMIT
    const hasLimit = /\bLIMIT\s+\d+/i.test(cypher);
    const limitMatch = cypher.match(/\bLIMIT\s+(\d+)/i);

    if (hasLimit && limitMatch) {
      const limit = parseInt(limitMatch[1]);

      if (limit > this.config.limits.max_limit) {
        violations.push({
          code: 'LIMIT_TOO_HIGH',
          message: `LIMIT ${limit} exceeds maximum allowed ${this.config.limits.max_limit}`,
          severity: 'error',
          category: 'limit',
          suggestion: `Reduce LIMIT to ${this.config.limits.max_limit} or less`,
          auto_fix: cypher.replace(/\bLIMIT\s+\d+/i, `LIMIT ${this.config.limits.max_limit}`)
        });

        // Auto-fix: cap the limit
        modified_query = cypher.replace(/\bLIMIT\s+\d+/i, `LIMIT ${this.config.limits.max_limit}`);
      }
    } else if (this.config.limits.auto_inject) {
      // Auto-inject default LIMIT
      if (/\bRETURN\b/i.test(cypher)) {
        modified_query = cypher.replace(
          /(\bRETURN\b[^;]*?)(\s*;?\s*)$/i,
          `$1 LIMIT ${this.config.limits.default_limit}$2`
        );

        violations.push({
          code: 'LIMIT_INJECTED',
          message: `Auto-injected LIMIT ${this.config.limits.default_limit} for safety`,
          severity: 'info',
          category: 'limit',
          suggestion: 'Add explicit LIMIT clause to control result size'
        });
      }
    } else {
      // Warn about missing LIMIT
      violations.push({
        code: 'MISSING_LIMIT',
        message: 'Query lacks LIMIT clause, may return large result set',
        severity: 'warning',
        category: 'limit',
        suggestion: `Add LIMIT clause (recommended: LIMIT ${this.config.limits.default_limit})`
      });
    }

    return { violations, modified_query: modified_query !== cypher ? modified_query : undefined };
  }

  /**
   * Analyze query complexity and estimate cost
   */
  private analyzeComplexity(cypher: string): {
    violations: ConstraintViolation[];
    estimated_cost: number;
    complexity_score: number;
  } {
    const violations: ConstraintViolation[] = [];
    let complexity_score = 1.0;
    let estimated_cost = 0.001; // Base cost

    // Check for variable-length paths
    const varLengthMatches = cypher.match(/\[[^\]]*\*(\d+)?\.\.(\d+)?\]/g);
    if (varLengthMatches) {
      for (const match of varLengthMatches) {
        const maxDepth = this.extractMaxDepth(match);
        if (maxDepth > this.config.complexity.max_var_length_paths) {
          violations.push({
            code: 'VAR_LENGTH_TOO_DEEP',
            message: `Variable-length path depth ${maxDepth} exceeds limit ${this.config.complexity.max_var_length_paths}`,
            severity: 'error',
            category: 'complexity',
            suggestion: `Reduce path depth to ${this.config.complexity.max_var_length_paths} or less`
          });
        }
        complexity_score *= (maxDepth || 3);
        estimated_cost += 0.01 * (maxDepth || 3);
      }
    }

    // Check for Cartesian products (multiple MATCH without relationships)
    const matchCount = (cypher.match(/\bMATCH\b/gi) || []).length;
    if (matchCount > 1) {
      const hasProperJoins = this.hasProperJoins(cypher);
      if (!hasProperJoins) {
        violations.push({
          code: 'POTENTIAL_CARTESIAN_PRODUCT',
          message: `Multiple MATCH clauses may create Cartesian product`,
          severity: 'warning',
          category: 'complexity',
          suggestion: 'Ensure MATCH clauses are properly connected with relationships'
        });
        complexity_score *= matchCount;
        estimated_cost += 0.05 * matchCount;
      }
    }

    // Check for nested subqueries
    const subqueryCount = (cypher.match(/\b(CALL\s*\{|WITH\s+.*WHERE)/gi) || []).length;
    if (subqueryCount > 2) {
      violations.push({
        code: 'HIGH_SUBQUERY_COMPLEXITY',
        message: `High number of subqueries (${subqueryCount}) may impact performance`,
        severity: 'warning',
        category: 'complexity',
        suggestion: 'Consider simplifying query structure'
      });
      complexity_score *= 1.5;
      estimated_cost += 0.02 * subqueryCount;
    }

    // Check estimated cost against budget
    if (estimated_cost > this.config.complexity.cost_budget) {
      violations.push({
        code: 'COST_BUDGET_EXCEEDED',
        message: `Estimated cost ${estimated_cost.toFixed(4)} exceeds budget ${this.config.complexity.cost_budget}`,
        severity: 'error',
        category: 'complexity',
        suggestion: 'Simplify query to reduce complexity'
      });
    }

    return { violations, estimated_cost, complexity_score };
  }

  /**
   * Check for forbidden patterns
   */
  private checkForbiddenPatterns(cypher: string): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];

    // Check forbidden patterns
    for (const pattern of this.config.patterns.forbidden_patterns) {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(cypher)) {
        violations.push({
          code: 'FORBIDDEN_PATTERN',
          message: `Query contains forbidden pattern: ${pattern}`,
          severity: 'error',
          category: 'pattern',
          suggestion: 'Remove or replace the forbidden pattern'
        });
      }
    }

    // Check warning patterns
    for (const pattern of this.config.patterns.warning_patterns) {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(cypher)) {
        violations.push({
          code: 'WARNING_PATTERN',
          message: `Query contains potentially expensive pattern: ${pattern}`,
          severity: 'warning',
          category: 'pattern',
          suggestion: 'Consider alternative query structure for better performance'
        });
      }
    }

    return violations;
  }

  /**
   * Generate human-readable reasons for decisions
   */
  private generateReasons(violations: ConstraintViolation[], complexity_score: number): string[] {
    const reasons: string[] = [];

    const errorCount = violations.filter(v => v.severity === 'error').length;
    const warningCount = violations.filter(v => v.severity === 'warning').length;

    if (errorCount === 0 && warningCount === 0) {
      reasons.push('Query passes all constraint checks');
    }

    if (errorCount > 0) {
      reasons.push(`Query has ${errorCount} blocking constraint violation(s)`);
    }

    if (warningCount > 0) {
      reasons.push(`Query has ${warningCount} performance warning(s)`);
    }

    if (complexity_score > 5) {
      reasons.push(`High complexity score (${complexity_score.toFixed(2)}) - may be slow`);
    }

    // Add specific violation summaries
    const violationsByCategory = violations.reduce((acc, v) => {
      acc[v.category] = (acc[v.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    for (const [category, count] of Object.entries(violationsByCategory)) {
      if (count > 0) {
        reasons.push(`${count} ${category} constraint issue(s)`);
      }
    }

    return reasons;
  }

  private extractMaxDepth(varLengthPath: string): number {
    const match = varLengthPath.match(/\*(\d+)?\.\.(\d+)?/);
    if (match) {
      const max = match[2] ? parseInt(match[2]) : undefined;
      return max || this.config.complexity.max_var_length_paths;
    }
    return 1;
  }

  private hasProperJoins(cypher: string): boolean {
    // Simple heuristic: check if variables are reused across MATCH clauses
    const matchClauses = cypher.split(/\bMATCH\b/i).slice(1);
    const variables = new Set<string>();

    for (const clause of matchClauses) {
      const clauseVars = clause.match(/\b[a-z_][a-z0-9_]*\b/gi) || [];
      for (const v of clauseVars) {
        if (variables.has(v.toLowerCase())) {
          return true; // Found reused variable
        }
        variables.add(v.toLowerCase());
      }
    }

    return false;
  }
}

// Default constraint configuration
export const DEFAULT_CONSTRAINT_CONFIG: ConstraintConfig = {
  readonly: {
    enabled: true,
    allowed_write_functions: [],
    allowed_procedures: [
      'db.labels',
      'db.relationshipTypes',
      'db.propertyKeys',
      'db.schema.nodeTypeProperties',
      'db.schema.relTypeProperties'
    ]
  },
  limits: {
    default_limit: 100,
    max_limit: 10000,
    auto_inject: true
  },
  complexity: {
    max_var_length_paths: 3,
    max_traversal_depth: 5,
    max_cartesian_product_size: 100,
    cost_budget: 1.0
  },
  timeouts: {
    query_timeout_ms: 30000,
    parse_timeout_ms: 5000
  },
  patterns: {
    forbidden_patterns: [
      'CALL\\s+apoc\\.cypher\\.run',
      'CALL\\s+apoc\\.load\\.',
      'CALL\\s+dbms\\.',
      'LOAD\\s+CSV',
      'USING\\s+PERIODIC\\s+COMMIT'
    ],
    warning_patterns: [
      '\\[\\*\\]',
      'OPTIONAL\\s+MATCH.*OPTIONAL\\s+MATCH',
      'UNWIND.*UNWIND'
    ]
  }
};