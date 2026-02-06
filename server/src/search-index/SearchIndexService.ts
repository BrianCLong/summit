import MiniSearch from 'minisearch';
import { SearchableItem, SearchQuery, SearchResult } from './types.js';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger.js';

const INDEX_FILE_PATH = path.join(process.cwd(), 'storage', 'search_index.json');

export class SearchIndexService {
  private static instance: SearchIndexService;
  private miniSearch: MiniSearch<SearchableItem>;
  private isDirty: boolean = false;
  private saveInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.miniSearch = new MiniSearch({
      fields: ['content', 'tags', 'source', 'type'], // Fields to index
      storeFields: ['id', 'type', 'caseId', 'tags', 'source', 'createdAt', 'content', 'originalObject'], // Fields to return
      searchOptions: {
        boost: { type: 2, tags: 1.5 },
        fuzzy: 0.2,
        prefix: true
      },
      extractField: (document: SearchableItem, fieldName: string) => {
        // Access nested fields if necessary
        const record = document as unknown as Record<string, unknown>;
        return record[fieldName];
      }
    });

    this.loadIndex();

    // Periodically save if dirty (simple persistence)
    this.saveInterval = setInterval(() => {
      if (this.isDirty) {
        this.saveIndex();
      }
    }, 5000);
  }

  public static getInstance(): SearchIndexService {
    if (!SearchIndexService.instance) {
      SearchIndexService.instance = new SearchIndexService();
    }
    return SearchIndexService.instance;
  }

  // Hook for Entity Upsert
  public async onEntityUpsert(entity: Record<string, unknown>) {
    if (process.env.SEARCH_ENABLED !== 'true') return;

    // Map entity to SearchableItem
    // Attempt to extract caseId from properties if available
    const record = entity as Record<string, unknown>;
    const context = record.context as Record<string, unknown> | undefined;
    const properties = record.properties as Record<string, unknown> | undefined;
    const caseId = (record.caseId || context?.caseId || properties?.caseId || 'global') as string;

    const item: SearchableItem = {
      id: record.id as string,
      type: 'Entity',
      caseId: caseId,
      content: `${record.type ?? ''} ${record.value ?? ''} ${record.label ?? ''} ${record.name ?? ''}`.trim(),
      tags: (record.tags as string[] | undefined) ?? [],
      source: 'graph-store',
      createdAt: (record.createdAt as string | undefined) ?? new Date().toISOString(),
      originalObject: entity
    };

    this.ingest(item);
  }

  // Hook for Claim Upsert
  public async onClaimUpsert(claim: Record<string, unknown>) {
    if (process.env.SEARCH_ENABLED !== 'true') return;

    const record = claim as Record<string, unknown>;
    const context = record.context as Record<string, unknown> | undefined;
    const caseId = (context?.caseId ?? 'global') as string;

    const item: SearchableItem = {
      id: record.id as string,
      type: 'Claim',
      caseId: caseId,
      content: `${record.claimType ?? ''} ${record.statement ?? ''} ${JSON.stringify(record.subjects ?? [])}`.trim(),
      tags: (record.tags as string[] | undefined) ?? [],
      source: 'provenance-ledger',
      createdAt: (record.createdAt as string | undefined) ?? new Date().toISOString(),
      originalObject: claim
    };

    this.ingest(item);
  }

  public ingest(item: SearchableItem) {
    if (!this.miniSearch.has(item.id)) {
      this.miniSearch.add(item);
    } else {
      this.miniSearch.replace(item);
    }
    this.isDirty = true;
  }

  public search(query: SearchQuery): SearchResult[] {
    if (!query.caseId) {
      throw new Error("caseId is required");
    }

    const opts = {
      filter: (result: SearchableItem) => {
        // Filter by caseId
        if (result.caseId !== query.caseId) return false;

        // Apply other filters
        if (query.filters) {
          if (query.filters.type && query.filters.type.length > 0 && !query.filters.type.includes(result.type)) return false;
          if (query.filters.tags && query.filters.tags.length > 0) {
            // check intersection
            const hasTag = query.filters.tags.some(t => result.tags && result.tags.includes(t));
            if (!hasTag) return false;
          }
          if (query.filters.source && query.filters.source.length > 0 && !query.filters.source.includes(result.source)) return false;

          if (query.filters.timeRange) {
            const created = new Date(result.createdAt).getTime();
            if (query.filters.timeRange.start && created < new Date(query.filters.timeRange.start).getTime()) return false;
            if (query.filters.timeRange.end && created > new Date(query.filters.timeRange.end).getTime()) return false;
          }
        }
        return true;
      },
      queries: [query.q],
    };

    const results = this.miniSearch.search(query.q, opts) as unknown as Array<SearchableItem & { score: number; match: Record<string, string[]> }>;

    // Pagination (manual slicing since minisearch returns all sorted by score)
    const limit = query.limit || 20;
    const offset = query.cursor || 0;
    const pagedResults = results.slice(offset, offset + limit);

    return pagedResults.map((r) => {
      // Generate snippet (simple substring for now, MiniSearch doesn't do full snippets out of box easily without raw access)
      // We stored content.
      const content = r.content || '';
      const snippet = content.length > 100 ? content.substring(0, 100) + '...' : content;

      return {
        objectRef: {
          id: r.id,
          type: r.type
        },
        score: r.score,
        snippet: snippet,
        matchedFields: Object.keys(r.match),
        item: r as SearchableItem // The full stored item
      };
    });
  }

  public async reindex(caseId?: string) {
    logger.info(`Reindexing triggered for caseId: ${caseId || 'all'}`);
    this.miniSearch.removeAll();

    // In a real production scenario, we would stream data from Neo4j/Postgres.
    // For this MVP, we will simulate a scan by logging.
    // Ideally, we would inject GraphStore and iterate over all entities.

    // Attempt to load from GraphStore if possible (using dynamic import or dependency injection)
    try {
      const { getNeo4jDriver } = await import('../db/neo4j.js');
      const driver = getNeo4jDriver();
      const session = driver.session();

      try {
        // Reindex Entities
        const entityQuery = caseId
          ? `MATCH (e:Entity) WHERE e.context.caseId = $caseId OR e.caseId = $caseId RETURN e`
          : `MATCH (e:Entity) RETURN e LIMIT 10000`; // Limit for safety

        const entityRes = await session.run(entityQuery, { caseId });
        for (const record of entityRes.records) {
          const node = record.get('e').properties;
          await this.onEntityUpsert(node);
        }

        // Reindex Claims
        const claimQuery = caseId
          ? `MATCH (c:Claim) WHERE c.context.caseId = $caseId RETURN c`
          : `MATCH (c:Claim) RETURN c LIMIT 10000`; // Limit for safety

        const claimRes = await session.run(claimQuery, { caseId });
        for (const record of claimRes.records) {
          const node = record.get('c').properties;
          // Need to parse JSON fields for Claims as they are stored as strings in Neo4j sometimes
          // Adjust based on schema. Assuming standard properties for now.
          // Ideally we use a mapper.
          await this.onClaimUpsert(node);
        }

        logger.info(`Reindexing completed. processed ${entityRes.records.length} entities and ${claimRes.records.length} claims.`);

      } finally {
        await session.close();
      }
    } catch (err: unknown) {
      logger.error('Reindexing failed to fetch data from DB', err);
    }

    this.isDirty = true;
  }

  private async saveIndex() {
    try {
      const json = JSON.stringify(this.miniSearch.toJSON());
      // Ensure dir exists
      const dir = path.dirname(INDEX_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      await fs.promises.writeFile(INDEX_FILE_PATH, json);
      this.isDirty = false;
    } catch (e: unknown) {
      logger.error('Failed to save search index', e);
    }
  }

  private loadIndex() {
    try {
      if (fs.existsSync(INDEX_FILE_PATH)) {
        const json = fs.readFileSync(INDEX_FILE_PATH, 'utf-8');
        this.miniSearch = MiniSearch.loadJSON(json, {
          fields: ['content', 'tags', 'source', 'type'],
          storeFields: ['id', 'type', 'caseId', 'tags', 'source', 'createdAt', 'content', 'originalObject'],
          searchOptions: {
            boost: { type: 2, tags: 1.5 },
            fuzzy: 0.2,
            prefix: true
          },
          extractField: (document: SearchableItem, fieldName: string) => {
            const record = document as unknown as Record<string, unknown>;
            return record[fieldName];
          }
        });
        logger.info('Search index loaded from disk.');
      }
    } catch (e: unknown) {
      logger.error('Failed to load search index', e);
    }
  }
}
