"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchIndexService = void 0;
const minisearch_1 = __importDefault(require("minisearch"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const INDEX_FILE_PATH = path_1.default.join(process.cwd(), 'storage', 'search_index.json');
class SearchIndexService {
    static instance;
    miniSearch;
    isDirty = false;
    saveInterval = null;
    constructor() {
        this.miniSearch = new minisearch_1.default({
            fields: ['content', 'tags', 'source', 'type'], // Fields to index
            storeFields: ['id', 'type', 'caseId', 'tags', 'source', 'createdAt', 'content', 'originalObject'], // Fields to return
            searchOptions: {
                boost: { type: 2, tags: 1.5 },
                fuzzy: 0.2,
                prefix: true
            },
            extractField: (document, fieldName) => {
                // Access nested fields if necessary
                const record = document;
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
    static getInstance() {
        if (!SearchIndexService.instance) {
            SearchIndexService.instance = new SearchIndexService();
        }
        return SearchIndexService.instance;
    }
    // Hook for Entity Upsert
    async onEntityUpsert(entity) {
        if (process.env.SEARCH_ENABLED !== 'true')
            return;
        // Map entity to SearchableItem
        // Attempt to extract caseId from properties if available
        const record = entity;
        const context = record.context;
        const properties = record.properties;
        const caseId = (record.caseId || context?.caseId || properties?.caseId || 'global');
        const item = {
            id: record.id,
            type: 'Entity',
            caseId: caseId,
            content: `${record.type ?? ''} ${record.value ?? ''} ${record.label ?? ''} ${record.name ?? ''}`.trim(),
            tags: record.tags ?? [],
            source: 'graph-store',
            createdAt: record.createdAt ?? new Date().toISOString(),
            originalObject: entity
        };
        this.ingest(item);
    }
    // Hook for Claim Upsert
    async onClaimUpsert(claim) {
        if (process.env.SEARCH_ENABLED !== 'true')
            return;
        const record = claim;
        const context = record.context;
        const caseId = (context?.caseId ?? 'global');
        const item = {
            id: record.id,
            type: 'Claim',
            caseId: caseId,
            content: `${record.claimType ?? ''} ${record.statement ?? ''} ${JSON.stringify(record.subjects ?? [])}`.trim(),
            tags: record.tags ?? [],
            source: 'provenance-ledger',
            createdAt: record.createdAt ?? new Date().toISOString(),
            originalObject: claim
        };
        this.ingest(item);
    }
    ingest(item) {
        if (!this.miniSearch.has(item.id)) {
            this.miniSearch.add(item);
        }
        else {
            this.miniSearch.replace(item);
        }
        this.isDirty = true;
    }
    search(query) {
        if (!query.caseId) {
            throw new Error("caseId is required");
        }
        const opts = {
            filter: (result) => {
                // Filter by caseId
                if (result.caseId !== query.caseId)
                    return false;
                // Apply other filters
                if (query.filters) {
                    if (query.filters.type && query.filters.type.length > 0 && !query.filters.type.includes(result.type))
                        return false;
                    if (query.filters.tags && query.filters.tags.length > 0) {
                        // check intersection
                        const hasTag = query.filters.tags.some(t => result.tags && result.tags.includes(t));
                        if (!hasTag)
                            return false;
                    }
                    if (query.filters.source && query.filters.source.length > 0 && !query.filters.source.includes(result.source))
                        return false;
                    if (query.filters.timeRange) {
                        const created = new Date(result.createdAt).getTime();
                        if (query.filters.timeRange.start && created < new Date(query.filters.timeRange.start).getTime())
                            return false;
                        if (query.filters.timeRange.end && created > new Date(query.filters.timeRange.end).getTime())
                            return false;
                    }
                }
                return true;
            },
            queries: [query.q],
        };
        const results = this.miniSearch.search(query.q, opts);
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
                item: r // The full stored item
            };
        });
    }
    async reindex(caseId) {
        logger_js_1.default.info(`Reindexing triggered for caseId: ${caseId || 'all'}`);
        this.miniSearch.removeAll();
        // In a real production scenario, we would stream data from Neo4j/Postgres.
        // For this MVP, we will simulate a scan by logging.
        // Ideally, we would inject GraphStore and iterate over all entities.
        // Attempt to load from GraphStore if possible (using dynamic import or dependency injection)
        try {
            const { getNeo4jDriver } = await Promise.resolve().then(() => __importStar(require('../db/neo4j.js')));
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
                logger_js_1.default.info(`Reindexing completed. processed ${entityRes.records.length} entities and ${claimRes.records.length} claims.`);
            }
            finally {
                await session.close();
            }
        }
        catch (err) {
            logger_js_1.default.error('Reindexing failed to fetch data from DB', err);
        }
        this.isDirty = true;
    }
    async saveIndex() {
        try {
            const json = JSON.stringify(this.miniSearch.toJSON());
            // Ensure dir exists
            const dir = path_1.default.dirname(INDEX_FILE_PATH);
            if (!fs_1.default.existsSync(dir)) {
                fs_1.default.mkdirSync(dir, { recursive: true });
            }
            await fs_1.default.promises.writeFile(INDEX_FILE_PATH, json);
            this.isDirty = false;
        }
        catch (e) {
            logger_js_1.default.error('Failed to save search index', e);
        }
    }
    loadIndex() {
        try {
            if (fs_1.default.existsSync(INDEX_FILE_PATH)) {
                const json = fs_1.default.readFileSync(INDEX_FILE_PATH, 'utf-8');
                this.miniSearch = minisearch_1.default.loadJSON(json, {
                    fields: ['content', 'tags', 'source', 'type'],
                    storeFields: ['id', 'type', 'caseId', 'tags', 'source', 'createdAt', 'content', 'originalObject'],
                    searchOptions: {
                        boost: { type: 2, tags: 1.5 },
                        fuzzy: 0.2,
                        prefix: true
                    },
                    extractField: (document, fieldName) => {
                        const record = document;
                        return record[fieldName];
                    }
                });
                logger_js_1.default.info('Search index loaded from disk.');
            }
        }
        catch (e) {
            logger_js_1.default.error('Failed to load search index', e);
        }
    }
}
exports.SearchIndexService = SearchIndexService;
