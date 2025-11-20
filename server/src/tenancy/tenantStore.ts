import { getPostgresPool } from '../db/postgres.js';
import { Tenant } from './types.js';

export class TenantStore {
  private pool = getPostgresPool();

  async getTenantById(id: string): Promise<Tenant | null> {
    const result = await this.pool.read(
      'SELECT * FROM tenants WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRowToTenant(result.rows[0]);
  }

  async getTenantByName(name: string): Promise<Tenant | null> {
    const result = await this.pool.read(
      'SELECT * FROM tenants WHERE name = $1',
      [name]
    );
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRowToTenant(result.rows[0]);
  }

  async createTenant(tenant: Omit<Tenant, 'createdAt' | 'updatedAt'>): Promise<Tenant> {
    const result = await this.pool.write(
      `INSERT INTO tenants (id, name, status, tier, config)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [tenant.id, tenant.name, tenant.status, tenant.tier, JSON.stringify(tenant.config)]
    );
    return this.mapRowToTenant(result.rows[0]);
  }

  async updateTenant(id: string, updates: Partial<Tenant>): Promise<Tenant | null> {
    // Dynamic update query builder
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (updates.name) {
        fields.push(`name = $${idx++}`);
        values.push(updates.name);
    }
    if (updates.status) {
        fields.push(`status = $${idx++}`);
        values.push(updates.status);
    }
    if (updates.tier) {
        fields.push(`tier = $${idx++}`);
        values.push(updates.tier);
    }
    if (updates.config) {
        fields.push(`config = $${idx++}`);
        values.push(JSON.stringify(updates.config));
    }

    if (fields.length === 0) {
        return this.getTenantById(id);
    }

    values.push(id);
    const query = `UPDATE tenants SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`;

    const result = await this.pool.write(query, values);
    if (result.rows.length === 0) {
        return null;
    }
    return this.mapRowToTenant(result.rows[0]);
  }

  private mapRowToTenant(row: any): Tenant {
    return {
      id: row.id,
      name: row.name,
      status: row.status,
      tier: row.tier,
      config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
