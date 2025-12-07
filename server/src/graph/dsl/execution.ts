export interface DSLQuery {
  start: {
    type?: string;
    id?: string;
    filter?: Record<string, any>;
  };
  traverse?: {
    edgeTypes: string[];
    depth?: number;
    direction?: 'out' | 'in' | 'both';
  }[];
  filter?: Record<string, any>; // applied to results
  aggregate?: {
    field: string;
    type: 'count' | 'sum' | 'avg';
  };
}

export function parseDSL(json: string): DSLQuery {
  try {
    const parsed = JSON.parse(json);
    if (!parsed.start) throw new Error('Query must have a start clause');
    validateDSL(parsed);
    return parsed as DSLQuery;
  } catch (e) {
    throw new Error(`Invalid DSL JSON: ${e.message}`);
  }
}

function validateDSL(query: DSLQuery) {
  const identifierRegex = /^[a-zA-Z0-9_]+$/;

  if (query.start.type && !identifierRegex.test(query.start.type)) {
    throw new Error(`Invalid start type: ${query.start.type}`);
  }

  if (query.traverse) {
    query.traverse.forEach(step => {
      if (step.edgeTypes) {
        step.edgeTypes.forEach(type => {
          if (!identifierRegex.test(type)) {
             throw new Error(`Invalid edge type: ${type}`);
          }
        });
      }
    });
  }

  if (query.aggregate && !identifierRegex.test(query.aggregate.field)) {
     throw new Error(`Invalid aggregate field: ${query.aggregate.field}`);
  }
}

export function buildCypherFromDSL(query: DSLQuery, tenantId: string): { cypher: string, params: any } {
  validateDSL(query); // Double check
  let cypher = `MATCH (n:GraphNode { tenantId: $tenantId }) \n`;
  const params: any = { tenantId };

  // Start Clause
  if (query.start.id) {
    cypher += `WHERE n.globalId = $startId \n`;
    params.startId = query.start.id;
  } else if (query.start.type) {
    cypher += `WHERE n.entityType = $startType \n`;
    params.startType = query.start.type;
  }

  // Traversals
  let currentNode = 'n';
  if (query.traverse) {
    query.traverse.forEach((step, idx) => {
      const nextNode = `m${idx}`;
      // Safe construction because we validated edgeTypes are strictly alphanumeric
      const edges = step.edgeTypes && step.edgeTypes.length ? `:${step.edgeTypes.join('|')}` : '';

      // Depth validation/clamping
      let depthStr = '';
      if (step.depth) {
          const d = Math.max(1, Math.min(step.depth, 5)); // Cap depth at 5 for safety
          depthStr = `*1..${d}`;
      }

      const dir = step.direction === 'in' ? '<-' : '-';
      const dirEnd = step.direction === 'out' ? '->' : '-';

      cypher += `MATCH (${currentNode})${dir}[${edges}${depthStr}]${dirEnd}(${nextNode}) \n`;
      currentNode = nextNode;
    });
  }

  // Aggregation or Return
  if (query.aggregate) {
    cypher += `RETURN ${query.aggregate.type}(${currentNode}.${query.aggregate.field}) as result`;
  } else {
    cypher += `RETURN ${currentNode}`;
  }

  return { cypher, params };
}
