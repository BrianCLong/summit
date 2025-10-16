import { runCypher } from '../graph/neo4j';
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL); // Use Redis connection string from env
function getGraphContextCacheKey(investigationId, focusIds) {
    const focusHash = require('crypto')
        .createHash('sha256')
        .update(focusIds.sort().join(':'))
        .digest('hex');
    return `rag:gctx:${investigationId}:${focusHash}`;
}
// 1) Graph pull (Neo4j): nearest K entities to the focus nodes
export async function fetchGraphContext({ investigationId, focusIds, k = 12, }) {
    if (!focusIds || focusIds.length === 0)
        return [];
    const cacheKey = getGraphContextCacheKey(investigationId, focusIds);
    const cached = await redis.get(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }
    const result = await runCypher(`
    MATCH (f:Entity) WHERE f.id IN $focus
    MATCH p=(f)-[:RELATED_TO*1..2]-(n:Entity)
    WITH DISTINCT n, size((n)--()) AS deg
    RETURN n.name AS name, labels(n) AS types, deg, n.source AS source // Added n.source
    ORDER BY deg DESC LIMIT $k
  `, { focus: focusIds, k });
    await redis.setex(cacheKey, 60 * 2, JSON.stringify(result)); // Cache for 2 minutes
    return result;
}
// 2) Text KB (pgvector/ES): top M passages by embedding sim
export async function fetchTextPassages(query, m = 6) {
    // placeholder; use pgvector or ES; return [{source, text}]
    return [];
}
// 3) Prompt assembly
export function buildRagPrompt({ question, graph, passages, }) {
    const graphBullets = graph
        .map((g) => `- ${g.name} (${g.types?.join(',') ?? ''})${g.source ? ` [${g.source}]` : ''}`)
        .join('\n');
    const docBullets = passages
        .map((p) => `- [${p.source}] ${p.text}`)
        .join('\n');
    return [
        'You are IntelGraph Assistant. Answer precisely using the context below.',
        'Prioritize graph facts over text. If uncertain, say so.',
        '### Graph Context',
        graphBullets || '(none)',
        '### Documents',
        docBullets || '(none)',
        '### Question',
        question,
        '### Answer',
    ].join('\n');
}
//# sourceMappingURL=rag.js.map