import { getNeo4jDriver } from '../config/database.js';
import logger from '../utils/logger.js';

export interface CausalNode {
  id: string;
  label: string;
  type: string;
  confidence?: number;
  metadata?: Record<string, any>;
}

export interface CausalEdge {
  source: string;
  target: string;
  type: string;
  weight: number;
  evidence?: string;
}

export interface CausalGraph {
  nodes: CausalNode[];
  edges: CausalEdge[];
}

export class CausalGraphService {
  private driver;

  constructor() {
    this.driver = getNeo4jDriver();
  }

  /**
   * Generates a causal influence graph for a given investigation.
   * This uses heuristics to infer causal relationships between entities.
   */
  async generateCausalGraph(investigationId: string): Promise<CausalGraph> {
    const session = this.driver.session();
    try {
      // 1. Fetch relevant nodes (Events, Actions, etc.)
      // We prioritize events with timestamps for causal analysis
      const nodesQuery = `
        MATCH (n)
        WHERE n.investigation_id = $investigationId
        RETURN n.id as id, n.label as label, labels(n) as types, n.date as date, n.timestamp as timestamp
      `;

      const nodesResult = await session.run(nodesQuery, { investigationId });
      const nodes: CausalNode[] = nodesResult.records.map(record => ({
        id: record.get('id'),
        label: record.get('label') || record.get('id'),
        type: record.get('types')[0],
        confidence: 1.0, // Base confidence
        metadata: {
          date: record.get('date') || record.get('timestamp')
        }
      }));

      // Map for quick node lookup
      const nodeMap = new Map(nodes.map(n => [n.id, n]));

      // 2. Fetch existing relationships
      const edgesQuery = `
        MATCH (n)-[r]->(m)
        WHERE n.investigation_id = $investigationId AND m.investigation_id = $investigationId
        RETURN n.id as source, m.id as target, type(r) as type, r
      `;

      const edgesResult = await session.run(edgesQuery, { investigationId });

      const causalEdges: CausalEdge[] = [];

      // Strong causal indicators
      const CAUSAL_RELATIONSHIPS = new Set([
        'CAUSED', 'TRIGGERED', 'LED_TO', 'RESULTED_IN', 'INFLUENCED', 'MOTIVATED', 'FUNDED', 'AUTHORED'
      ]);

      // Weak causal indicators
      const POTENTIAL_RELATIONSHIPS = new Set([
        'RELATED_TO', 'ASSOCIATED_WITH', 'PARTICIPATED_IN', 'MEMBER_OF'
      ]);

      for (const record of edgesResult.records) {
        const sourceId = record.get('source');
        const targetId = record.get('target');
        const type = record.get('type');

        const sourceNode = nodeMap.get(sourceId);
        const targetNode = nodeMap.get(targetId);

        if (!sourceNode || !targetNode) continue;

        let weight = 0;
        let evidence = '';

        // Check explicit types
        if (CAUSAL_RELATIONSHIPS.has(type)) {
          weight = 0.9;
          evidence = `Explicit relationship: ${type}`;
        } else if (POTENTIAL_RELATIONSHIPS.has(type)) {
          weight = 0.3;
          evidence = `Potential relationship: ${type}`;
        }

        // Check temporal precedence if timestamps exist
        const sourceTime = this.getTime(sourceNode);
        const targetTime = this.getTime(targetNode);

        if (sourceTime && targetTime) {
          if (sourceTime < targetTime) {
            // Temporal precedence strengthens the link
            if (weight > 0) {
              weight = Math.min(0.95, weight + 0.2);
              evidence += ` + Temporal precedence`;
            } else {
              // Even if the relationship isn't explicitly causal, A happened before B and they are connected
              weight = 0.4;
              evidence = `Connected and temporal precedence (${type})`;
            }
          } else if (sourceTime > targetTime) {
            // Reverse causality is unlikely for direct edges unless the edge type implies it (e.g. "PLANNED_BY")
            // For now, we penalize
            weight = weight * 0.1;
            evidence += ` (Penalty: Source happened after Target)`;
          }
        }

        if (weight > 0.1) {
          causalEdges.push({
            source: sourceId,
            target: targetId,
            type: 'INFLUENCED',
            weight,
            evidence
          });
        }
      }

      // 3. Infer transitive causality (simplified)
      // If A -> B (strong) and B -> C (strong), then A -> C (medium)
      // This is O(E^2) or O(V^3), keep it simple for now or skip to avoid performance hit on large graphs

      return {
        nodes,
        edges: causalEdges
      };

    } catch (error) {
      logger.error('Error generating causal graph', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  private getTime(node: CausalNode): number | null {
    if (node.metadata && node.metadata.date) {
      return new Date(node.metadata.date).getTime();
    }
    if (node.metadata && node.metadata.timestamp) {
        return new Date(node.metadata.timestamp).getTime();
    }
    return null;
  }
}
