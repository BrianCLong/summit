import { estimateCost, AstNode } from './costEstimator';

export interface TranslationResult {
  ast: AstNode;
  cypher: string;
  rationale: { phrase: string; clause: string }[];
  estimatedCost: number;
}

/**
 * Translates a natural language query into a Cypher query string.
 * Currently supports basic "find [Label]" and "count [Label]" patterns with optional property filters.
 *
 * @param prompt - The natural language query string.
 * @returns A TranslationResult containing the Cypher query, AST, rationale, and estimated cost.
 * @throws Error if the query pattern is unsupported.
 */
export function nl2cypher(prompt: string): TranslationResult {
  const text = prompt.trim();
  const find =
    /^find\s+(\w+)(?:\s+where\s+(\w+)\s+(?:is|=)\s+([\w\s]+))?$/i.exec(text);
  if (find) {
    const [, label, prop, value] = find;
    const ast: AstNode = {
      type: 'find',
      label,
      filter:
        prop && value ? { property: prop, value: value.trim() } : undefined,
    };
    let cypher = `MATCH (n:${label}`;
    const rationale: { phrase: string; clause: string }[] = [
      { phrase: `find ${label}`, clause: `MATCH (n:${label})` },
    ];
    if (prop && value) {
      const val = value.trim();
      cypher += ` {${prop}: '${val}'}`;
      rationale.push({
        phrase: `where ${prop} is ${val}`,
        clause: `${prop}: '${val}'`,
      });
    }
    cypher += ') RETURN n';
    rationale.push({ phrase: 'return nodes', clause: 'RETURN n' });
    const estimatedCost = estimateCost(ast);
    return { ast, cypher, rationale, estimatedCost };
  }
  const count =
    /^count\s+(\w+)(?:\s+where\s+(\w+)\s+(?:is|=)\s+([\w\s]+))?$/i.exec(text);
  if (count) {
    const [, label, prop, value] = count;
    const ast: AstNode = {
      type: 'count',
      label,
      filter:
        prop && value ? { property: prop, value: value.trim() } : undefined,
    };
    let cypher = `MATCH (n:${label}`;
    const rationale: { phrase: string; clause: string }[] = [
      { phrase: `count ${label}`, clause: `MATCH (n:${label})` },
    ];
    if (prop && value) {
      const val = value.trim();
      cypher += ` {${prop}: '${val}'}`;
      rationale.push({
        phrase: `where ${prop} is ${val}`,
        clause: `${prop}: '${val}'`,
      });
    }
    cypher += ') RETURN count(n) AS count';
    rationale.push({ phrase: 'return count', clause: 'count(n)' });
    const estimatedCost = estimateCost(ast);
    return { ast, cypher, rationale, estimatedCost };
  }
  throw new Error('Unsupported query');
}
