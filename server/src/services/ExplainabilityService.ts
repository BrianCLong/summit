import { getNeo4jDriver } from '../db/neo4j.js';
import { logger } from '../config/logger.js';

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
     * Explain why a node exists (provenance/lineage).
     * This is a heuristic implementation for v1.
     */
    public async explainNode(nodeId: string): Promise<ExplanationResult> {
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

            return {
                nodeId,
                labels: node.labels,
                properties: node.properties,
                provenance: {
                    sources,
                    confidence,
                    lineage: sources // For now lineage is just source list
                },
                paths: [] // TODO: Add path analysis (shortest path to key entities)
            };

        } catch (error: any) {
            logger.error({ error, nodeId }, 'Explainability failed');
            throw error;
        } finally {
            await session.close();
        }
    }
}

export const explainabilityService = ExplainabilityService.getInstance();
