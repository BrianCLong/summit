/**
 * Row-Level Security (RLS) Engine
 *
 * Applies row-level filters based on user context
 */

import { Pool } from 'pg';

export interface RLSPolicy {
  policyId: string;
  tableName: string;
  policyName: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'ALL';
  roles: string[];
  predicate: string; // SQL WHERE clause
  enabled: boolean;
}

export class RowLevelSecurity {
  constructor(private pool: Pool) {}

  /**
   * Create RLS policy
   */
  async createPolicy(policy: Omit<RLSPolicy, 'policyId'>): Promise<string> {
    const result = await this.pool.query(
      `
      INSERT INTO warehouse_rls_policies (
        table_name, policy_name, operation, roles, predicate, enabled
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING policy_id
    `,
      [
        policy.tableName,
        policy.policyName,
        policy.operation,
        JSON.stringify(policy.roles),
        policy.predicate,
        policy.enabled,
      ],
    );

    // Create PostgreSQL policy
    await this.applyPolicyToDatabase(policy);

    return result.rows[0].policy_id;
  }

  /**
   * Apply policy to PostgreSQL
   */
  private async applyPolicyToDatabase(
    policy: Omit<RLSPolicy, 'policyId'>,
  ): Promise<void> {
    // Enable RLS on table
    await this.pool.query(`
      ALTER TABLE ${policy.tableName} ENABLE ROW LEVEL SECURITY
    `);

    // Create policy
    await this.pool.query(`
      CREATE POLICY ${policy.policyName}
      ON ${policy.tableName}
      FOR ${policy.operation}
      TO ${policy.roles.join(', ')}
      USING (${policy.predicate})
    `);
  }

  /**
   * Get applicable policies for user query
   */
  async getPoliciesForQuery(
    tableName: string,
    userId: string,
    operation: string,
  ): Promise<RLSPolicy[]> {
    const result = await this.pool.query(
      `
      SELECT p.*
      FROM warehouse_rls_policies p
      JOIN warehouse_user_roles ur ON
        ur.role_id::text = ANY(SELECT jsonb_array_elements_text(p.roles::jsonb))
      WHERE p.table_name = $1
        AND (p.operation = $2 OR p.operation = 'ALL')
        AND p.enabled = true
        AND ur.user_id = $3
    `,
      [tableName, operation, userId],
    );

    return result.rows.map((row) => ({
      policyId: row.policy_id,
      tableName: row.table_name,
      policyName: row.policy_name,
      operation: row.operation,
      roles: JSON.parse(row.roles),
      predicate: row.predicate,
      enabled: row.enabled,
    }));
  }

  /**
   * Apply RLS to query
   */
  async applyRLSToQuery(
    sql: string,
    userId: string,
    userContext: Record<string, any>,
  ): Promise<string> {
    // Parse SQL to extract tables
    const tables = this.extractTables(sql);

    // Get policies for each table
    const allPredicates: string[] = [];

    for (const table of tables) {
      const policies = await this.getPoliciesForQuery(table, userId, 'SELECT');

      for (const policy of policies) {
        // Substitute user context variables
        let predicate = policy.predicate;
        for (const [key, value] of Object.entries(userContext)) {
          predicate = predicate.replace(`{${key}}`, `'${value}'`);
        }
        allPredicates.push(`(${predicate})`);
      }
    }

    if (allPredicates.length === 0) return sql;

    // Add predicates to WHERE clause
    const rlsFilter = allPredicates.join(' AND ');

    if (sql.toLowerCase().includes('where')) {
      return sql.replace(
        /WHERE/i,
        `WHERE ${rlsFilter} AND `,
      );
    } else {
      return sql.replace(
        /FROM\s+\w+/i,
        (match) => `${match} WHERE ${rlsFilter}`,
      );
    }
  }

  /**
   * Extract table names from SQL
   */
  private extractTables(sql: string): string[] {
    const tables: string[] = [];
    const fromRegex = /FROM\s+(\w+)/gi;
    const joinRegex = /JOIN\s+(\w+)/gi;

    let match;
    while ((match = fromRegex.exec(sql)) !== null) {
      tables.push(match[1]);
    }
    while ((match = joinRegex.exec(sql)) !== null) {
      tables.push(match[1]);
    }

    return [...new Set(tables)];
  }

  /**
   * Initialize RLS tables
   */
  async initializeTables(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS warehouse_rls_policies (
        policy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        table_name VARCHAR(255) NOT NULL,
        policy_name VARCHAR(255) NOT NULL,
        operation VARCHAR(20) NOT NULL,
        roles JSONB NOT NULL,
        predicate TEXT NOT NULL,
        enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (table_name, policy_name)
      );

      CREATE INDEX IF NOT EXISTS idx_rls_table ON warehouse_rls_policies(table_name);
      CREATE INDEX IF NOT EXISTS idx_rls_roles ON warehouse_rls_policies USING GIN(roles);
    `);
  }

  /**
   * Example policies
   */
  async createExamplePolicies(): Promise<void> {
    // Department-based access
    await this.createPolicy({
      tableName: 'sales_data',
      policyName: 'department_access',
      operation: 'SELECT',
      roles: ['analyst'],
      predicate: "department = '{user.department}'",
      enabled: true,
    });

    // Region-based access
    await this.createPolicy({
      tableName: 'customer_data',
      policyName: 'region_access',
      operation: 'SELECT',
      roles: ['regional_manager'],
      predicate: "region IN ({user.regions})",
      enabled: true,
    });

    // Time-based access
    await this.createPolicy({
      tableName: 'financial_data',
      policyName: 'historical_access',
      operation: 'SELECT',
      roles: ['analyst'],
      predicate: "fiscal_year >= EXTRACT(YEAR FROM CURRENT_DATE) - 2",
      enabled: true,
    });
  }
}
