/**
 * Validator - Validates Cypher queries for syntax and security issues
 */

import type { ValidationResult } from './types';
import pino from 'pino';

const logger = pino({ name: 'cypher-validator' });

/**
 * Validate a Cypher query for syntax correctness and security
 */
export function validateCypher(cypher: string): ValidationResult {
  const syntaxErrors: string[] = [];
  const warnings: string[] = [];
  const securityIssues: string[] = [];

  const trimmed = cypher.trim();
  const upperCypher = cypher.toUpperCase();

  // Basic syntax checks
  if (!trimmed) {
    syntaxErrors.push('Empty query');
    return { isValid: false, syntaxErrors, warnings, securityIssues };
  }

  // Must start with a valid Cypher keyword
  const validStarts = [
    'MATCH',
    'OPTIONAL MATCH',
    'WITH',
    'UNWIND',
    'CALL',
    'RETURN',
  ];
  const startsValid = validStarts.some((keyword) => upperCypher.startsWith(keyword));

  if (!startsValid) {
    syntaxErrors.push(
      `Query must start with a valid Cypher clause: ${validStarts.join(', ')}`,
    );
  }

  // Must contain RETURN (for read queries) or a mutation clause
  const hasReturn = upperCypher.includes('RETURN');
  const hasMutation = ['CREATE', 'MERGE', 'SET', 'DELETE', 'REMOVE'].some((op) =>
    upperCypher.includes(op),
  );

  if (!hasReturn && !hasMutation) {
    syntaxErrors.push('Query must contain a RETURN clause or mutation operation');
  }

  // Check for balanced parentheses
  const openParens = (cypher.match(/\(/g) || []).length;
  const closeParens = (cypher.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    syntaxErrors.push(
      `Unbalanced parentheses: ${openParens} opening, ${closeParens} closing`,
    );
  }

  // Check for balanced brackets
  const openBrackets = (cypher.match(/\[/g) || []).length;
  const closeBrackets = (cypher.match(/\]/g) || []).length;
  if (openBrackets !== closeBrackets) {
    syntaxErrors.push(
      `Unbalanced brackets: ${openBrackets} opening, ${closeBrackets} closing`,
    );
  }

  // Check for balanced braces
  const openBraces = (cypher.match(/\{/g) || []).length;
  const closeBraces = (cypher.match(/\}/g) || []).length;
  if (openBraces !== closeBraces) {
    syntaxErrors.push(
      `Unbalanced braces: ${openBraces} opening, ${closeBraces} closing`,
    );
  }

  // Security checks - dangerous operations
  const dangerousOps = [
    { pattern: /\bDELETE\s+/i, message: 'DELETE operations not allowed in read queries' },
    {
      pattern: /\bDETACH\s+DELETE\s+/i,
      message: 'DETACH DELETE operations not allowed',
    },
    { pattern: /\bDROP\s+/i, message: 'DROP operations not allowed' },
    { pattern: /\bCREATE\s+INDEX/i, message: 'Schema modifications not allowed' },
    { pattern: /\bCREATE\s+CONSTRAINT/i, message: 'Schema modifications not allowed' },
    { pattern: /\bDROP\s+INDEX/i, message: 'Schema modifications not allowed' },
    { pattern: /\bDROP\s+CONSTRAINT/i, message: 'Schema modifications not allowed' },
  ];

  for (const { pattern, message } of dangerousOps) {
    if (pattern.test(cypher)) {
      securityIssues.push(message);
    }
  }

  // Check for mutations in general (CREATE, MERGE, SET, REMOVE)
  const mutationOps = ['CREATE ', 'MERGE ', 'SET ', 'REMOVE '];
  const hasMutationOp = mutationOps.some((op) => upperCypher.includes(op));
  if (hasMutationOp) {
    securityIssues.push(
      'Mutation operations (CREATE/MERGE/SET/REMOVE) are not allowed in compiled queries',
    );
  }

  // Warning checks
  if (!upperCypher.includes('LIMIT') && upperCypher.includes('MATCH')) {
    warnings.push(
      'No LIMIT clause - query may return large result sets. Consider adding LIMIT.',
    );
  }

  if (upperCypher.includes('[*]')) {
    warnings.push(
      'Unbounded variable-length path [*] can be very expensive - specify a maximum depth like [*..5]',
    );
  }

  // Check for variable-length paths with high depth
  const pathMatch = cypher.match(/\[\*\.\.(\d+)\]/);
  if (pathMatch) {
    const maxDepth = parseInt(pathMatch[1], 10);
    if (maxDepth > 10) {
      warnings.push(
        `Variable-length path depth of ${maxDepth} is very high - consider reducing to ≤10`,
      );
    }
  }

  // Check for potential cartesian products
  const matchCount = (cypher.match(/MATCH/gi) || []).length;
  if (matchCount > 1 && !upperCypher.includes('WHERE')) {
    warnings.push(
      `Multiple MATCH clauses without WHERE may create expensive cartesian product`,
    );
  }

  // Check for missing parameter placeholders
  const hasParameters = cypher.includes('$');
  const needsParameters = cypher.includes('=') && cypher.includes('WHERE');
  if (needsParameters && !hasParameters) {
    warnings.push(
      'Query has WHERE conditions but no parameter placeholders ($param) - consider using parameters for reusability',
    );
  }

  // Check for potential injection risks (string concatenation)
  if (cypher.includes('+') && cypher.includes("'")) {
    warnings.push(
      'String concatenation detected - ensure user input is properly parameterized',
    );
  }

  const isValid = syntaxErrors.length === 0 && securityIssues.length === 0;

  logger.debug(
    {
      isValid,
      syntaxErrorCount: syntaxErrors.length,
      warningCount: warnings.length,
      securityIssueCount: securityIssues.length,
    },
    'Cypher validation completed',
  );

  return {
    isValid,
    syntaxErrors,
    warnings,
    securityIssues,
  };
}

/**
 * Extract required parameter names from a Cypher query
 */
export function extractRequiredParameters(cypher: string): string[] {
  const paramPattern = /\$(\w+)/g;
  const params = new Set<string>();

  let match;
  while ((match = paramPattern.exec(cypher)) !== null) {
    params.add(match[1]);
  }

  return Array.from(params).sort();
}

/**
 * Check if a query is read-only (no mutations)
 */
export function isReadOnlyQuery(cypher: string): boolean {
  const upperCypher = cypher.toUpperCase();
  const mutationKeywords = [
    'CREATE ',
    'MERGE ',
    'SET ',
    'DELETE ',
    'REMOVE ',
    'DROP ',
    'DETACH DELETE',
  ];

  return !mutationKeywords.some((keyword) => upperCypher.includes(keyword));
}
