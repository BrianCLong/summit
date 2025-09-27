/**
 * NL→Cypher Explanation System
 *
 * Provides human-readable explanations for constraint decisions,
 * policy violations, and query modifications.
 */

import { ConstraintViolation, ConstraintAnalysis } from './constraints';

export interface ExplanationContext {
  user_role?: string;
  tenant_id: string;
  user_id: string;
  explain_level: 'basic' | 'detailed' | 'technical';
  include_suggestions: boolean;
  include_auto_fixes: boolean;
}

export interface QueryExplanation {
  summary: string;
  decision: 'allowed' | 'blocked' | 'modified';
  confidence: number;
  reasons: ExplanationReason[];
  suggestions: string[];
  auto_fixes: AutoFix[];
  policy_version: string;
  explain_id: string;
}

export interface ExplanationReason {
  category: string;
  severity: 'info' | 'warning' | 'error';
  title: string;
  description: string;
  technical_details?: string;
  learn_more_url?: string;
}

export interface AutoFix {
  description: string;
  original_query: string;
  fixed_query: string;
  confidence: number;
  safety_note?: string;
}

/**
 * Generates human-readable explanations for NL→Cypher constraint decisions
 */
export class CypherExplainer {
  private readonly baseUrl: string;
  private readonly policyVersion: string;

  constructor(config: { baseUrl?: string; policyVersion?: string } = {}) {
    this.baseUrl = config.baseUrl || 'https://docs.intelgraph.io/nlq-policies';
    this.policyVersion = config.policyVersion || 'nlq-guardrails-1.0';
  }

  /**
   * Generate comprehensive explanation for a constraint analysis
   */
  explainAnalysis(
    analysis: ConstraintAnalysis,
    context: ExplanationContext
  ): QueryExplanation {
    const { explain_level, include_suggestions, include_auto_fixes } = context;

    // Determine decision
    const decision = this.determineDecision(analysis);

    // Generate summary
    const summary = this.generateSummary(analysis, decision, explain_level);

    // Create detailed reasons
    const reasons = this.createReasons(analysis.violations, explain_level);

    // Generate suggestions
    const suggestions = include_suggestions
      ? this.generateSuggestions(analysis.violations, analysis.complexity_score)
      : [];

    // Create auto-fixes
    const auto_fixes = include_auto_fixes
      ? this.createAutoFixes(analysis.violations, analysis.original_cypher)
      : [];

    // Calculate confidence
    const confidence = this.calculateConfidence(analysis);

    return {
      summary,
      decision,
      confidence,
      reasons,
      suggestions,
      auto_fixes,
      policy_version: this.policyVersion,
      explain_id: `explain-${analysis.query_id}`
    };
  }

  private determineDecision(analysis: ConstraintAnalysis): 'allowed' | 'blocked' | 'modified' {
    if (!analysis.is_allowed) {
      return 'blocked';
    }

    if (analysis.modified_cypher && analysis.modified_cypher !== analysis.original_cypher) {
      return 'modified';
    }

    return 'allowed';
  }

  private generateSummary(
    analysis: ConstraintAnalysis,
    decision: string,
    level: string
  ): string {
    const errorCount = analysis.violations.filter(v => v.severity === 'error').length;
    const warningCount = analysis.violations.filter(v => v.severity === 'warning').length;

    switch (decision) {
      case 'allowed':
        if (warningCount > 0) {
          return `Query allowed with ${warningCount} performance warning(s). Consider optimizing for better performance.`;
        }
        return `Query passes all security and performance checks. Safe to execute.`;

      case 'modified':
        const modifications = this.describeModifications(analysis);
        return `Query automatically modified for safety: ${modifications}. Modified query is safe to execute.`;

      case 'blocked':
        if (level === 'basic') {
          return `Query blocked due to ${errorCount} security or policy violation(s). Please modify your query.`;
        }
        return `Query blocked: ${errorCount} blocking violation(s) found. Review the specific issues below and modify your query accordingly.`;

      default:
        return 'Query analysis completed.';
    }
  }

  private createReasons(violations: ConstraintViolation[], level: string): ExplanationReason[] {
    return violations.map(violation => this.violationToReason(violation, level));
  }

  private violationToReason(violation: ConstraintViolation, level: string): ExplanationReason {
    const reason: ExplanationReason = {
      category: violation.category,
      severity: violation.severity,
      title: this.getTitleForViolation(violation),
      description: this.getDescriptionForViolation(violation, level)
    };

    if (level === 'technical' || level === 'detailed') {
      reason.technical_details = this.getTechnicalDetails(violation);
      reason.learn_more_url = this.getLearnMoreUrl(violation);
    }

    return reason;
  }

