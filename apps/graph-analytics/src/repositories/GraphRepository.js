"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryGraphRepository = exports.Neo4jGraphRepository = void 0;
const logger_1 = require("../utils/logger");
/**
 * Neo4j-backed Graph Repository
 *
 * Provides optimized subgraph queries and neighbor retrieval
 * from Neo4j graph database.
 */
class Neo4jGraphRepository {
    driver;
    constructor(driver) {
        this.driver = driver;
    }
    /**
     * Retrieve a subgraph based on query parameters
     */
    async getSubgraph(params) {
        const session = this.driver.session();
        try {
            logger_1.logger.debug('Fetching subgraph', params);
            // Build node filter
            let nodeFilter = '';
            if (params.nodeIds && params.nodeIds.length > 0) {
                nodeFilter = 'WHERE n.id IN $nodeIds';
            }
            else if (params.filters?.nodeLabels && params.filters.nodeLabels.length > 0) {
                nodeFilter = 'WHERE any(label in labels(n) WHERE label IN $nodeLabels)';
            }
            // Build edge filter
            let edgeFilter = '';
            if (params.edgeTypes && params.edgeTypes.length > 0) {
                edgeFilter = 'WHERE type(r) IN $edgeTypes';
            }
            const depth = params.depth || 1;
            const limit = params.limit || 1000;
            // Query to fetch subgraph
            const query = `
        MATCH (n)
        ${nodeFilter}
        WITH n LIMIT $limit
        OPTIONAL MATCH path = (n)-[r*1..${depth}]-(m)
        ${edgeFilter}
        WITH collect(DISTINCT n) + collect(DISTINCT m) as allNodes,
             collect(DISTINCT r) as allRels
        UNWIND allNodes as node
        WITH DISTINCT node, allRels
        OPTIONAL MATCH (node)-[rel]-(connected)
        WHERE rel IN [r IN allRels | r]
        RETURN
          COLLECT(DISTINCT {
            id: node.id,
            labels: labels(node),
            properties: properties(node)
          }) as nodes,
          COLLECT(DISTINCT {
            id: id(rel),
            fromId: startNode(rel).id,
            toId: endNode(rel).id,
            type: type(rel),
            properties: properties(rel)
          }) as edges
        LIMIT 1
      `;
            const result = await session.run(query, {
                nodeIds: params.nodeIds || [],
                nodeLabels: params.filters?.nodeLabels || [],
                edgeTypes: params.edgeTypes || [],
                limit,
            });
            if (result.records.length === 0) {
                return { nodes: [], edges: [] };
            }
            const record = result.records[0];
            const nodes = record.get('nodes') || [];
            const edges = (record.get('edges') || []).filter((e) => e !== null && e.fromId && e.toId);
            logger_1.logger.debug('Subgraph fetched', {
                nodes: nodes.length,
                edges: edges.length,
            });
            return {
                nodes: nodes.slice(0, limit),
                edges: edges.slice(0, limit * 2), // Allow more edges than nodes
            };
        }
        catch (error) {
            logger_1.logger.error('Error fetching subgraph:', error);
            throw error;
        }
        finally {
            await session.close();
        }
    }
    /**
     * Get neighbors of a node up to specified depth
     */
    async getNeighbors(nodeId, depth = 1, filters) {
        const session = this.driver.session();
        try {
            logger_1.logger.debug(`Fetching neighbors for node ${nodeId}`, { depth, filters });
            const edgeFilter = filters?.edgeTypes?.length
                ? 'WHERE type(r) IN $edgeTypes'
                : '';
            const query = `
        MATCH (center {id: $nodeId})
        CALL apoc.path.subgraphNodes(center, {
          maxLevel: $depth,
          relationshipFilter: '${filters?.edgeTypes?.join('|') || ''}',
          direction: '${filters?.direction || 'BOTH'}'
        })
        YIELD node
        WITH DISTINCT node
        OPTIONAL MATCH (node)-[r]-(connected)
        ${edgeFilter}
        WHERE connected IN COLLECT(node)
        RETURN
          COLLECT(DISTINCT {
            id: node.id,
            labels: labels(node),
            properties: properties(node)
          }) as nodes,
          COLLECT(DISTINCT {
            id: id(r),
            fromId: startNode(r).id,
            toId: endNode(r).id,
            type: type(r),
            properties: properties(r)
          }) as edges
      `;
            let result;
            try {
                result = await session.run(query, {
                    nodeId,
                    depth,
                    edgeTypes: filters?.edgeTypes || [],
                });
            }
            catch (apocError) {
                // Fallback if APOC not available
                logger_1.logger.warn('APOC not available, using simple path expansion');
                const fallbackQuery = `
          MATCH path = ({id: $nodeId})-[r*1..${depth}]-(neighbor)
          ${edgeFilter}
          WITH DISTINCT neighbor, relationships(path) as rels
          UNWIND rels as rel
          WITH DISTINCT neighbor, rel
          RETURN
            COLLECT(DISTINCT {
              id: neighbor.id,
              labels: labels(neighbor),
              properties: properties(neighbor)
            }) as nodes,
            COLLECT(DISTINCT {
              id: id(rel),
              fromId: startNode(rel).id,
              toId: endNode(rel).id,
              type: type(rel),
              properties: properties(rel)
            }) as edges
        `;
                result = await session.run(fallbackQuery, {
                    nodeId,
                    edgeTypes: filters?.edgeTypes || [],
                });
            }
            if (result.records.length === 0) {
                return { nodes: [], edges: [] };
            }
            const record = result.records[0];
            const nodes = record.get('nodes') || [];
            const edges = (record.get('edges') || []).filter((e) => e !== null);
            logger_1.logger.debug('Neighbors fetched', {
                nodes: nodes.length,
                edges: edges.length,
            });
            return { nodes, edges };
        }
        catch (error) {
            logger_1.logger.error('Error fetching neighbors:', error);
            throw error;
        }
        finally {
            await session.close();
        }
    }
    /**
     * Get all nodes in the graph (with optional limit)
     */
    async getAllNodes(limit = 10000) {
        const session = this.driver.session();
        try {
            const query = `
        MATCH (n)
        RETURN
          n.id as id,
          labels(n) as labels,
          properties(n) as properties
        LIMIT $limit
      `;
            const result = await session.run(query, { limit });
            return result.records.map((record) => ({
                id: record.get('id'),
                labels: record.get('labels'),
                properties: record.get('properties'),
            }));
        }
        finally {
            await session.close();
        }
    }
    /**
     * Get all edges in the graph (with optional limit)
     */
    async getAllEdges(limit = 50000) {
        const session = this.driver.session();
        try {
            const query = `
        MATCH (a)-[r]->(b)
        RETURN
          id(r) as id,
          a.id as fromId,
          b.id as toId,
          type(r) as type,
          properties(r) as properties
        LIMIT $limit
      `;
            const result = await session.run(query, { limit });
            return result.records.map((record) => ({
                id: record.get('id').toString(),
                fromId: record.get('fromId'),
                toId: record.get('toId'),
                type: record.get('type'),
                properties: record.get('properties'),
            }));
        }
        finally {
            await session.close();
        }
    }
}
exports.Neo4jGraphRepository = Neo4jGraphRepository;
/**
 * In-memory Graph Repository for testing
 */
