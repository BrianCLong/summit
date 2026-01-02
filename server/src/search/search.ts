import SemanticSearchService from '../services/SemanticSearchService.js';
import { getNeo4jDriver, getPostgresPool } from '../config/database.js';

type SearchInput = {
  q?: string;
  facets?: Record<string, string[]>;
  time?: { from?: string; to?: string };
  geo?: { lat: number; lon: number; radiusKm: number };
  semantic?: boolean;
  graphExpand?: boolean;
};

export async function searchAll(input: SearchInput) {
  // Use shared pool
  const managedPg = getPostgresPool();
  // SemanticSearchService expects a raw Pool for some operations or will use its own factory if not provided.
  // We pass the raw pool from the managed pool to reuse connections.
  const semanticService = new SemanticSearchService({ pool: managedPg.pool });

  try {
    // Semantic Search with Fallback
    if (input.semantic && input.q) {
      try {
        // Parallel search: cases + docs
        const [caseResults, docResults] = await Promise.all([
          semanticService.searchCases(
            input.q,
            {
              status: input.facets?.status,
              dateFrom: input.time?.from,
              dateTo: input.time?.to,
            },
            100,
          ),
          semanticService.searchDocs(input.q, 10)
        ]);

        // Merge or just return cases for now, but log docs found
        // For the "Unified Search Layer" requirement, we ideally want to return mix.
        // Since the return type is tied to 'cases', we'll append docs as special items or just rely on cases for now if strict typing.
        // Given existing return signature is just `expandGraph` on rows, let's stick to cases for the main return
        // but adding docs if the caller supported it would be next step.
        // For this task, "Build a single search layer" implies ability to find them.
        // We will inject them if the input asks or just as debug for now to prove it works.
        // Actually, let's just use cases results to not break contract, but this proves the layer is ready.

        // If we got good results, return them (possibly expanding graph later)
        if (caseResults.length > 0 || docResults.length > 0) {
          // Map to expected format
          const rows: any[] = caseResults.map((r: any) => ({
            id: r.id,
            title: r.title,
            status: r.status,
            created_at: r.created_at,
            type: 'case'
          }));

          // Append docs with path as ID
          docResults.forEach((d: any) => {
            rows.push({
              id: d.path,
              title: d.title,
              status: 'published',
              created_at: new Date(),
              type: 'doc',
              metadata: d.metadata
            });
          });

          return expandGraph(rows, input.graphExpand);
        }
      } catch (e: any) {
        console.warn('Semantic search failed, falling back to keyword search', e);
      }
    }

    // Keyword Search Fallback
    const driver = getNeo4jDriver();

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
    const base = await managedPg.query(sql, Object.values(params));

    // Keyword search expansion uses the local driver, but we want to use the helper.
    // The helper creates its own driver.
    // await driver.close(); // Shared driver, do not close

    return expandGraph(base.rows, input.graphExpand);
  } finally {
    await semanticService.close();
    // await pg.end(); // Shared pool, do not close
  }
}

// Separate function for graph expansion to be reused by semantic and keyword search
async function expandGraph(rows: any[], expand: boolean | undefined) {
  if (!expand || !rows.length) {
    return { results: rows, graph: [] };
  }

  // Use shared driver
  const driver = getNeo4jDriver();

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
    graph = res.records.map((r: any) => ({
      id: r.get('id'),
      iocs: r.get('iocs'),
    }));
  } catch (e: any) {
    console.error("Graph expansion failed", e);
  } finally {
    await session.close();
    // await driver.close(); // Shared driver, do not close
  }

  return { results: rows, graph };
}

export { AdvancedSearchEngine, createAdvancedSearchEngine } from './advanced-search-engine.js';
