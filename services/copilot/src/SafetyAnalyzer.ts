/**
 * Safety Analyzer for Query Validation
 *
 * Implements static safety checks on generated queries before execution.
 * Enforces guardrails around:
 * - Query depth (traversal hops)
 * - Result limits (row counts)
 * - Disallowed labels/types
 * - Forbidden operations (DELETE, CREATE, etc.)
 * - Syntax validation
 * - Injection prevention
 */

import type {
  PolicyContext,
  QueryDialect,
  SafetyCheckResult,
  SafetyViolation,
  SafetyWarning,
  SafetyViolationCode,
} from './types.js';

// =============================================================================
// Constants
// =============================================================================

const FORBIDDEN_CYPHER_OPERATIONS = [
  'DELETE',
  'DETACH DELETE',
  'CREATE',
  'MERGE',
  'SET',
  'DROP',
  'REMOVE',
  'CALL db.',
  'CALL dbms.',
  'CALL apoc.trigger',
  'CALL apoc.periodic',
  ':BEGIN',
  ':COMMIT',
  ':ROLLBACK',
];

const FORBIDDEN_SQL_OPERATIONS = [
  'DELETE',
  'DROP',
  'TRUNCATE',
  'INSERT',
  'UPDATE',
  'ALTER',
  'CREATE',
  'GRANT',
  'REVOKE',
  'EXEC',
  'EXECUTE',
];

