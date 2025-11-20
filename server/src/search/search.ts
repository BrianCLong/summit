import { Pool } from 'pg';
import neo4j from 'neo4j-driver';
import { search } from './engine';
import { SearchQuery } from './types';
import pino from 'pino';

const logger = pino({ name: 'SearchService' });

type SearchInput = {
  q?: string;
  facets?: Record<string, string[]>;
  time?: { from?: string; to?: string };
  geo?: { lat: number; lon: number; radiusKm: number };
  semantic?: boolean;
  graphExpand?: boolean;
};

export async function searchAll(input: SearchInput) {
  let rows: any[] = [];
  let suggestions: any[] = [];

  // Try Elasticsearch first
  try {
    const query: SearchQuery = {
      query: input.q || '',
      filters: {},
      searchType: input.semantic ? 'semantic' : 'fulltext',
      pagination: { page: 1, size: 100 },
    };

    if (input.time?.from) {
      query.filters!.dateRange = {
        ...(query.filters!.dateRange || { field: 'createdAt' }),
        field: 'createdAt',
        from: input.time.from,
      };
    }
    if (input.time?.to) {
      query.filters!.dateRange = {
        ...(query.filters!.dateRange || { field: 'createdAt' }),
        field: 'createdAt',
        to: input.time.to,
      };
    }
    if (input.facets?.status?.length) {
      query.filters!.custom = { status: input.facets.status };
    }

    const esResults = await search(query);
    rows = esResults.results.map((r) => ({
      id: r.id,
      title: r.source.title,
      status: r.source.status,
      created_at: r.source.createdAt,
      description: r.source.description,
    }));
    suggestions = esResults.suggestions || [];
  } catch (err) {
    logger.warn({ err }, 'Elasticsearch failed, falling back to Postgres');

    // Fallback to Postgres
    const pg = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
      const where: string[] = [];
      const params: any = {};
      let paramIdx = 1;

      if (input.q) {
        where.push(
          `to_tsvector('english', title || ' ' || coalesce(description,'')) @@ plainto_tsquery('english', $${paramIdx++})`,
        );
        params.q = input.q;
      }
      if (input.facets?.status?.length) {
        where.push(`status = ANY($${paramIdx++})`);
        params.status = input.facets.status;
      }
      if (input.time?.from) {
        where.push(`created_at >= $${paramIdx++}`);
        params.from = input.time.from;
      }
      if (input.time?.to) {
        where.push(`created_at <= $${paramIdx++}`);
        params.to = input.time.to;
      }
      const sql = `SELECT id, title, status, created_at FROM cases ${
        where.length ? 'WHERE ' + where.join(' AND ') : ''
      } ORDER BY created_at DESC LIMIT 100`;

      // Map params object to array based on insertion order is tricky if not careful.
      // Object.values order is not guaranteed strictly speaking but usually works.
      // Better to use array for params.
      const values = [];
      if (input.q) values.push(input.q);
      if (input.facets?.status?.length) values.push(input.facets.status);
      if (input.time?.from) values.push(input.time.from);
      if (input.time?.to) values.push(input.time.to);

      const base = await pg.query(sql, values);
      rows = base.rows;
    } finally {
      await pg.end();
    }
  }

  // Optionally expand to graph neighborhood for returned cases
  let graph: any[] = [];
  const driver = neo4j.driver(
    process.env.NEO4J_URI!,
    neo4j.auth.basic(
      process.env.NEO4J_USER!,
      process.env.NEO4J_PASSWORD || process.env.NEO4J_PASS || '',
    ),
  );

  if (input.graphExpand && rows.length) {
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
      logger.error({ err: e }, 'Neo4j expansion failed');
    } finally {
      await session.close();
    }
  }

  await driver.close();
  return { results: rows, graph, suggestions };
}
