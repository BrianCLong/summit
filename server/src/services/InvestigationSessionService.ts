import { TenantId } from '../graph/types';
import { getPostgresPool } from '../db/postgres';
import logger from '../utils/logger';

export interface InvestigationSession {
  id: string;
  tenantId: TenantId;
  name: string;
  createdByPrincipalId: string;
  graphState: {
    focusedEntityIds: string[];
    visibleEdges: string[];
    pinnedNotes: { entityId?: string; text: string }[];
  };
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>;
}

export class InvestigationSessionService {
  private static instance: InvestigationSessionService;

  public static getInstance(): InvestigationSessionService {
    if (!InvestigationSessionService.instance) {
      InvestigationSessionService.instance = new InvestigationSessionService();
    }
    return InvestigationSessionService.instance;
  }

  async createSession(
    tenantId: TenantId,
    name: string,
    principalId: string,
    initialState: Partial<InvestigationSession['graphState']> = {},
    metadata: Record<string, unknown> = {}
  ): Promise<InvestigationSession> {
    const pool = getPostgresPool();
    const query = `
      INSERT INTO investigation_sessions (tenant_id, name, created_by_principal_id, graph_state, metadata)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [
      tenantId,
      name,
      principalId,
      JSON.stringify(initialState),
      JSON.stringify(metadata),
    ];

    try {
      const res = await pool.query(query, values);
      return this.mapRow(res.rows[0]);
    } catch (err: any) {
      logger.error('Error creating investigation session', err);
      throw err;
    }
  }

  async getSession(tenantId: TenantId, id: string): Promise<InvestigationSession | null> {
    const pool = getPostgresPool();
    const query = `
      SELECT * FROM investigation_sessions
      WHERE id = $1 AND tenant_id = $2
    `;
    const res = await pool.query(query, [id, tenantId]);
    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  async listSessions(tenantId: TenantId, principalId?: string, limit = 20): Promise<InvestigationSession[]> {
    const pool = getPostgresPool();
    let query = `SELECT * FROM investigation_sessions WHERE tenant_id = $1`;
    const values: any[] = [tenantId];

    if (principalId) {
      query += ` AND created_by_principal_id = $2`;
      values.push(principalId);
    }

    query += ` ORDER BY updated_at DESC LIMIT $${values.length + 1}`;
    values.push(limit);

    const res = await pool.query(query, values);
    return res.rows.map(this.mapRow);
  }

  async updateSession(
    tenantId: TenantId,
    id: string,
    updates: {
      name?: string;
      graphState?: Partial<InvestigationSession['graphState']>;
      metadata?: Record<string, unknown>;
    }
  ): Promise<InvestigationSession | null> {
    const pool = getPostgresPool();

    // Build dynamic update
    const setClauses: string[] = [];
    const values: any[] = [id, tenantId];
    let valIdx = 3;

    if (updates.name) {
      setClauses.push(`name = $${valIdx++}`);
      values.push(updates.name);
    }
    if (updates.graphState) {
      setClauses.push(`graph_state = $${valIdx++}`);
      values.push(JSON.stringify(updates.graphState));
    }
    if (updates.metadata) {
      setClauses.push(`metadata = $${valIdx++}`);
      values.push(JSON.stringify(updates.metadata));
    }

    if (setClauses.length === 0) return this.getSession(tenantId, id);

    setClauses.push(`updated_at = NOW()`);

    const query = `
      UPDATE investigation_sessions
      SET ${setClauses.join(', ')}
      WHERE id = $1 AND tenant_id = $2
      RETURNING *
    `;

    try {
      const res = await pool.query(query, values);
      if (res.rows.length === 0) return null;
      return this.mapRow(res.rows[0]);
    } catch (err: any) {
      logger.error('Error updating investigation session', err);
      throw err;
    }
  }

  private mapRow(row: any): InvestigationSession {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      createdByPrincipalId: row.created_by_principal_id,
      graphState: row.graph_state, // pg driver automatically parses jsonb
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
