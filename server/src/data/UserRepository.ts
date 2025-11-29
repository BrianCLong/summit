import { getPostgresPool } from '../config/database';
import { Pool } from 'pg';

export class UserRepository {
  private pool: Pool;

  constructor() {
    this.pool = getPostgresPool();
  }

  /**
   * Gets the total number of active users.
   */
  async getActiveUserCount(): Promise<number> {
    const result = await this.pool.query('SELECT COUNT(*) FROM users WHERE is_active = TRUE');
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Gets the number of active users with MFA enabled.
   */
  async getMfaUserCount(): Promise<number> {
    const result = await this.pool.query('SELECT COUNT(*) FROM users WHERE is_active = TRUE AND mfa_enabled = TRUE');
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Gets a summary of the latest access reviews for each role.
   */
  async getAccessReviewSummary(startDate: Date, endDate: Date): Promise<any[]> {
    const query = `
      WITH latest_reviews AS (
        SELECT
          r.name as role,
          ar.completed_at,
          ar.status,
          ROW_NUMBER() OVER(PARTITION BY r.name ORDER BY ar.completed_at DESC) as rn
        FROM roles r
        JOIN user_roles ur ON r.id = ur.role_id
        JOIN access_reviews ar ON ur.last_review_id = ar.id
        WHERE ar.completed_at >= $1 AND ar.completed_at <= $2
      )
      SELECT
        lr.role,
        COUNT(ur.user_id) as user_count,
        MAX(lr.completed_at) as last_review_date,
        MAX(lr.status) as status
      FROM latest_reviews lr
      JOIN roles r ON lr.role = r.name
      JOIN user_roles ur ON r.id = ur.role_id
      WHERE lr.rn = 1
      GROUP BY lr.role
      ORDER BY lr.role;
    `;
    const result = await this.pool.query(query, [startDate, endDate]);
    return result.rows;
  }

  /**
   * Gets statistics on user deprovisioning timeliness.
   */
  async getDeprovisioningStats(startDate: Date, endDate: Date): Promise<{ total: number; within24h: number }> {
    // This query is a simplified simulation. A real implementation might compare
    // against an HR system's termination date. Here, we assume 'deactivated_at'
    // is the termination timestamp.
    const query = `
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (
          WHERE (deactivated_at - updated_at) <= interval '24 hours'
        ) as within_24h
      FROM users
      WHERE is_active = FALSE
        AND deactivated_at IS NOT NULL
        AND deactivated_at >= $1
        AND deactivated_at <= $2;
    `;
    const result = await this.pool.query(query, [startDate, endDate]);
    return {
      total: parseInt(result.rows[0].total, 10),
      within24h: parseInt(result.rows[0].within_24h, 10)
    };
  }
}
