export class AuditRepo {
  constructor(private pool: any){}
  async insert(row: any){
    const q = `INSERT INTO audit_events (id, type, actor_id, created_at, meta) VALUES ($1,$2,$3,$4,$5)`;
    await this.pool.query(q, [row.id, row.type, row.actorId, row.createdAt, row.meta||{}]);
  }
  
  async findByType(type: string, limit: number = 100){
    const { rows } = await this.pool.query(
      `SELECT * FROM audit_events WHERE type = $1 ORDER BY created_at DESC LIMIT $2`, 
      [type, limit]
    );
    return rows;
  }
  
  async findByActor(actorId: string, limit: number = 100){
    const { rows } = await this.pool.query(
      `SELECT * FROM audit_events WHERE actor_id = $1 ORDER BY created_at DESC LIMIT $2`, 
      [actorId, limit]
    );
    return rows;
  }
  
  async findRecent(hours: number = 24, limit: number = 1000){
    const { rows } = await this.pool.query(
      `SELECT * FROM audit_events WHERE created_at > NOW() - INTERVAL '${hours} hours' ORDER BY created_at DESC LIMIT $1`, 
      [limit]
    );
    return rows;
  }
}