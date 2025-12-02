import { Pool } from 'pg';
import neo4j from 'neo4j-driver';
import SemanticSearchService from '../services/SemanticSearchService.js';

type SearchInput = {
  q?: string;
  facets?: Record<string, string[]>;
  time?: { from?: string; to?: string };
  geo?: { lat: number; lon: number; radiusKm: number };
  semantic?: boolean;
  graphExpand?: boolean;
};

export async function searchAll(input: SearchInput) {
  const pg = new Pool({ connectionString: process.env.DATABASE_URL });

  // Semantic Search with Fallback
  if (input.semantic && input.q) {
    const semanticService = new SemanticSearchService();
    try {
      const results = await semanticService.searchCases(input.q, {
        status: input.facets?.status,
        dateFrom: input.time?.from,
        dateTo: input.time?.to,
      }, 100);

      // If we got good results, return them (possibly expanding graph later)
      if (results.length > 0) {
        // Map to expected format
        const rows = results.map(r => ({
          id: r.id,
          title: r.title,
          status: r.status,
          created_at: r.created_at
        }));

        await pg.end(); // close pg pool if we are done with it

        return expandGraph(rows, input.graphExpand);
      }
    } catch (e) {
      console.warn("Semantic search failed, falling back to keyword search", e);
    }
  }

  // Keyword Search Fallback
  const driver = neo4j.driver(
    process.env.NEO4J_URI!,
    neo4j.auth.basic(
      process.env.NEO4J_USER!,
      process.env.NEO4J_PASSWORD || process.env.NEO4J_PASS || '',
    ),
  );

  const where: string[] = [];
  const params: any = {};
  if (input.q) {
    where.push(
      `to_tsvector('english', title || ' ' || coalesce(description,'')) @@ plainto_tsquery('english', $1)`,
    );
    params.q = input.q;
  }
  if (input.facets?.status?.length) {
    where.push(`status = ANY($2)`);
    params.status = input.facets.status;
  }
  if (input.time?.from) {
    where.push(`created_at >= $3`);
    params.from = input.time.from;
  }
  if (input.time?.to) {
    where.push(`created_at <= $4`);
    params.to = input.time.to;
  }
  const sql = `SELECT id, title, status, created_at FROM cases ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC LIMIT 100`;
  const base = await pg.query(sql, Object.values(params));
  await pg.end();

  // Keyword search expansion uses the local driver, but we want to use the helper.
  // The helper creates its own driver.
  await driver.close();

  return expandGraph(base.rows, input.graphExpand);
}

// Separate function for graph expansion to be reused by semantic and keyword search
async function expandGraph(rows: any[], expand: boolean | undefined) {
  if (!expand || !rows.length) {
    return { results: rows, graph: [] };
  }

  // NOTE: Ideally we should use a shared driver instance from config/database.ts
  // but to minimize dependencies and keep this file self-contained as before,
  // we create a transient driver. In high-load, this should be refactored to use a singleton.
  const driver = neo4j.driver(
    process.env.NEO4J_URI!,
    neo4j.auth.basic(
      process.env.NEO4J_USER!,
      process.env.NEO4J_PASSWORD || process.env.NEO4J_PASS || '',
    ),
  );

  let graph: any[] = [];
  const ids = rows.map((r: any) => r.id);
  const session = driver.session();
  try {
    const res = await session.run(
      `MATCH (c:Case) WHERE c.id IN $ids
        OPTIONAL MATCH (c)-[:MENTIONS]->(i:IOC)
        RETURN c.id as id, collect({ ioc: i.value, type: i.type })[0..20] as iocs`,
      { ids },
    );
    graph = res.records.map((r) => ({
      id: r.get('id'),
      iocs: r.get('iocs'),
    }));
  } catch (e) {
    console.error("Graph expansion failed", e);
  } finally {
    await session.close();
    await driver.close();
  }

  return { results: rows, graph };
}