const DANGEROUS_PATTERNS = [
  /['"];?\s*--/i, // SQL comment injection
  /['"];?\s*\/\*/i, // Block comment injection
  /UNION\s+(?:ALL\s+)?SELECT/i, // Union-based injection
  /;\s*(?:DELETE|DROP|INSERT|UPDATE)/i, // Command chaining
  /xp_cmdshell/i, // SQL Server command execution
  /INTO\s+(?:OUTFILE|DUMPFILE)/i, // File operations
];

// =============================================================================
// Safety Analyzer
// =============================================================================

export class SafetyAnalyzer {
  /**
   * Analyze a query for safety violations.
   */
  analyzeQuerySafety(
    query: string,
    dialect: QueryDialect,
    policy: PolicyContext,
  ): SafetyCheckResult {
    const violations: SafetyViolation[] = [];
    const warnings: SafetyWarning[] = [];

    // 1. Check for forbidden operations
    this.checkForbiddenOperations(query, dialect, violations);

    // 2. Check for injection patterns
    this.checkInjectionPatterns(query, violations);

    // 3. Check depth constraints
    const estimatedDepth = this.estimateQueryDepth(query, dialect);
    this.checkDepthConstraint(estimatedDepth, policy, violations, warnings);

    // 4. Check row limit
    const estimatedRows = this.estimateRowCount(query, dialect, policy);
    this.checkRowLimit(query, dialect, policy, estimatedRows, violations, warnings);

    // 5. Check disallowed labels/types
    this.checkDisallowedLabels(query, dialect, policy, violations);

    // 6. Check for unbounded patterns
    this.checkUnboundedPatterns(query, dialect, violations, warnings);

    // 7. Check basic syntax
    this.checkBasicSyntax(query, dialect, violations);

    // Build suggested fixes
    const suggestedFixes = this.generateSuggestedFixes(violations, policy);

    return {
      passesStaticChecks: violations.length === 0,
      violations,
      warnings,
      estimatedDepth,
      estimatedRows,
      suggestedFixes,
    };
  }

  // ---------------------------------------------------------------------------
  // Forbidden Operations Check
  // ---------------------------------------------------------------------------

  private checkForbiddenOperations(
    query: string,
    dialect: QueryDialect,
    violations: SafetyViolation[],
  ): void {
    const normalizedQuery = query.toUpperCase();
    const forbidden = dialect === 'SQL' ? FORBIDDEN_SQL_OPERATIONS : FORBIDDEN_CYPHER_OPERATIONS;

    for (const op of forbidden) {
      // Use word boundary matching to avoid false positives
      const regex = new RegExp(`\\b${op.replace(/\s+/g, '\\s+')}\\b`, 'i');
      if (regex.test(normalizedQuery)) {
        violations.push({
          code: 'FORBIDDEN_OPERATION',
          message: `Operation "${op}" is not allowed through the copilot`,
          severity: 'CRITICAL',
          location: this.findLocation(query, op),
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Injection Pattern Check
  // ---------------------------------------------------------------------------

  private checkInjectionPatterns(query: string, violations: SafetyViolation[]): void {
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(query)) {
        violations.push({
          code: 'POTENTIAL_INJECTION',
          message: `Query contains potentially dangerous pattern: ${pattern.source}`,
          severity: 'CRITICAL',
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Depth Constraint Check
  // ---------------------------------------------------------------------------

  private estimateQueryDepth(query: string, dialect: QueryDialect): number {
    if (dialect === 'CYPHER') {
      return this.estimateCypherDepth(query);
    } else {
      return this.estimateSqlDepth(query);
    }
  }

  private estimateCypherDepth(query: string): number {
    let maxDepth = 1;

    // Check for variable-length patterns: [*..N], [*1..N], [*N]
    const varLengthPatterns = query.matchAll(/\[\s*\*\s*(?:(\d+))?(?:\.\.(\d+))?\s*\]/g);
    for (const match of varLengthPatterns) {
      const maxHops = match[2] ? parseInt(match[2], 10) : match[1] ? parseInt(match[1], 10) : 10;
      maxDepth = Math.max(maxDepth, maxHops);
    }

    // Check for shortestPath patterns
    if (/shortestPath/i.test(query)) {
      const shortestPathMatch = query.match(/\[\s*\*(?:\d*)?\.\.(\d+)\s*\]/);
      if (shortestPathMatch) {
        maxDepth = Math.max(maxDepth, parseInt(shortestPathMatch[1], 10));
      } else {
        maxDepth = Math.max(maxDepth, 6); // Default shortestPath depth
      }
    }

    // Count separate MATCH clauses as potential depth
    const matchCount = (query.match(/\bMATCH\b/gi) || []).length;
    if (matchCount > 1) {
      maxDepth = Math.max(maxDepth, matchCount);
    }

    return maxDepth;
  }

  private estimateSqlDepth(query: string): number {
    let depth = 1;

    // Count JOINs as depth
    const joinCount = (query.match(/\bJOIN\b/gi) || []).length;
    depth = Math.max(depth, joinCount + 1);

    // Check for recursive CTEs
    if (/WITH\s+RECURSIVE/i.test(query)) {
      // Look for depth limit in recursive CTE
      const depthMatch = query.match(/(?:depth|level)\s*<\s*(\d+)/i);
      if (depthMatch) {
        depth = Math.max(depth, parseInt(depthMatch[1], 10));
      } else {
        depth = Math.max(depth, 10); // Assume unbounded recursive
      }
    }

    // Count subqueries
    const subqueryCount = (query.match(/\(\s*SELECT/gi) || []).length;
    depth = Math.max(depth, subqueryCount + 1);

    return depth;
  }

  private checkDepthConstraint(
    estimatedDepth: number,
    policy: PolicyContext,
    violations: SafetyViolation[],
    warnings: SafetyWarning[],
  ): void {
    if (estimatedDepth > policy.maxDepth) {
      violations.push({
        code: 'EXCEEDS_MAX_DEPTH',
        message: `Query depth (${estimatedDepth}) exceeds maximum allowed (${policy.maxDepth})`,
        severity: 'ERROR',
      });
    } else if (estimatedDepth > policy.maxDepth * 0.8) {
      warnings.push({
        code: 'HIGH_DEPTH',
        message: `Query depth (${estimatedDepth}) is approaching the limit (${policy.maxDepth})`,
        severity: 'WARNING',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Row Limit Check
  // ---------------------------------------------------------------------------

  private estimateRowCount(query: string, dialect: QueryDialect, policy: PolicyContext): number {
    // Extract LIMIT from query
    const limitMatch = query.match(/\bLIMIT\s+(\d+)/i);
    if (limitMatch) {
      return parseInt(limitMatch[1], 10);
    }

    // Check for TOP in SQL Server style
    const topMatch = query.match(/\bTOP\s+(\d+)/i);
    if (topMatch) {
      return parseInt(topMatch[1], 10);
    }

    // No explicit limit - estimate based on query type
    if (/\bcount\s*\(/i.test(query)) {
      return 1; // COUNT queries return single row
    }

    // Assume worst case - no limit
    return policy.maxRows * 10; // Return value exceeding policy to trigger violation
  }

  private checkRowLimit(
    query: string,
    dialect: QueryDialect,
    policy: PolicyContext,
    estimatedRows: number,
    violations: SafetyViolation[],
    warnings: SafetyWarning[],
  ): void {
    const hasLimit = /\bLIMIT\s+\d+/i.test(query) || /\bTOP\s+\d+/i.test(query);
    const isCountQuery = /\bcount\s*\(/i.test(query);

    if (!hasLimit && !isCountQuery) {
      violations.push({
        code: 'MISSING_LIMIT',
        message: `Query must include a LIMIT clause (max ${policy.maxRows})`,
        severity: 'ERROR',
      });
    } else if (estimatedRows > policy.maxRows) {
      violations.push({
        code: 'EXCEEDS_MAX_ROWS',
        message: `Query limit (${estimatedRows}) exceeds maximum allowed (${policy.maxRows})`,
        severity: 'ERROR',
      });
    } else if (estimatedRows > policy.maxRows * 0.8) {
      warnings.push({
        code: 'HIGH_ROW_COUNT',
        message: `Query limit (${estimatedRows}) is approaching the maximum (${policy.maxRows})`,
        severity: 'WARNING',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Disallowed Labels Check
  // ---------------------------------------------------------------------------

  private checkDisallowedLabels(
    query: string,
    dialect: QueryDialect,
    policy: PolicyContext,
    violations: SafetyViolation[],
  ): void {
    const allDisallowed = [
      ...(policy.disallowedLabels || []),
      ...(policy.disallowedNodeTypes || []),
      ...(policy.disallowedEdgeTypes || []),
    ];

    for (const label of allDisallowed) {
      // Check for label in Cypher (e.g., :Person, :WORKS_FOR)
      const cypherLabelRegex = new RegExp(`:${label}\\b`, 'i');
      // Check for table/type name in SQL
      const sqlTableRegex = new RegExp(
        `(?:FROM|JOIN|INTO|UPDATE)\\s+(?:\\w+\\.)?${label}\\b`,
        'i',
      );
      // Check for type comparison
      const typeCompareRegex = new RegExp(`type\\s*=\\s*['"]?${label}['"]?`, 'i');

      if (cypherLabelRegex.test(query) || sqlTableRegex.test(query) || typeCompareRegex.test(query)) {
        violations.push({
          code: 'DISALLOWED_LABEL',
          message: `Access to label/type "${label}" is not permitted`,
          severity: 'CRITICAL',
          location: label,
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Unbounded Pattern Check
  // ---------------------------------------------------------------------------

  private checkUnboundedPatterns(
    query: string,
    dialect: QueryDialect,
    violations: SafetyViolation[],
    warnings: SafetyWarning[],
  ): void {
    if (dialect === 'CYPHER') {
      // Check for unbounded variable-length patterns [*] without upper limit
      if (/\[\s*\*\s*\]/.test(query)) {
        violations.push({
          code: 'UNBOUNDED_PATTERN',
          message: 'Unbounded variable-length pattern [*] is not allowed. Specify a maximum depth.',
          severity: 'ERROR',
        });
      }

      // Check for very large bounds
      const largeBoundMatch = query.match(/\[\s*\*\s*(?:\d+)?\.\.(\d+)\s*\]/);
      if (largeBoundMatch && parseInt(largeBoundMatch[1], 10) > 10) {
        warnings.push({
          code: 'LARGE_TRAVERSAL_BOUND',
          message: `Variable-length pattern with bound > 10 may be slow`,
          severity: 'WARNING',
        });
      }
    }

    if (dialect === 'SQL') {
      // Check for recursive CTE without depth limit
      if (/WITH\s+RECURSIVE/i.test(query) && !/depth\s*<|level\s*</i.test(query)) {
        warnings.push({
          code: 'UNBOUNDED_RECURSION',
          message: 'Recursive CTE without explicit depth limit may be slow or unbounded',
          severity: 'WARNING',
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Basic Syntax Check
  // ---------------------------------------------------------------------------

  private checkBasicSyntax(
    query: string,
    dialect: QueryDialect,
    violations: SafetyViolation[],
  ): void {
    if (dialect === 'CYPHER') {
      this.checkCypherSyntax(query, violations);
    } else {
      this.checkSqlSyntax(query, violations);
    }
  }

  private checkCypherSyntax(query: string, violations: SafetyViolation[]): void {
    const upperQuery = query.toUpperCase();

    // Must have RETURN (unless it's a write operation, which we block anyway)
    if (!upperQuery.includes('RETURN') && !upperQuery.includes('CREATE') && !upperQuery.includes('DELETE')) {
      violations.push({
        code: 'INVALID_SYNTAX',
        message: 'Cypher query must contain a RETURN clause',
        severity: 'ERROR',
      });
    }

    // Check balanced parentheses and brackets
    if (!this.hasBalancedBrackets(query, '(', ')')) {
      violations.push({
        code: 'INVALID_SYNTAX',
        message: 'Unbalanced parentheses in query',
        severity: 'ERROR',
      });
    }

    if (!this.hasBalancedBrackets(query, '[', ']')) {
      violations.push({
        code: 'INVALID_SYNTAX',
        message: 'Unbalanced square brackets in query',
        severity: 'ERROR',
      });
    }

    if (!this.hasBalancedBrackets(query, '{', '}')) {
      violations.push({
        code: 'INVALID_SYNTAX',
        message: 'Unbalanced curly braces in query',
        severity: 'ERROR',
      });
    }
  }

  private checkSqlSyntax(query: string, violations: SafetyViolation[]): void {
    const upperQuery = query.toUpperCase();

    // Must have SELECT for read queries
    if (!upperQuery.includes('SELECT')) {
      violations.push({
        code: 'INVALID_SYNTAX',
        message: 'SQL query must contain a SELECT clause',
        severity: 'ERROR',
      });
    }

    // Check balanced parentheses
    if (!this.hasBalancedBrackets(query, '(', ')')) {
      violations.push({
        code: 'INVALID_SYNTAX',
        message: 'Unbalanced parentheses in query',
        severity: 'ERROR',
      });
    }
  }

  private hasBalancedBrackets(str: string, open: string, close: string): boolean {
    let count = 0;
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < str.length; i++) {
      const char = str[i];

      // Track string literals to avoid counting brackets inside strings
      if ((char === '"' || char === "'") && (i === 0 || str[i - 1] !== '\\')) {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
        continue;
      }

      if (inString) continue;

      if (char === open) count++;
      if (char === close) count--;

      if (count < 0) return false;
    }

    return count === 0;
  }

  // ---------------------------------------------------------------------------
  // Utility Methods
  // ---------------------------------------------------------------------------

  private findLocation(query: string, pattern: string): string {
    const index = query.toUpperCase().indexOf(pattern.toUpperCase());
    if (index === -1) return pattern;

    const start = Math.max(0, index - 10);
    const end = Math.min(query.length, index + pattern.length + 10);
    return '...' + query.substring(start, end) + '...';
  }

  private generateSuggestedFixes(
    violations: SafetyViolation[],
    policy: PolicyContext,
  ): string[] {
    const fixes: string[] = [];

    for (const violation of violations) {
      switch (violation.code) {
        case 'MISSING_LIMIT':
          fixes.push(`Add "LIMIT ${policy.maxRows}" to the query`);
          break;
        case 'EXCEEDS_MAX_ROWS':
          fixes.push(`Reduce LIMIT to ${policy.maxRows} or less`);
          break;
        case 'EXCEEDS_MAX_DEPTH':
          fixes.push(`Reduce traversal depth to ${policy.maxDepth} or less`);
          break;
        case 'UNBOUNDED_PATTERN':
          fixes.push(`Change [*] to [*..${policy.maxDepth}] to bound the traversal`);
          break;
        case 'DISALLOWED_LABEL':
          fixes.push(`Remove reference to restricted label "${violation.location}"`);
          break;
        case 'FORBIDDEN_OPERATION':
          fixes.push(`Remove the "${violation.location}" operation - only read queries are allowed`);
          break;
      }
    }

    return fixes;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

export function createSafetyAnalyzer(): SafetyAnalyzer {
  return new SafetyAnalyzer();
}

/**
 * Convenience function for analyzing query safety.
 */
export function analyzeQuerySafety(
  query: string,
  dialect: QueryDialect,
  policy: PolicyContext,
): SafetyCheckResult {
  const analyzer = new SafetyAnalyzer();
  return analyzer.analyzeQuerySafety(query, dialect, policy);
}
