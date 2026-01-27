import { getNeo4jDriver } from '../db/neo4j';
import { logger } from '../config/logger';
import { cacheService } from './CacheService';

export interface ExplanationResult {
    nodeId: string;
    labels: string[];
    properties: any;
    provenance: {
        sources: string[];
        confidence: number;
        lineage: string[];
    };
    paths: any[];
}

export class ExplainabilityService {
    private static instance: ExplainabilityService;

    private constructor() {}

    public static getInstance(): ExplainabilityService {
        if (!ExplainabilityService.instance) {
            ExplainabilityService.instance = new ExplainabilityService();
        }
        return ExplainabilityService.instance;
    }

    /**
     * Traces causal paths from the given node to high-value targets (Source, Threat, Risk).
     * Uses shortest path algorithms with a hop limit.
     *
     * Architecture Note:
     * This method implements the "Causal Trace" pattern. It does not just find any path,
     * but specifically looks for paths to semantic "Root Causes" or "High Impact" nodes
     * defined by the ontology (Source, Threat, Risk).
     *
     * Performance:
     * - Uses `shortestPath` for O(BFS) complexity.
     * - Limits hops to 5 to prevent graph explosion.
     * - Limits results to 5 distinct paths.
     */
    public async traceCausalPaths(nodeId: string): Promise<any[]> {
        const driver = getNeo4jDriver();
        const session = driver.session({ defaultAccessMode: 'READ' });
        try {
            // Find shortest paths to interesting nodes (Source, Threat, Risk) within 5 hops
            const query = `
                MATCH (start) WHERE elementId(start) = $nodeId OR id(start) = toInteger($nodeId)
                MATCH (end) WHERE (end:Source OR end:Threat OR end:Risk) AND start <> end
                MATCH p = shortestPath((start)-[*..5]-(end))
                RETURN [n in nodes(p) | { id: elementId(n), labels: labels(n), name: n.name }] as path,
                       [r in relationships(p) | type(r)] as relationships
                LIMIT 5
            `;

            const result = await session.run(query, { nodeId });
            return result.records.map(record => ({
                nodes: record.get('path'),
                relationships: record.get('relationships')
            }));
        } catch (error) {
            logger.error({ error, nodeId }, 'Failed to trace causal paths');
            return []; // Fail gracefully
        } finally {
            await session.close();
        }
    }

    /**
     * Explain why a node exists (provenance/lineage).
     * This is a heuristic implementation for v1.
     *
     * Caching Strategy:
     * Explanations are expensive to compute (involving multiple graph hops and path finding).
     * We cache the result for 5 minutes (TTL=300) to support iterative exploration by the analyst
     * without thrashing the database.
     */
    public async explainNode(nodeId: string): Promise<ExplanationResult> {
        return cacheService.getOrSet(`explanation:${nodeId}`, async () => {
            const driver = getNeo4jDriver();
            const session = driver.session({ defaultAccessMode: 'READ' });

            try {
                // Fetch node and related "Source" or "Document" nodes
                const query = `
                    MATCH (n) WHERE elementId(n) = $nodeId OR id(n) = toInteger($nodeId)
                    OPTIONAL MATCH (n)<-[:MENTIONS|CREATED]-(source)
                    RETURN n, collect(distinct source) as sources
                `;

                const result = await session.run(query, { nodeId });
                if (result.records.length === 0) {
                    throw new Error('Node not found');
                }

                const record = result.records[0];
                const node: any = record.get('n');
                const sourceNodes: any[] = record.get('sources');

                const sources = sourceNodes.map((s: any) => s.properties.name || s.properties.title || s.properties.url || 'Unknown');

                // Mock confidence score based on sources
                const confidence = sources.length > 0 ? 0.9 : 0.5;

                // Fetch causal paths
                const paths = await this.traceCausalPaths(nodeId);

                return {
                    nodeId,
                    labels: node.labels,
                    properties: node.properties,
                    provenance: {
                        sources,
                        confidence,
                        lineage: sources // For now lineage is just source list
                    },
                    paths
                };

            } catch (error: any) {
                logger.error({ error, nodeId }, 'Explainability failed');
                throw error;
            } finally {
                await session.close();
            }
        }, 300); // Cache for 5 minutes
    }
}

export const explainabilityService = ExplainabilityService.getInstance();
