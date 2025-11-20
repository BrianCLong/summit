/**
 * Column-Level Access Control
 *
 * Controls which columns users can see based on their roles
 */

import { Pool } from 'pg';

export interface ColumnPolicy {
  policyId: string;
  tableName: string;
  columnName: string;
  allowedRoles: string[];
  maskingFunction?: string;
}

export class ColumnAccessControl {
  constructor(private pool: Pool) {}

  /**
   * Create column access policy
   */
  async createColumnPolicy(
    policy: Omit<ColumnPolicy, 'policyId'>,
  ): Promise<string> {
    const result = await this.pool.query(
      `
      INSERT INTO warehouse_column_policies (
        table_name, column_name, allowed_roles, masking_function
      )
      VALUES ($1, $2, $3, $4)
      RETURNING policy_id
    `,
      [
        policy.tableName,
        policy.columnName,
        JSON.stringify(policy.allowedRoles),
        policy.maskingFunction,
      ],
    );

    return result.rows[0].policy_id;
  }

  /**
   * Get accessible columns for user
   */
  async getAccessibleColumns(
    tableName: string,
    userRoles: string[],
  ): Promise<string[]> {
    // Get all columns
    const allColumns = await this.pool.query(
      `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = $1
    `,
      [tableName],
    );

    // Get restricted columns
    const restricted = await this.pool.query(
      `
      SELECT column_name, allowed_roles, masking_function
      FROM warehouse_column_policies
      WHERE table_name = $1
    `,
      [tableName],
    );

    const accessibleColumns: string[] = [];

    for (const col of allColumns.rows) {
      const columnName = col.column_name;
      const policy = restricted.rows.find((r) => r.column_name === columnName);

      if (!policy) {
        // No policy = accessible to all
        accessibleColumns.push(columnName);
      } else {
        const allowedRoles = JSON.parse(policy.allowed_roles);
        const hasAccess = userRoles.some((role) => allowedRoles.includes(role));

        if (hasAccess) {
          accessibleColumns.push(columnName);
        } else if (policy.masking_function) {
          // Can see masked version
          accessibleColumns.push(
            `${policy.masking_function}(${columnName}) as ${columnName}`,
          );
        }
      }
    }

    return accessibleColumns;
  }

  /**
   * Filter query columns based on access
   */
  async filterQueryColumns(
    sql: string,
    tableName: string,
    userRoles: string[],
  ): Promise<string> {
    const accessibleColumns = await this.getAccessibleColumns(
      tableName,
      userRoles,
    );

    // If SELECT *, replace with accessible columns
    if (sql.match(/SELECT\s+\*/i)) {
      return sql.replace(/SELECT\s+\*/i, `SELECT ${accessibleColumns.join(', ')}`);
    }

    // Otherwise, filter requested columns
    const requestedColumns = this.extractColumns(sql);
    const filtered = requestedColumns.filter((col) =>
      accessibleColumns.some((ac) => ac.includes(col)),
    );

    return sql.replace(
      /SELECT\s+.+?\s+FROM/i,
      `SELECT ${filtered.join(', ')} FROM`,
    );
  }

  private extractColumns(sql: string): string[] {
    const match = sql.match(/SELECT\s+(.+?)\s+FROM/i);
    if (!match) return [];

    return match[1]
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
  }

  /**
   * Initialize tables
   */
  async initializeTables(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS warehouse_column_policies (
        policy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        table_name VARCHAR(255) NOT NULL,
        column_name VARCHAR(255) NOT NULL,
        allowed_roles JSONB NOT NULL,
        masking_function VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (table_name, column_name)
      );

      CREATE INDEX IF NOT EXISTS idx_column_policies ON
        warehouse_column_policies(table_name, column_name);
    `);
  }

  /**
   * Example policies
   */
  async createExamplePolicies(): Promise<void> {
    // SSN visible only to HR
    await this.createColumnPolicy({
      tableName: 'employees',
      columnName: 'ssn',
      allowedRoles: ['hr_admin'],
      maskingFunction: "CONCAT('XXX-XX-', RIGHT(ssn, 4))",
    });

    // Salary visible to managers
    await this.createColumnPolicy({
      tableName: 'employees',
      columnName: 'salary',
      allowedRoles: ['manager', 'hr_admin'],
      maskingFunction: 'NULL',
    });

    // Credit card numbers
    await this.createColumnPolicy({
      tableName: 'transactions',
      columnName: 'credit_card',
      allowedRoles: ['finance_admin'],
      maskingFunction: "CONCAT('XXXX-XXXX-XXXX-', RIGHT(credit_card, 4))",
    });
  }
}
