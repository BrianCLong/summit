export class JobsRepo {
  constructor(private pool: any){}
  async insert(row: any){
    const q = `INSERT INTO ai_jobs (id, kind, status, created_at, meta) VALUES ($1,$2,$3,$4,$5)`;
    await this.pool.query(q, [row.id, row.kind, row.status, row.createdAt, row.meta || {}]);
  }
  async update(id: string, patch: any){
    const q = `UPDATE ai_jobs SET status=COALESCE($2,status), finished_at=COALESCE($3,finished_at), error=COALESCE($4,error) WHERE id=$1`;
    await this.pool.query(q, [id, patch.status, patch.finishedAt, patch.error]);
  }
  async findById(id: string){
    const { rows } = await this.pool.query(`SELECT * FROM ai_jobs WHERE id=$1`, [id]);
    return rows[0];
  }
}