class InMemoryGraphRepository {
    graph;
    constructor(graph = { nodes: [], edges: [] }) {
        this.graph = graph;
    }
    async getSubgraph(params) {
        let nodes = [...this.graph.nodes];
        let edges = [...this.graph.edges];
        // Filter by node IDs
        if (params.nodeIds && params.nodeIds.length > 0) {
            const nodeIdSet = new Set(params.nodeIds);
            nodes = nodes.filter((n) => nodeIdSet.has(n.id));
        }
        // Filter by node labels
        if (params.filters?.nodeLabels && params.filters.nodeLabels.length > 0) {
            const labelSet = new Set(params.filters.nodeLabels);
            nodes = nodes.filter((n) => n.labels.some((label) => labelSet.has(label)));
        }
        // Get connected nodes up to depth
        if (params.depth && params.depth > 0) {
            const nodeIds = new Set(nodes.map((n) => n.id));
            const edgesToInclude = new Set();
            // BFS to find neighbors up to depth
            for (let d = 0; d < params.depth; d++) {
                const currentNodeIds = new Set(nodeIds);
                for (const edge of edges) {
                    if (currentNodeIds.has(edge.fromId)) {
                        nodeIds.add(edge.toId);
                        edgesToInclude.add(edge.id);
                    }
                    if (currentNodeIds.has(edge.toId)) {
                        nodeIds.add(edge.fromId);
                        edgesToInclude.add(edge.id);
                    }
                }
            }
            nodes = this.graph.nodes.filter((n) => nodeIds.has(n.id));
            edges = this.graph.edges.filter((e) => edgesToInclude.has(e.id));
        }
        // Filter by edge types
        if (params.edgeTypes && params.edgeTypes.length > 0) {
            const edgeTypeSet = new Set(params.edgeTypes);
            edges = edges.filter((e) => edgeTypeSet.has(e.type));
        }
        // Apply limit
        if (params.limit) {
            nodes = nodes.slice(0, params.limit);
            // Keep edges that connect the limited nodes
            const nodeIdSet = new Set(nodes.map((n) => n.id));
            edges = edges.filter((e) => nodeIdSet.has(e.fromId) && nodeIdSet.has(e.toId));
        }
        return { nodes, edges };
    }
    async getNeighbors(nodeId, depth = 1, filters) {
        const visited = new Set([nodeId]);
        const nodesToExplore = [nodeId];
        const resultEdges = [];
        for (let d = 0; d < depth; d++) {
            const currentLevel = [];
            for (const currentNodeId of nodesToExplore) {
                for (const edge of this.graph.edges) {
                    // Check edge type filter
                    if (filters?.edgeTypes && !filters.edgeTypes.includes(edge.type)) {
                        continue;
                    }
                    if (edge.fromId === currentNodeId && !visited.has(edge.toId)) {
                        visited.add(edge.toId);
                        currentLevel.push(edge.toId);
                        resultEdges.push(edge);
                    }
                    else if (edge.toId === currentNodeId &&
                        !visited.has(edge.fromId)) {
                        visited.add(edge.fromId);
                        currentLevel.push(edge.fromId);
                        resultEdges.push(edge);
                    }
                }
            }
            nodesToExplore.length = 0;
            nodesToExplore.push(...currentLevel);
        }
        const nodes = this.graph.nodes.filter((n) => visited.has(n.id));
        return { nodes, edges: resultEdges };
    }
}
exports.InMemoryGraphRepository = InMemoryGraphRepository;
