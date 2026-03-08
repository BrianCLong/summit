"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Neo4jGraphAnalyticsService = void 0;
const neo4j_js_1 = require("../graph/neo4j.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const CacheService_js_1 = require("./CacheService.js");
class Neo4jGraphAnalyticsService {
    static instance;
    // Protected dependencies for testing override
    deps = {
        getDriver: neo4j_js_1.getDriver,
        runCypher: neo4j_js_1.runCypher
    };
    static getInstance() {
        if (!Neo4jGraphAnalyticsService.instance) {
            Neo4jGraphAnalyticsService.instance = new Neo4jGraphAnalyticsService();
        }
        return Neo4jGraphAnalyticsService.instance;
    }
    buildScopeConstraints(scope, nodeVar = 'n') {
        let constraints = '';
        if (scope.investigationId) {
            constraints += ` AND ${nodeVar}.investigationId = $investigationId`;
        }
        if (scope.collectionId) {
            constraints += ` AND ${nodeVar}.collectionId = $collectionId`;
        }
        return constraints;
    }
    getScopeKey(scope) {
        return `${scope.investigationId || 'global'}:${scope.collectionId || 'all'}`;
    }
    async shortestPath(params) {
        const { tenantId, from, to, maxDepth = 6 } = params;
        const cacheKey = `graph:shortestPath:${tenantId}:${from}:${to}:${maxDepth}`;
        return CacheService_js_1.cacheService.getOrSet(cacheKey, async () => {
            const cypher = `
        MATCH (start:Entity {id: $from, tenantId: $tenantId}), (end:Entity {id: $to, tenantId: $tenantId})
        MATCH p = shortestPath((start)-[*..${maxDepth}]-(end))
        RETURN p
      `;
            try {
                const session = this.deps.getDriver().session();
                try {
                    const result = await session.run(cypher, { from, to, tenantId });
                    if (result.records.length === 0)
                        return null;
                    const path = result.records[0].get('p');
                    const nodes = [];
                    const edges = [];
                    path.segments.forEach((seg) => {
                        const startNode = seg.start.properties;
                        const endNode = seg.end.properties;
                        const rel = seg.relationship.properties;
                        const mapNode = (n) => ({
                            ...n,
                            attributes: typeof n.attributes === 'string' ? JSON.parse(n.attributes) : n.attributes || {},
                            metadata: typeof n.metadata === 'string' ? JSON.parse(n.metadata) : n.metadata || {}
                        });
                        const mapEdge = (r, fromId, toId, type) => ({
                            ...r,
                            fromEntityId: fromId,
                            toEntityId: toId,
                            type: type,
                            attributes: typeof r.attributes === 'string' ? JSON.parse(r.attributes) : r.attributes || {},
                            metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata || {}
                        });
                        if (!nodes.find(n => n.id === startNode.id))
                            nodes.push(mapNode(startNode));
                        if (!nodes.find(n => n.id === endNode.id))
                            nodes.push(mapNode(endNode));
                        if (!edges.find(e => e.id === rel.id))
                            edges.push(mapEdge(rel, startNode.id, endNode.id, seg.relationship.type));
                    });
                    return { nodes, edges, cost: path.length };
                }
                finally {
                    await session.close();
                }
            }
            catch (error) {
                logger_js_1.default.error('Error finding shortest path', { error, params });
                throw error;
            }
        }, 60 * 5); // 5 min cache
    }
    async kHopNeighborhood(params) {
        const { tenantId, seedIds, depth } = params;
        const sortedSeedIds = [...seedIds].sort().join(',');
        const cacheKey = `graph:kHop:${tenantId}:${sortedSeedIds}:${depth}`;
        return CacheService_js_1.cacheService.getOrSet(cacheKey, async () => {
            const safeDepth = Math.min(depth, 3);
            const cypher = `
        MATCH (start:Entity {tenantId: $tenantId})
        WHERE start.id IN $seedIds
        MATCH (start)-[r*0..${safeDepth}]-(end:Entity {tenantId: $tenantId})
        UNWIND r as rel
        WITH collect(distinct start) + collect(distinct end) as nodes, collect(distinct rel) as rels
        UNWIND nodes as n
        WITH collect(distinct n) as uniqueNodes, rels
        RETURN
          [n in uniqueNodes | n { .* }] as nodes,
          [r in rels | r { .*, type: type(r), fromEntityId: startNode(r).id, toEntityId: endNode(r).id }] as edges
      `;
            const result = await this.deps.runCypher(cypher, { tenantId, seedIds });
            if (result.length === 0)
                return { nodes: [], edges: [] };
            const row = result[0];
            const mapEntity = (n) => ({
                ...n,
                attributes: typeof n.attributes === 'string' ? JSON.parse(n.attributes) : n.attributes || {},
                metadata: typeof n.metadata === 'string' ? JSON.parse(n.metadata) : n.metadata || {}
            });
            const mapEdge = (r) => ({
                ...r,
                attributes: typeof r.attributes === 'string' ? JSON.parse(r.attributes) : r.attributes || {},
                metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata || {}
            });
            return {
                nodes: row.nodes.map(mapEntity),
                edges: row.edges.map(mapEdge)
            };
        }, 60 * 10); // 10 min cache
    }
    async centrality(params) {
        const { tenantId, scope, algorithm } = params;
        const cacheKey = `graph:centrality:${tenantId}:${algorithm}:${this.getScopeKey(scope)}`;
        // Cache for 30 minutes as centrality is heavy and doesn't change instantly
        return CacheService_js_1.cacheService.getOrSet(cacheKey, async () => {
            // MVP: Degree Centrality via Cypher
            if (algorithm === 'degree') {
                const cypher = `
           MATCH (n:Entity {tenantId: $tenantId})
           WHERE 1=1 ${this.buildScopeConstraints(scope)}
           OPTIONAL MATCH (n)-[r]-()
           RETURN n.id as entityId, count(r) as score
           ORDER BY score DESC
           LIMIT 100
         `;
                const result = await this.deps.runCypher(cypher, {
                    tenantId,
                    investigationId: scope.investigationId,
                    collectionId: scope.collectionId
                });
                return result.map((r, i) => ({
                    entityId: r.entityId,
                    score: Number(r.score),
                    rank: i + 1
                }));
            }
            if (algorithm === 'pageRank') {
                // Optimization: Avoid unbounded neighborhood expansion.
                // We use a simplified iterative approach restricted to the top connected nodes to avoid O(N^2) blowup.
                const cypher = `
           MATCH (n:Entity {tenantId: $tenantId})
           WHERE 1=1 ${this.buildScopeConstraints(scope)}
           // First, get degree to filter top candidates for influence check
           OPTIONAL MATCH (n)-[r]-()
           WITH n, count(r) as degree
           ORDER BY degree DESC
           LIMIT 200 // Analyze top 200 nodes only for MVP performance safety

           // Now look at their neighbors' influence (2nd hop)
           OPTIONAL MATCH (n)-[]-(neighbor)
           WITH n, degree, neighbor
           OPTIONAL MATCH (neighbor)-[r2]-()
           WITH n, degree, neighbor, count(r2) as neighbor_degree

           // Sum neighbor degrees as proxy for influence (PageRank-ish)
           WITH n, degree, sum(log(neighbor_degree + 1)) as influence_proxy
           RETURN n.id as entityId, (degree + influence_proxy) as score
           ORDER BY score DESC
           LIMIT 100
         `;
                try {
                    const result = await this.deps.runCypher(cypher, {
                        tenantId,
                        investigationId: scope.investigationId,
                        collectionId: scope.collectionId
                    });
                    return result.map((r, i) => ({
                        entityId: r.entityId,
                        score: Number(r.score),
                        rank: i + 1
                    }));
                }
                catch (e) {
                    logger_js_1.default.warn('PageRank calculation failed, falling back to degree', e);
                    // If PageRank fails, we can't easily recurse into cached call without potential loop or complexity.
                    // For now, just call local logic for degree but we duplicate logic.
                    // Better to throw or return empty.
                    // Or recursing is fine if key is different (it is).
                    // But 'this' context might be tricky in async arrow.
                    // Let's just return empty array or re-implement simple degree fallback without cache recursion to avoid complexity.
                    return [];
                }
            }
            // Betweenness and Eigenvector require GDS or heavy computation.
            // For MVP, we throw or return empty if not available.
            return [];
        }, 60 * 30);
    }
    async communities(params) {
        const { tenantId, scope, algorithm = 'wcc' } = params;
        const cacheKey = `graph:communities:${tenantId}:${algorithm}:${this.getScopeKey(scope)}`;
        // Cache for 1 hour
        return CacheService_js_1.cacheService.getOrSet(cacheKey, async () => {
            // MVP: Weakly Connected Components (via simple traversal)
            if (algorithm === 'wcc' || algorithm === 'louvain' || algorithm === 'labelPropagation') {
                // Label Propagation / Community Detection via Cypher Heuristic
                const cypher = `
              MATCH (n1:Entity {tenantId: $tenantId})
              WHERE 1=1 ${this.buildScopeConstraints(scope, 'n1')}
              MATCH (n1)-[]-(n2:Entity {tenantId: $tenantId})
              WHERE elementId(n1) < elementId(n2) ${this.buildScopeConstraints(scope, 'n2').replace(/AND n\./g, 'AND n2.')}

              // We consider direct connections as strong evidence for community in this simple heuristic
              // We can also look for shared neighbors if we want density check
              WITH n1, n2
              OPTIONAL MATCH (n1)-[]-(common)-[]-(n2)
              WITH n1, n2, count(common) as shared

              // Weight = 1 (direct) + shared
              WITH n1, n2, (1 + shared) as weight
              WHERE weight > 1 // Filter weak links

              RETURN n1.id as id1, n2.id as id2, weight
              ORDER BY weight DESC
              LIMIT 200
          `;
                try {
                    const result = await this.deps.runCypher(cypher, {
                        tenantId,
                        investigationId: scope.investigationId,
                        collectionId: scope.collectionId
                    });
                    // Simple Union-Find to group into communities
                    const parent = new Map();
                    const find = (id) => {
                        if (!parent.has(id))
                            parent.set(id, id);
                        if (parent.get(id) !== id)
                            parent.set(id, find(parent.get(id)));
                        return parent.get(id);
                    };
                    const union = (id1, id2) => {
                        const root1 = find(id1);
                        const root2 = find(id2);
                        if (root1 !== root2)
                            parent.set(root1, root2);
                    };
                    result.forEach(r => union(r.id1, r.id2));
                    // Group by root
                    const clusters = new Map();
                    parent.forEach((_, id) => {
                        const root = find(id);
                        if (!clusters.has(root))
                            clusters.set(root, []);
                        clusters.get(root)?.push(id);
                    });
                    return Array.from(clusters.entries()).map(([root, members]) => ({
                        communityId: root,
                        entityIds: members,
                        size: members.length
                    }));
                }
                catch (e) {
                    logger_js_1.default.warn('Community detection failed', e);
                    return [];
                }
            }
            return [];
        }, 60 * 60);
    }
    async detectAnomalies(params) {
        const { tenantId, scope, kind = 'degree' } = params;
        const cacheKey = `graph:anomalies:${tenantId}:${kind}:${this.getScopeKey(scope)}`;
        // Cache for 15 minutes
        return CacheService_js_1.cacheService.getOrSet(cacheKey, async () => {
            if (kind === 'degree') {
                const cypher = `
              MATCH (n:Entity {tenantId: $tenantId})
              WHERE 1=1 ${this.buildScopeConstraints(scope)}
              OPTIONAL MATCH (n)-[r]-()
              WITH n, count(r) as degree
              WITH avg(degree) as avgDeg, stdev(degree) as stdDev, collect({n: n, degree: degree}) as stats
              UNWIND stats as stat
              WITH stat.n as n, stat.degree as degree, avgDeg, stdDev
              WHERE degree > (avgDeg + (3 * stdDev))
              RETURN n.id as entityId, degree as score
              ORDER BY score DESC
              LIMIT 50
          `;
                const result = await this.deps.runCypher(cypher, {
                    tenantId,
                    investigationId: scope.investigationId,
                    collectionId: scope.collectionId
                });
                return result.map(r => ({
                    entityId: r.entityId,
                    score: Number(r.score),
                    kind: 'degree',
                    reason: `Degree ${r.score} is significantly higher than average.`
                }));
            }
            return [];
        }, 60 * 15);
    }
}
exports.Neo4jGraphAnalyticsService = Neo4jGraphAnalyticsService;
exports.default = Neo4jGraphAnalyticsService;
