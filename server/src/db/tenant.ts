/**
 * Tenant Isolation Helper for PostgreSQL
 *
 * This module provides helper functions to enforce strict tenant isolation in database queries.
 * It ensures that every query is scoped to a specific tenant ID, effectively implementing logical sharding.
 */

import { ManagedPostgresPool } from './postgres.js';
// @ts-ignore
import { QueryResult } from 'pg';

interface TenantContext {
  tenantId: string;
}

/**
 * Wraps a query to enforce tenant isolation.
 * Automatically inserts "AND tenant_id = $N" or "WHERE tenant_id = $N" into the query.
 *
 * @param query The SQL query string
 * @param params The query parameters
 * @param tenantId The tenant ID to scope the query to
 * @returns The modified query and parameters
 */
export const withTenant = (
  query: string,
  params: any[],
  tenantId: string
): { text: string; values: any[] } => {
  if (!tenantId) {
    throw new Error('Tenant ID is required for tenant-scoped queries');
  }

  const trimmedQuery = query.trim();

  // Regex to find the main WHERE clause.
  // We look for 'WHERE' that is NOT inside parentheses (subqueries) if possible,
  // but JS regex doesn't support recursive matching.
  // A safe approximation for typical app queries is to look for the first WHERE
  // that isn't part of a common sub-structure, or just use a robust heuristic.

  // Heuristic:
  // 1. Find the position of the first `WHERE` clause.
  // 2. Find the position of the first `GROUP BY`, `ORDER BY`, `LIMIT`, `OFFSET`, `HAVING`, `RETURNING`, `WINDOW`, `FOR UPDATE`
  //    that appears *after* the `WHERE` (or at all if no WHERE).

  const lowerQuery = trimmedQuery.toLowerCase();

  // List of clauses that end the WHERE section
  const clauses = [' group by ', ' order by ', ' limit ', ' offset ', ' having ', ' returning ', ' window ', ' for update ', ' for share '];

  let clauseIndex = -1;
  let firstClause = '';

  for (const clause of clauses) {
    const idx = lowerQuery.indexOf(clause);
    if (idx !== -1) {
      if (clauseIndex === -1 || idx < clauseIndex) {
        clauseIndex = idx;
        firstClause = clause;
      }
    }
  }

  const whereIndex = lowerQuery.indexOf(' where ');

  let newQuery = trimmedQuery;
  const newParams = [...params, tenantId];
  const paramIndex = newParams.length;

  if (whereIndex !== -1 && (clauseIndex === -1 || whereIndex < clauseIndex)) {
    // WHERE exists and is before any other clause
    // We insert " AND tenant_id = $N" immediately after "WHERE " + condition
    // But determining the end of the condition is hard without parsing.
    // However, since we know where the next clause starts (clauseIndex),
    // we can append to the end of the WHERE section.

    if (clauseIndex !== -1) {
      // Insert before the next clause
      const preClause = newQuery.substring(0, clauseIndex);
      const postClause = newQuery.substring(clauseIndex);
      newQuery = `${preClause} AND tenant_id = $${paramIndex}${postClause}`;
    } else {
      // No following clause, append to end
      // Check if the query ends with a semicolon
      if (newQuery.endsWith(';')) {
        newQuery = newQuery.slice(0, -1) + ` AND tenant_id = $${paramIndex};`;
      } else {
        newQuery += ` AND tenant_id = $${paramIndex}`;
      }
    }
  } else {
    // No WHERE clause (or it's in a subquery/later part we ignore for simplicity)
    // We need to insert WHERE tenant_id = $N

    if (clauseIndex !== -1) {
       // Insert before the clause
       const preClause = newQuery.substring(0, clauseIndex);
       const postClause = newQuery.substring(clauseIndex);
       newQuery = `${preClause} WHERE tenant_id = $${paramIndex}${postClause}`;
    } else {
       // No clauses, append to end
       if (newQuery.endsWith(';')) {
         newQuery = newQuery.slice(0, -1) + ` WHERE tenant_id = $${paramIndex};`;
       } else {
         newQuery += ` WHERE tenant_id = $${paramIndex}`;
       }
    }
  }

  return {
    text: newQuery,
    values: newParams
  };
};

/**
 * Execute a tenant-scoped query
 */
export const queryForTenant = async (
  pool: ManagedPostgresPool,
  tenantId: string,
  query: string,
  params: any[] = []
): Promise<QueryResult> => {
  const scoped = withTenant(query, params, tenantId);
  return pool.query(scoped.text, scoped.values);
};