  private getTitleForViolation(violation: ConstraintViolation): string {
    switch (violation.code) {
      case 'READONLY_VIOLATION':
        return 'Write Operation Detected';
      case 'DANGEROUS_PROCEDURE':
        return 'Dangerous Procedure Call';
      case 'LIMIT_TOO_HIGH':
        return 'Result Limit Too High';
      case 'MISSING_LIMIT':
        return 'Missing Result Limit';
      case 'LIMIT_INJECTED':
        return 'Safety Limit Added';
      case 'VAR_LENGTH_TOO_DEEP':
        return 'Path Traversal Too Deep';
      case 'POTENTIAL_CARTESIAN_PRODUCT':
        return 'Potential Performance Issue';
      case 'HIGH_SUBQUERY_COMPLEXITY':
        return 'Complex Query Structure';
      case 'COST_BUDGET_EXCEEDED':
        return 'Query Too Expensive';
      case 'FORBIDDEN_PATTERN':
        return 'Prohibited Query Pattern';
      case 'WARNING_PATTERN':
        return 'Performance Warning';
      default:
        return 'Constraint Check';
    }
  }

  private getDescriptionForViolation(violation: ConstraintViolation, level: string): string {
    switch (violation.code) {
      case 'READONLY_VIOLATION':
        return level === 'basic'
          ? 'Your query tries to modify data, but only read operations are allowed.'
          : 'The query contains write operations (CREATE, MERGE, DELETE, SET, REMOVE) which are not permitted in the NL→Cypher service. Only read operations (MATCH, RETURN) are allowed for security reasons.';

      case 'DANGEROUS_PROCEDURE':
        return level === 'basic'
          ? 'Your query calls a procedure that could be unsafe.'
          : 'The query attempts to call a procedure that could access external resources, modify system settings, or perform unsafe operations. Only approved read-only procedures are permitted.';

      case 'LIMIT_TOO_HIGH':
        return level === 'basic'
          ? 'Your query requests too many results.'
          : 'The LIMIT clause exceeds the maximum allowed result size. Large result sets can impact system performance and may indicate an overly broad query.';

      case 'MISSING_LIMIT':
        return level === 'basic'
          ? 'Your query should specify how many results you want.'
          : 'The query lacks a LIMIT clause, which could result in returning very large datasets. Adding a LIMIT helps control performance and ensures reasonable response times.';

      case 'LIMIT_INJECTED':
        return level === 'basic'
          ? 'We added a safety limit to your query.'
          : 'A default LIMIT clause was automatically added to prevent accidentally large result sets. You can specify your own LIMIT if you need a different number of results.';

      case 'VAR_LENGTH_TOO_DEEP':
        return level === 'basic'
          ? 'Your query tries to follow too many relationship hops.'
          : 'Variable-length path traversals with high maximum depths can be extremely expensive. The query traverses more relationship levels than the safety threshold allows.';

      case 'POTENTIAL_CARTESIAN_PRODUCT':
        return level === 'basic'
          ? 'Your query might return too many combinations of results.'
          : 'Multiple MATCH clauses without proper connections can create Cartesian products, exponentially increasing result size. Ensure your MATCH patterns are properly connected through shared variables or relationships.';

      case 'COST_BUDGET_EXCEEDED':
        return level === 'basic'
          ? 'Your query is estimated to be too expensive to run.'
          : 'The query complexity analysis indicates it would exceed the computational budget. Simplify the query by reducing traversal depth, adding more specific filters, or breaking it into smaller parts.';

      case 'FORBIDDEN_PATTERN':
        return level === 'basic'
          ? 'Your query uses a pattern that is not allowed.'
          : 'The query contains patterns or constructs that are explicitly forbidden due to security or performance concerns. These patterns could enable data exfiltration, system access, or resource exhaustion.';

      case 'WARNING_PATTERN':
        return level === 'basic'
          ? 'Your query uses a pattern that might be slow.'
          : 'The query contains patterns that are known to potentially impact performance. While not forbidden, these patterns may result in slow execution or high resource usage.';

      default:
        return violation.message;
    }
  }

