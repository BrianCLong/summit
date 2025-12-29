// server/src/nl2cypher/cypherGenerator.ts
import { ParseResult } from './parser';

export function generateCypher(ast: ParseResult): string {
  let cypher = `MATCH (n:${ast.label}`;

  if (ast.filter) {
    cypher += ` {${ast.filter.property}: '${ast.filter.value}'}`;
  }

  cypher += ') ';

  if (ast.type === 'count') {
    cypher += 'RETURN count(n) AS count';
  } else {
    cypher += 'RETURN n';
  }

  return cypher;
}
