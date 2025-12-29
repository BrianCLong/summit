import { NLResult } from './schema';

const redTeamIndicators = ['drop', 'delete', 'password', 'credential'];

function estimateCost(text: string): number {
  return Math.max(5, Math.min(1000, text.split(/\s+/).length * 7));
}

function buildPlan(cypher: string, estimate: number): string {
  return `Plan: cost=${estimate}; preview=${cypher.substring(0, 40)}`;
}

export function translateQuery(text: string): NLResult {
  const normalized = text.toLowerCase();
  const redFlagged = redTeamIndicators.some((flag) => normalized.includes(flag));
  const cypher = normalized.includes('shortest path')
    ? 'MATCH p=shortestPath((a)-[:FOLLOWS*]->(b)) RETURN p LIMIT 25'
    : 'MATCH (a)-[:FOLLOWS]->(b) RETURN a,b LIMIT 100';
  const estimate = estimateCost(text);
  const plan = buildPlan(cypher, estimate);
  const sandboxResult = 'rows: 0';
  return { cypher, plan, estimate, sandboxResult, redFlagged };
}
