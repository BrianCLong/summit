import { pg } from '../../db/pg.js';
import { Communication, CommsStatus, CommsTemplate, CommsTier } from '../types.js';

export interface ICommsRepo {
  createDraft(comm: Communication): Promise<Communication>;
  getCommunication(id: string): Promise<Communication | null>;
  getCommunications(filter?: { status?: CommsStatus; tier?: CommsTier }): Promise<Communication[]>;
  updateCommunication(comm: Communication): Promise<Communication>;

  createTemplate(template: CommsTemplate): Promise<CommsTemplate>;
  getTemplates(): Promise<CommsTemplate[]>;
}

export class PostgresCommsRepo implements ICommsRepo {
  async createDraft(comm: Communication): Promise<Communication> {
    const query = `
      INSERT INTO communications (
        id, title, content, tier, audience, status,
        author_id, created_at, updated_at, version
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    const params = [
      comm.id, comm.title, comm.content, comm.tier, comm.audience, comm.status,
      comm.authorId, comm.createdAt, comm.updatedAt, comm.version
    ];

    // Using simple query execution, assuming tables exist
    await pg.write(query, params);
    return comm;
  }

  async getCommunication(id: string): Promise<Communication | null> {
    const query = 'SELECT * FROM communications WHERE id = $1';
    const row = await pg.oneOrNone(query, [id]);
    if (!row) return null;
    return this.mapRowToCommunication(row);
  }

  async getCommunications(filter?: { status?: CommsStatus; tier?: CommsTier }): Promise<Communication[]> {
    let query = 'SELECT * FROM communications WHERE 1=1';
    const params: any[] = [];

    if (filter?.status) {
      params.push(filter.status);
      query += ` AND status = $${params.length}`;
    }
    if (filter?.tier) {
      params.push(filter.tier);
      query += ` AND tier = $${params.length}`;
    }

    query += ' ORDER BY created_at DESC';

    const rows = await pg.many(query, params);
    return rows.map(this.mapRowToCommunication);
  }

  async updateCommunication(comm: Communication): Promise<Communication> {
    const query = `
      UPDATE communications
      SET
        title = $2, content = $3, tier = $4, audience = $5,
        status = $6, approver_id = $7, published_at = $8,
        updated_at = $9, version = $10
      WHERE id = $1
      RETURNING *
    `;
    const params = [
      comm.id, comm.title, comm.content, comm.tier, comm.audience,
      comm.status, comm.approverId, comm.publishedAt, new Date(), comm.version
    ];

    await pg.write(query, params);
    return comm;
  }

  async createTemplate(template: CommsTemplate): Promise<CommsTemplate> {
    const query = `
      INSERT INTO comms_templates (
        id, name, tier, content_template, audience
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const params = [
      template.id, template.name, template.tier,
      template.contentTemplate, template.audience
    ];

    await pg.write(query, params);
    return template;
  }

  async getTemplates(): Promise<CommsTemplate[]> {
    const query = 'SELECT * FROM comms_templates';
    const rows = await pg.many(query);
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      tier: row.tier,
      contentTemplate: row.content_template,
      audience: row.audience
    }));
  }

  private mapRowToCommunication(row: any): Communication {
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      tier: row.tier,
      audience: row.audience,
      status: row.status,
      authorId: row.author_id,
      approverId: row.approver_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      publishedAt: row.published_at,
      version: row.version
    };
  }
}
