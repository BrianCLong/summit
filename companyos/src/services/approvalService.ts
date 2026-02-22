import { Pool } from 'pg';

export interface ApprovalRequest {
  id?: string;
  tenantId: string;
  requestId: string;
  resourceType: string;
  actionType: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED';
  requestedBy: string;
  requiredRoles: string[];
  approverId?: string;
  rationale?: string;
  metadata: any;
  createdAt?: Date;
  decidedAt?: Date;
}

export class ApprovalService {
  constructor(private db: Pool) {}

  async createApproval(input: Omit<ApprovalRequest, 'id' | 'status' | 'createdAt'>): Promise<ApprovalRequest> {
    const query = \`
      INSERT INTO companyos.approvals (
        tenant_id, request_id, resource_type, action_type, status,
        requested_by, required_roles, metadata
      ) VALUES ($1, $2, $3, $4, 'PENDING', $5, $6, $7)
      RETURNING *
    \`;
    const values = [
      input.tenantId, input.requestId, input.resourceType, input.actionType,
      input.requestedBy, input.requiredRoles, JSON.stringify(input.metadata)
    ];
    const res = await this.db.query(query, values);
    return this.mapRowToApproval(res.rows[0]);
  }

  async getApproval(id: string): Promise<ApprovalRequest | null> {
    const res = await this.db.query('SELECT * FROM companyos.approvals WHERE id = $1', [id]);
    return res.rows[0] ? this.mapRowToApproval(res.rows[0]) : null;
  }

  async listApprovals(tenantId?: string): Promise<ApprovalRequest[]> {
    let query = 'SELECT * FROM companyos.approvals';
    const values: any[] = [];
    if (tenantId) {
      query += ' WHERE tenant_id = $1';
      values.push(tenantId);
    }
    query += ' ORDER BY created_at DESC';
    const res = await this.db.query(query, values);
    return res.rows.map((row: any) => this.mapRowToApproval(row));
  }

  async decideApproval(id: string, status: 'APPROVED' | 'DENIED', approverId: string, rationale: string): Promise<ApprovalRequest | null> {
    const query = \`
      UPDATE companyos.approvals
      SET status = $2, approver_id = $3, rationale = $4, decided_at = NOW(), updated_at = NOW()
      WHERE id = $1
      RETURNING *
    \`;
    const res = await this.db.query(query, [id, status, approverId, rationale]);
    return res.rows[0] ? this.mapRowToApproval(res.rows[0]) : null;
  }

  private mapRowToApproval(row: any): ApprovalRequest {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      requestId: row.request_id,
      resourceType: row.resource_type,
      actionType: row.action_type,
      status: row.status,
      requestedBy: row.requested_by,
      requiredRoles: row.required_roles,
      approverId: row.approver_id,
      rationale: row.rationale,
      metadata: row.metadata,
      createdAt: row.created_at,
      decidedAt: row.decided_at
    };
  }
}
