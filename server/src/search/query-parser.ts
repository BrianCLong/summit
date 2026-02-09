
export interface ParsedQuery {
  term: string;
  filters: Record<string, any>;
  entities: string[];
  relationships: {
    type: string;
    target: string;
  }[];
  temporal: {
    field: string;
    operator: string;
    value: string;
  }[];
  booleanLogic: {
    op: 'AND' | 'OR' | 'NOT';
    filters: ParsedQuery[];
  }[];
}

/**
 * Parses natural language query into a structured object.
 * Currently uses simple regex heuristics.
 * Future: Use LLM for true semantic parsing.
 */
export function parseQuery(query: string): ParsedQuery {
  const result: ParsedQuery = {
    term: '',
    filters: {},
    entities: [],
    relationships: [],
    temporal: [],
    booleanLogic: []
  };

  // 1. Extract "key:value" filters
  const filterRegex = /(\w+):"([^"]+)"|(\w+):(\S+)/g;
  let match;
  let cleanQuery = query;

  while ((match = filterRegex.exec(query)) !== null) {
    const key = match[1] || match[3];
    const value = match[2] || match[4];

    // Check for temporal keywords
    if (['since', 'after', 'before', 'until'].includes(key)) {
        result.temporal.push({
            field: 'created_at',
            operator: ['since', 'after'].includes(key) ? '>=' : '<=',
            value: value // Basic ISO or date string assumed for now
        });
    } else if (key === 'entity' || key === 'org' || key === 'person') {
        result.entities.push(value);
    } else if (key === 'rel' || key === 'linked_to') {
        result.relationships.push({ type: 'RELATED_TO', target: value });
    } else {
        result.filters[key] = value;
    }

    // Remove from query string
    cleanQuery = cleanQuery.replace(match[0], '');
  }

  // 2. Extract boolean logic (Very basic)
  // For now, we assume the remaining string is the search term.
  // A real boolean parser would build an AST.

  result.term = cleanQuery.trim().replace(/\s+/g, ' ');

  return result;
}
