export type NLResult = { cypher: string; plan: string; estimate: number; sandboxResult: string };

const redTeamIndicators = ['drop database', 'rm -rf', 'delete all', 'shutdown'];

export function translate(text: string): NLResult {
  const normalized = text.toLowerCase();
  let cypher = 'MATCH (n) RETURN n LIMIT 25';
  let plan = 'Simple scan';
  let estimate = Math.max(5, text.split(/\s+/).length * 2);

  if (normalized.includes('shortest path')) {
    cypher = 'MATCH p = shortestPath((a)-[:FOLLOWS*..5]->(b)) RETURN p';
    plan = 'Shortest path with upper bound length 5';
    estimate = 12;
  } else if (normalized.includes('followers') || normalized.includes('follows')) {
    cypher = 'MATCH (a)-[:FOLLOWS]->(b) RETURN a,b LIMIT 50';
    plan = 'Expand from follower edges';
    estimate = 30;
  }

  const sandboxResult = `rows: ${estimate > 20 ? 20 : estimate}`;
  return { cypher, plan, estimate, sandboxResult };
}

export function detectRedTeam(text: string): string[] {
  return redTeamIndicators.filter((indicator) => text.toLowerCase().includes(indicator));
}
