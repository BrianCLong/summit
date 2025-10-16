/**
 * NL→Cypher Guardrails & Constraints
 * Implements read-only defaults and mutation controls for non-privileged contexts
 */

export interface CypherConstraint {
  name: string;
  description: string;
  check: (cypher: string, context: QueryContext) => ConstraintResult;
  severity: 'error' | 'warning' | 'info';
}

export interface QueryContext {
  userId: string;
  roles: string[];
  isPrivileged: boolean;
  tenantId: string;
  source: 'api' | 'ui' | 'internal';
  timestamp: Date;
}

export interface ConstraintResult {
  allowed: boolean;
  reason?: string;
  explainPath?: string;
  suggestedFix?: string;
}

/**
 * Read-only constraint for non-privileged contexts
 */
const readOnlyConstraint: CypherConstraint = {
  name: 'read-only-default',
  description: 'Enforces read-only operations for non-privileged users',
  severity: 'error',
  check: (cypher: string, context: QueryContext): ConstraintResult => {
    // Allow privileged users to run mutations
    if (context.isPrivileged) {
      return { allowed: true };
    }

    // Detect mutation operations
    const mutationPatterns = [
      /\b(CREATE|MERGE|SET|DELETE|REMOVE|DETACH)\b/i,
      /\bCALL\s+\w+\.(create|update|delete|remove)/i,
      /\bCALL\s+apoc\.periodic\./i,
      /\bCALL\s+dbms\./i,
    ];

    for (const pattern of mutationPatterns) {
      if (pattern.test(cypher)) {
        return {
          allowed: false,
          reason: 'Mutation operations require privileged access',
          explainPath: '/docs/security/webauthn-step-up',
          suggestedFix:
            'Complete WebAuthn step-up authentication for write operations',
        };
      }
    }

    return { allowed: true };
  },
};

/**
 * Query complexity constraint
 */
const complexityConstraint: CypherConstraint = {
  name: 'query-complexity',
  description: 'Limits query complexity to prevent resource exhaustion',
  severity: 'error',
  check: (cypher: string, context: QueryContext): ConstraintResult => {
    // Count expensive operations
    const expensivePatterns = [
      /\bVARIABLE\s+LENGTH\s+PATH/i,
      /\(\*\)/g, // Variable length relationships
      /\bALL\s+SHORTEST\s+PATH/i,
      /\bSHORTEST\s+PATH/i,
      /\bCALL\s+\{\s*.*\s*\}\s*IN\s+TRANSACTIONS/i,
    ];

    let complexityScore = 0;
    for (const pattern of expensivePatterns) {
      const matches = cypher.match(pattern);
      if (matches) {
        complexityScore += matches.length;
      }
    }

    // Count MATCH clauses (each adds to complexity)
    const matchCount = (cypher.match(/\bMATCH\b/gi) || []).length;
    complexityScore += Math.max(0, matchCount - 3); // Allow up to 3 MATCH clauses

    const maxComplexity = context.isPrivileged ? 10 : 5;

    if (complexityScore > maxComplexity) {
      return {
        allowed: false,
        reason: `Query complexity score (${complexityScore}) exceeds limit (${maxComplexity})`,
        explainPath: '/docs/cypher/complexity-limits',
        suggestedFix:
          'Simplify query by reducing MATCH clauses or avoiding variable-length paths',
      };
    }

    return { allowed: true };
  },
};

/**
 * Data export constraint
 */
