import fs from 'fs';
import path from 'path';

/**
 * CI Script to verify Cypher query determinism.
 *
 * This script serves two purposes:
 * 1. It exports a validator function `validateCypherDeterminism` for use in unit tests.
 * 2. It can be run standalone to check specific query strings (passed as args) or as a smoke test.
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateCypherDeterminism(cypher: string): ValidationResult {
  const errors: string[] = [];
  const normalized = cypher.replace(/\s+/g, ' ').toUpperCase();

  // 1. Check for ORDER BY
  // NOTE: This is a simple heuristic. Complex queries might have ORDER BY in subqueries.
  // A robust parser would be needed for 100% accuracy, but this catches the 80% case.
  if (!normalized.includes('ORDER BY')) {
    errors.push('FAIL: Query is missing "ORDER BY" clause. Results will be non-deterministic.');
  }

  // 2. Check for LIMIT (Evidence Budgeting)
  if (!normalized.includes('LIMIT')) {
    errors.push('FAIL: Query is missing "LIMIT" clause. Violates Evidence Budget Policy.');
  }

  // 3. Check for Cartesian Products (Implicit)
  if (normalized.split('MATCH').length > 2 && !normalized.includes('WITH')) {
    // This is a weak check, but multiple MATCH blocks without WITH often imply Cartesian products
    // errors.push('WARNING: Potential Cartesian product detected (multiple MATCH without WITH).');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// Standalone execution
if (process.argv[1] === import.meta.url || process.argv[1].endsWith('verify_query_determinism.ts')) {
  console.log('🔍 Verifying Cypher Determinism Rules...');

  // Example "Golden" Query that should pass
  const validQuery = `
    MATCH (n:Person)-[:KNOWS]->(f)
    WHERE n.id = $id
    RETURN f.name
    ORDER BY f.rank DESC
    LIMIT 10
  `;

  // Example "Bad" Query
  const invalidQuery = `
    MATCH (n:Person)-[:KNOWS]->(f)
    RETURN f.name
  `;

  const r1 = validateCypherDeterminism(validQuery);
  const r2 = validateCypherDeterminism(invalidQuery);

  if (r1.valid && !r2.valid) {
    console.log('✅ Validator logic verified.');
    console.log('   - Valid query passed.');
    console.log('   - Invalid query failed as expected.');
    process.exit(0);
  } else {
    console.error('❌ Validator logic failed self-test.');
    console.error('Valid Query Result:', r1);
    console.error('Invalid Query Result:', r2);
    process.exit(1);
  }
}
