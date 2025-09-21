import { Pool } from 'pg';
import neo4j from 'neo4j-driver';

type SearchInput = {
  q?: string; facets?: Record<string,string[]>;
  time?: { from?: string; to?: string };
  geo?: { lat: number; lon: number; radiusKm: number };
  semantic?: boolean; graphExpand?: boolean;
};

export async function searchAll(input: SearchInput) {
  const pg = new Pool({ connectionString: process.env.DATABASE_URL });
  const driver = neo4j.driver(
    process.env.NEO4J_URI!,
    neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASSWORD || process.env.NEO4J_PASS || ''),
  );
  const where: string[] = []; const params: any = {};
  if (input.q) { where.push(`to_tsvector('english', title || ' ' || coalesce(description,'')) @@ plainto_tsquery('english', $1)`); params.q = input.q; }
  if (input.facets?.status?.length) { where.push(`status = ANY($2)`); params.status = input.facets.status; }
  if (input.time?.from) { where.push(`created_at >= $3`); params.from = input.time.from; }
  if (input.time?.to)   { where.push(`created_at <= $4`); params.to   = input.time.to; }
  const sql = `SELECT id, title, status, created_at FROM cases ${where.length? 'WHERE '+where.join(' AND '): ''} ORDER BY created_at DESC LIMIT 100`;
  const base = await pg.query(sql, Object.values(params));

  // Optionally expand to graph neighborhood for returned cases
  let graph: any[] = [];
  if (input.graphExpand && base.rows.length) {
    const ids = base.rows.map((r: any) => r.id);
    const session = driver.session();
    try {
      const res = await session.run(
        `MATCH (c:Case) WHERE c.id IN $ids
         OPTIONAL MATCH (c)-[:MENTIONS]->(i:IOC)
         RETURN c.id as id, collect({ ioc: i.value, type: i.type })[0..20] as iocs`,
        { ids }
      );
      graph = res.records.map(r => ({ id: r.get('id'), iocs: r.get('iocs') }));
    } finally {
      await session.close();
    }
  }

  await pg.end(); await driver.close();
  return { results: base.rows, graph };
}

