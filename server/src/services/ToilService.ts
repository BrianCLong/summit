import { getPostgresPool } from '../db/postgres.js';

interface ToilEntryInput {
  userId?: string;
  category: string;
  description?: string;
  durationMinutes: number;
  severity: string;
  tenantId: string;
}

interface ToilExceptionInput {
  processName: string;
  owner: string;
  justification: string;
  expiryDate: Date | string;
  tenantId: string;
}

export class ToilService {
  private static instance: ToilService;

  public static getInstance(): ToilService {
    if (!ToilService.instance) {
      ToilService.instance = new ToilService();
    }
    return ToilService.instance;
  }

  async logToil(input: ToilEntryInput) {
    const pool = getPostgresPool();
    const query = `
      INSERT INTO toil_entries (user_id, category, description, duration_minutes, severity, tenant_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    // Ensure userId is handled as nullable UUID (pg driver handles null)
    const values = [
      input.userId || null,
      input.category,
      input.description || null,
      input.durationMinutes,
      input.severity,
      input.tenantId
    ];
    const result = await pool.write(query, values);
    return result.rows[0];
  }

  async getStats(tenantId: string) {
    const pool = getPostgresPool();
    // Example stats: Total minutes per category
    const query = `
      SELECT category, SUM(duration_minutes) as total_minutes, COUNT(*) as count
      FROM toil_entries
      WHERE tenant_id = $1
      GROUP BY category
    `;
    const result = await pool.read(query, [tenantId]);
    return result.rows;
  }

  async registerException(input: ToilExceptionInput) {
    const pool = getPostgresPool();
    const query = `
      INSERT INTO toil_exceptions (process_name, owner, justification, expiry_date, tenant_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [
      input.processName,
      input.owner,
      input.justification,
      input.expiryDate,
      input.tenantId
    ];
    const result = await pool.write(query, values);
    return result.rows[0];
  }

  async getExceptions(tenantId: string) {
    const pool = getPostgresPool();
    const query = `
      SELECT * FROM toil_exceptions
      WHERE tenant_id = $1 AND status = 'active'
      ORDER BY expiry_date ASC
    `;
    const result = await pool.read(query, [tenantId]);
    return result.rows;
  }
}
