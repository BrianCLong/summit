/**
 * CYPHER INVARIANCE GUARD
 * -----------------------
 * Enforces "Result Shape Invariance" on all Cypher queries used for GraphRAG.
 * Ensures that as graphs grow, query result structures remain deterministic.
 */

export class CypherGuard {
  /**
   * Enforces that the query contains ORDER BY and LIMIT clauses.
   * If strictly required, it can throw an error or append defaults.
   *
   * @param query The Cypher query string
   * @param options Configuration for enforcement
   * @returns The sanitized query string (if modified) or original
   */
  static enforceInvariants(query: string, options: {
    strict: boolean;
    defaultLimit: number
  } = { strict: false, defaultLimit: 100 }): string {
    const normalized = query.trim().replace(/\s+/g, ' ');
    const upper = normalized.toUpperCase();

    // Check for ORDER BY
    if (!upper.includes('ORDER BY')) {
      if (options.strict) {
        throw new Error('Invariant Violation: Query must contain ORDER BY clause for determinism.');
      }
      // If not strict, we rely on the caller to handle non-determinism,
      // but we still enforce LIMIT if missing.
    }

    // Check for LIMIT
    if (!upper.includes('LIMIT')) {
      if (options.strict) {
        throw new Error('Invariant Violation: Query must contain LIMIT clause for bounding.');
      }
      return `${query} LIMIT ${options.defaultLimit}`;
    }

    return query;
  }

  /**
   * Wraps a query to strictly project specific fields, ensuring shape invariance.
   *
   * @param query The base match query (e.g. "MATCH (n) WHERE ...")
   * @param returnFields The fields to return (e.g. ["n.id", "n.name"])
   * @param orderByField The field to order by
   * @param limit Maximum results
   */
  static buildInvariantQuery(
    baseQuery: string,
    returnFields: string[],
    orderByField: string,
    limit: number
  ): string {
    // We construct a specific return statement
    const returnClause = `RETURN ${returnFields.join(', ')}`;
    const orderClause = `ORDER BY ${orderByField}`;
    const limitClause = `LIMIT ${limit}`;

    return `${baseQuery}
      ${returnClause}
      ${orderClause}
      ${limitClause}`;
  }
}
