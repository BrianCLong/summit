export class JobsRepo {
  constructor(private pool: any) {}
  async insert(tenantId: string, row: any) {
    const q = `INSERT INTO ai_jobs (id, tenant_id, kind, status, created_at, meta) VALUES ($1,$2,$3,$4,$5,$6)`;
    await this.withTenant(tenantId, (client: any) =>
      client.query(q, [
        row.id,
        tenantId,
        row.kind,
        row.status,
        row.createdAt,
        row.meta || {},
      ]),
    );
  }

  async update(tenantId: string, id: string, patch: any) {
    const q = `UPDATE ai_jobs SET status=COALESCE($3,status), finished_at=COALESCE($4,finished_at), error=COALESCE($5,error) WHERE id=$1 AND tenant_id=$2`;
    await this.withTenant(tenantId, (client: any) =>
      client.query(q, [id, tenantId, patch.status, patch.finishedAt, patch.error]),
    );
  }

  async findById(tenantId: string, id: string) {
    const { rows } = await this.withTenant(tenantId, (client: any) =>
      client.query(`SELECT * FROM ai_jobs WHERE id=$1 AND tenant_id=$2`, [
        id,
        tenantId,
      ]),
    );
    return rows[0];
  }

  private async withTenant<T>(
    tenantId: string,
    fn: (client: any) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('SET LOCAL app.current_tenant = $1', [tenantId]);
      return await fn(client);
    } finally {
      client.release();
    }
  }
}