const exportConstraint: CypherConstraint = {
  name: 'data-export-limit',
  description: 'Limits data export volume and frequency',
  severity: 'warning',
  check: (cypher: string, context: QueryContext): ConstraintResult => {
    // Detect potential large exports
    const exportPatterns = [
      /\bRETURN\s+\*\b/i,
      /\bLIMIT\s+([1-9]\d{4,})/i, // LIMIT > 10,000
      /\bCOLLECT\s*\(/i,
    ];

    for (const pattern of exportPatterns) {
      if (pattern.test(cypher)) {
        if (!context.isPrivileged) {
          return {
            allowed: false,
            reason: 'Large data exports require privileged access',
            explainPath: '/docs/security/data-export-policies',
            suggestedFix:
              'Use pagination or request elevated privileges for bulk export',
          };
        }
      }
    }

    return { allowed: true };
  },
};

/**
 * Tenant isolation constraint
 */
const tenantIsolationConstraint: CypherConstraint = {
  name: 'tenant-isolation',
  description: 'Enforces tenant data isolation boundaries',
  severity: 'error',
  check: (cypher: string, context: QueryContext): ConstraintResult => {
    // Check if query includes tenant filtering
    const hasTenantFilter =
      /\b(tenantId|tenant_id)\s*[=:]\s*['"]?\$?tenantId/i.test(cypher);
    const hasGlobalAccess = context.roles.includes('global-admin');

    if (!hasTenantFilter && !hasGlobalAccess) {
      return {
        allowed: false,
        reason: 'Queries must include tenant isolation filters',
        explainPath: '/docs/security/tenant-isolation',
        suggestedFix: `Add WHERE clause: WHERE n.tenantId = $tenantId (current: ${context.tenantId})`,
      };
    }

    return { allowed: true };
  },
};

/**
 * Time-based access constraint
 */
const timeBasedConstraint: CypherConstraint = {
  name: 'time-based-access',
  description: 'Enforces time-based access restrictions',
  severity: 'info',
  check: (cypher: string, context: QueryContext): ConstraintResult => {
    const hour = context.timestamp.getHours();
    const isBusinessHours = hour >= 8 && hour < 18;

    // Require business hours for sensitive operations unless privileged
    const sensitivePatterns = [
      /\bDELETE\b/i,
      /\bDETACH\s+DELETE\b/i,
      /\bDROP\b/i,
    ];

    const hasSensitiveOp = sensitivePatterns.some((pattern) =>
      pattern.test(cypher),
    );

    if (hasSensitiveOp && !isBusinessHours && !context.isPrivileged) {
      return {
        allowed: false,
        reason:
          'Sensitive operations restricted to business hours (8 AM - 6 PM)',
        explainPath: '/docs/security/business-hours-policy',
        suggestedFix: 'Wait for business hours or request emergency access',
      };
    }

    return { allowed: true };
  },
};

/**
 * Default constraint set
 */
export const defaultConstraints: CypherConstraint[] = [
  readOnlyConstraint,
  complexityConstraint,
  exportConstraint,
  tenantIsolationConstraint,
  timeBasedConstraint,
];

/**
 * Evaluate all constraints against a Cypher query
 */
export class CypherGuardrails {
  private constraints: CypherConstraint[];

  constructor(constraints: CypherConstraint[] = defaultConstraints) {
    this.constraints = constraints;
  }

  evaluate(
    cypher: string,
    context: QueryContext,
  ): {
    allowed: boolean;
    violations: Array<{
      constraint: string;
      severity: string;
      reason: string;
      explainPath?: string;
      suggestedFix?: string;
    }>;
  } {
    const violations = [];
    let allowed = true;

    for (const constraint of this.constraints) {
      const result = constraint.check(cypher, context);

      if (!result.allowed) {
        violations.push({
          constraint: constraint.name,
          severity: constraint.severity,
          reason: result.reason || 'Constraint violation',
          explainPath: result.explainPath,
          suggestedFix: result.suggestedFix,
        });

        if (constraint.severity === 'error') {
          allowed = false;
        }
      }
    }

    return { allowed, violations };
  }

  /**
   * Get human-readable explanation for a constraint violation
   */
  explain(constraintName: string): string {
    const constraint = this.constraints.find((c) => c.name === constraintName);
    return constraint?.description || 'Unknown constraint';
  }

  /**
   * Add custom constraint
   */
  addConstraint(constraint: CypherConstraint): void {
    this.constraints.push(constraint);
  }

  /**
   * Remove constraint by name
   */
  removeConstraint(name: string): void {
    this.constraints = this.constraints.filter((c) => c.name !== name);
  }
}

/**
 * Default guardrails instance
 */
export const cypherGuardrails = new CypherGuardrails();

/**
 * Middleware for Express to enforce guardrails
 */
export const guardrailsMiddleware = (req: any, res: any, next: any) => {
  const cypher = req.body.cypher || req.query.cypher;

  if (!cypher) {
    return next();
  }

  const context: QueryContext = {
    userId: req.user?.id || 'anonymous',
    roles: req.user?.roles || [],
    isPrivileged: req.user?.isPrivileged || false,
    tenantId: req.user?.tenantId || req.headers['x-tenant-id'],
    source: req.path.startsWith('/api') ? 'api' : 'ui',
    timestamp: new Date(),
  };

  const evaluation = cypherGuardrails.evaluate(cypher, context);

  if (!evaluation.allowed) {
    return res.status(403).json({
      error: 'Query violates security constraints',
      violations: evaluation.violations,
      explainUrl: '/docs/security/cypher-guardrails',
    });
  }

  // Log warnings
  const warnings = evaluation.violations.filter(
    (v) => v.severity === 'warning',
  );
  if (warnings.length > 0) {
    console.warn('Cypher guardrail warnings:', warnings);
  }

  next();
};
