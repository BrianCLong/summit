export interface AstNode {
  type: 'find' | 'count';
  label: string;
  filter?: { property: string; value: string } | null;
}

/**
 * Estimates the computational cost of executing a Cypher AST node.
 *
 * @param ast - The abstract syntax tree node representing the query part.
 * @returns The estimated cost score (unitless).
 */
export function estimateCost(ast: AstNode): number {
  let cost = 1;
  if (ast.filter) cost += 1;
  return cost;
}
