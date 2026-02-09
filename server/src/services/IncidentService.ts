import { randomUUID } from 'crypto';
import { pg } from '../db/pg';

export interface Incident {
  id: string;
  tenant_id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  source?: string;
  ticket_ref?: any;
  created_at: Date;
  updated_at: Date;
}

export class IncidentService {
  static async create(data: {
    tenant_id: string;
    title: string;
    description?: string;
    severity: string;
    source?: string;
  }): Promise<Incident> {
    const id = randomUUID();
    const incident = await pg.oneOrNone(
      `INSERT INTO incidents (
        id, tenant_id, title, description, severity, source, status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'open')
      RETURNING *`,
      [
        id,
        data.tenant_id,
        data.title,
        data.description || '',
        data.severity,
        data.source,
      ],
      { tenantId: data.tenant_id }
    );

    if (!incident) {
        throw new Error('Failed to create incident');
    }
    return incident;
  }

  static async get(tenantId: string, id: string): Promise<Incident | null> {
    return pg.oneOrNone(
      `SELECT * FROM incidents WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId],
      { tenantId }
    );
  }

  static async updateTicketRef(tenantId: string, id: string, ticketRef: any) {
    return pg.oneOrNone(
        `UPDATE incidents SET ticket_ref = $1, updated_at = NOW()
         WHERE id = $2 AND tenant_id = $3 RETURNING *`,
        [ticketRef, id, tenantId],
        { tenantId }
    );
  }
}