  private getTechnicalDetails(violation: ConstraintViolation): string {
    switch (violation.code) {
      case 'READONLY_VIOLATION':
        return 'Write operations are blocked by the nl2cypher.readonly policy. The service runs with read-only transaction mode and validates all Cypher AST nodes against an allowlist of read operations.';

      case 'DANGEROUS_PROCEDURE':
        return 'Procedure calls are validated against the nl2cypher.allowed_procedures allowlist. Dynamic procedure execution via apoc.cypher.run and system procedures are explicitly blocked.';

      case 'VAR_LENGTH_TOO_DEEP':
        return 'Variable-length relationships [*n..m] are analyzed for maximum depth. Complexity scoring uses exponential growth: cost = base_cost * (max_depth ^ 2).';

      case 'POTENTIAL_CARTESIAN_PRODUCT':
        return 'Multiple disconnected MATCH clauses create Cartesian products with complexity O(n * m). The analyzer checks for shared variables between MATCH patterns.';

      case 'COST_BUDGET_EXCEEDED':
        return 'Cost estimation uses: base_cost + (var_length_factor * depth²) + (match_count * cartesian_penalty) + (subquery_count * complexity_multiplier).';

      default:
        return `Technical constraint: ${violation.code}`;
    }
  }

  private getLearnMoreUrl(violation: ConstraintViolation): string {
    const section = violation.category.toLowerCase();
    return `${this.baseUrl}/${section}#${violation.code.toLowerCase()}`;
  }

  private generateSuggestions(violations: ConstraintViolation[], complexity_score: number): string[] {
    const suggestions: string[] = [];
    const suggestionSet = new Set<string>();

    // Add violation-specific suggestions
    for (const violation of violations) {
      if (violation.suggestion && !suggestionSet.has(violation.suggestion)) {
        suggestions.push(violation.suggestion);
        suggestionSet.add(violation.suggestion);
      }
    }

    // Add general performance suggestions based on complexity
    if (complexity_score > 3) {
      const perfSuggestions = [
        'Add more specific WHERE clauses to filter results early',
        'Use indexed properties in your filters for better performance',
        'Consider breaking complex queries into simpler parts',
        'Use LIMIT to control result set size'
      ];

      perfSuggestions.forEach(suggestion => {
        if (!suggestionSet.has(suggestion)) {
          suggestions.push(suggestion);
          suggestionSet.add(suggestion);
        }
      });
    }

    // Add learning suggestions
    if (violations.some(v => v.severity === 'error')) {
      suggestions.push('See our query writing guide for best practices and examples');
    }

    return suggestions;
  }

  private createAutoFixes(violations: ConstraintViolation[], original_query: string): AutoFix[] {
    const fixes: AutoFix[] = [];

    for (const violation of violations) {
      if (violation.auto_fix) {
        fixes.push({
          description: `Fix ${violation.code}: ${violation.message}`,
          original_query,
          fixed_query: violation.auto_fix,
          confidence: this.calculateFixConfidence(violation),
          safety_note: this.getFixSafetyNote(violation)
        });
      }
    }

    return fixes;
  }

  private calculateFixConfidence(violation: ConstraintViolation): number {
    switch (violation.code) {
      case 'LIMIT_TOO_HIGH':
        return 0.95; // High confidence - simple replacement
      case 'LIMIT_INJECTED':
        return 0.90; // High confidence - safe addition
      case 'READONLY_VIOLATION':
        return 0.60; // Lower confidence - may change query semantics
      default:
        return 0.75;
    }
  }

  private getFixSafetyNote(violation: ConstraintViolation): string | undefined {
    switch (violation.code) {
      case 'READONLY_VIOLATION':
        return 'This fix removes write operations. Verify that the modified query still meets your needs.';
      case 'LIMIT_INJECTED':
        return 'The default limit was added for safety. Increase it if you need more results.';
      default:
        return undefined;
    }
  }

  private describeModifications(analysis: ConstraintAnalysis): string {
    const modifications: string[] = [];

    for (const violation of analysis.violations) {
      switch (violation.code) {
        case 'LIMIT_INJECTED':
          modifications.push('added safety limit');
          break;
        case 'LIMIT_TOO_HIGH':
          modifications.push('reduced result limit');
          break;
      }
    }

    return modifications.length > 0
      ? modifications.join(', ')
      : 'optimized for safety and performance';
  }

  private calculateConfidence(analysis: ConstraintAnalysis): number {
    let confidence = 1.0;

    // Reduce confidence for complex queries
    if (analysis.complexity_score > 5) {
      confidence *= 0.8;
    }

    // Reduce confidence if there are many violations
    const violationCount = analysis.violations.length;
    if (violationCount > 3) {
      confidence *= Math.max(0.5, 1 - (violationCount * 0.1));
    }

    // Reduce confidence for auto-modifications
    if (analysis.modified_cypher) {
      confidence *= 0.9;
    }

    return Math.max(0.1, confidence);
  }
}

/**
 * Pre-configured explainer with common settings
 */
export const defaultExplainer = new CypherExplainer({
  baseUrl: 'https://docs.intelgraph.io/nlq-guardrails',
  policyVersion: 'nlq-guardrails-1.0'
});