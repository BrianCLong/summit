export class FeedbackRepo {
  constructor(private pool: any){}
  async insert(row: any){
    const q = `INSERT INTO ml_feedback (id, insight_id, decision, created_at) VALUES ($1,$2,$3,$4)`;
    await this.pool.query(q, [row.id, row.insightId, row.decision, row.createdAt]);
  }
  
  async findByInsight(insightId: string){
    const { rows } = await this.pool.query(
      `SELECT * FROM ml_feedback WHERE insight_id = $1 ORDER BY created_at DESC`, 
      [insightId]
    );
    return rows;
  }
  
  async getDecisionMetrics(startDate?: string, endDate?: string){
    let whereClause = '';
    const params: any[] = [];
    
    if (startDate) {
      params.push(startDate);
      whereClause += `WHERE created_at >= $${params.length}`;
    }
    
    if (endDate) {
      params.push(endDate);
      whereClause += whereClause ? ` AND created_at <= $${params.length}` : `WHERE created_at <= $${params.length}`;
    }
    
    const { rows } = await this.pool.query(
      `SELECT decision, COUNT(*) as count FROM ml_feedback ${whereClause} GROUP BY decision`, 
      params
    );
    
    return rows.reduce((acc, row) => {
      acc[row.decision] = parseInt(row.count);
      return acc;
    }, {});
  }
}