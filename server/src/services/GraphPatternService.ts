import {
  GraphPatternQuery,
  GraphPatternNode,
  GraphPatternEdge,
} from '../graph/patternQuery';
import { runCypher } from '../graph/neo4j';
import { Entity, Edge } from '../graph/types';
import { enforceTenantScopeForCypher } from './graphTenantScope.js';

// Helper to sanitize attribute keys to prevent injection
function sanitizeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9_]/g, '');
}

// Helper to unflatten attributes from storage (duplicated for standalone service, ideally shared util)
function unflattenAttributes(properties: Record<string, any>, prefix = 'attr_'): Record<string, unknown> {
  const attributes: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(properties)) {
    if (k.startsWith(prefix)) {
      const key = k.substring(prefix.length);
      if (typeof v === 'string' && (v.startsWith('{') || v.startsWith('['))) {
        try {
          attributes[key] = JSON.parse(v);
        } catch {
          attributes[key] = v;
        }
      } else {
        attributes[key] = v;
      }
    }
  }
  return attributes;
}

export class GraphPatternService {
  private static instance: GraphPatternService;

  public static getInstance(): GraphPatternService {
    if (!GraphPatternService.instance) {
      GraphPatternService.instance = new GraphPatternService();
    }
    return GraphPatternService.instance;
  }

  async search(query: GraphPatternQuery): Promise<{ nodes: Entity[]; edges: Edge[] }[]> {
    const { tenantId, pattern, limit = 100 } = query;

    let cypherParts: string[] = [];
    let whereParts: string[] = [];
    const params: any = { tenantId };

    // Sanitize aliases to prevent injection
    const sanitizeAlias = (alias: string) => alias.replace(/[^a-zA-Z0-9_]/g, '');

    // 1. MATCH Clauses
    const nodeDefs = pattern.nodes.map(n => {
        const safeAlias = sanitizeAlias(n.alias);
        return `(${safeAlias}:Entity {tenantId: $tenantId})`;
    }).join(', ');

    if (nodeDefs) cypherParts.push(`MATCH ${nodeDefs}`);

    if (pattern.edges.length > 0) {
        const edgeDefs = pattern.edges.map((e, idx) => {
            const safeFrom = sanitizeAlias(e.from);
            const safeTo = sanitizeAlias(e.to);
            const arrow = e.directed ? '->' : '-';

            return `(${safeFrom})-[r${idx}:Edge {tenantId: $tenantId}]${arrow}(${safeTo})`;
        }).join(', ');
        cypherParts.push(`MATCH ${edgeDefs}`);
    }

    // 2. Filters (Types, Attributes)
    pattern.nodes.forEach((node) => {
        const safeAlias = sanitizeAlias(node.alias);

        if (node.types && node.types.length > 0) {
            whereParts.push(`${safeAlias}.type IN $types_${safeAlias}`);
            params[`types_${safeAlias}`] = node.types;
        }
        if (node.attributes) {
            Object.entries(node.attributes).forEach(([k, v], i) => {
                const safeKey = sanitizeKey(k);
                whereParts.push(`${safeAlias}.attr_${safeKey} = $attr_${safeAlias}_${i}`);
                params[`attr_${safeAlias}_${i}`] = v;
            });
        }
    });

    pattern.edges.forEach((edge, idx) => {
        if (edge.types && edge.types.length > 0) {
            whereParts.push(`type(r${idx}) IN $types_r${idx}`);
            params[`types_r${idx}`] = edge.types;
        }
         if (edge.attributes) {
            Object.entries(edge.attributes).forEach(([k, v], i) => {
                const safeKey = sanitizeKey(k);
                whereParts.push(`r${idx}.attr_${safeKey} = $attr_r${idx}_${i}`);
                params[`attr_r${idx}_${i}`] = v;
            });
        }
    });

    if (whereParts.length > 0) {
        cypherParts.push(`WHERE ${whereParts.join(' AND ')}`);
    }

    // 3. Return
    const returnNodes = pattern.nodes.map(n => sanitizeAlias(n.alias)).join(', ');
    const returnEdges = pattern.edges.map((e, idx) => `r${idx}`).join(', ');

    const returnClause = returnEdges ? `RETURN ${returnNodes}, ${returnEdges}` : `RETURN ${returnNodes}`;
    cypherParts.push(returnClause);
    cypherParts.push(`LIMIT toInteger($limit)`);
    params.limit = limit;

    const fullCypher = cypherParts.join(' ');
    const scoped = await enforceTenantScopeForCypher(fullCypher, params, {
      tenantId,
      action: 'graph.read',
      resource: 'graph.pattern.search',
    });

    const results = await runCypher(scoped.cypher, scoped.params, { tenantId });

    // Map results
    return results.map((rec) => {
        const record = rec as Record<string, any>;
        const nodes: Entity[] = [];
        const edges: Edge[] = [];

        pattern.nodes.forEach(n => {
            const safeAlias = sanitizeAlias(n.alias);
            const nodeObj = record[safeAlias];
            if (nodeObj) {
                 nodes.push({
                     ...nodeObj,
                     attributes: unflattenAttributes(nodeObj),
                     metadata: typeof nodeObj.metadata === 'string' ? JSON.parse(nodeObj.metadata) : nodeObj.metadata || {}
                 });
            }
        });

        pattern.edges.forEach((e, idx) => {
            const edgeObj = record[`r${idx}`];
            if (edgeObj) {
                // Infer from/to IDs from nodes in the record if needed,
                // but Neo4j driver relationship objects (if returned raw) have start/end.
                // If runCypher returns plain object, we might lose start/end unless we explicitly return them in cypher map projection.
                // But for now, let's assume we can infer from the node aliases in the same record.

                const safeFrom = sanitizeAlias(e.from);
                const safeTo = sanitizeAlias(e.to);
                const fromId = record[safeFrom]?.id;
                const toId = record[safeTo]?.id;

                 edges.push({
                     ...edgeObj,
                     fromEntityId: fromId,
                     toEntityId: toId,
                     type: edgeObj.type,
                     attributes: unflattenAttributes(edgeObj),
                     metadata: typeof edgeObj.metadata === 'string' ? JSON.parse(edgeObj.metadata) : edgeObj.metadata || {}
                 });
            }
        });

        return { nodes, edges };
    });
  }
}
