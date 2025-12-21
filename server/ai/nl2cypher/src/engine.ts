import fs from 'fs';
import path from 'path';

export interface NLQueryResult {
  cypher: string;
  plan: string;
  estimate: number;
  sandboxResult: string;
}

const history = new Map<string, NLQueryResult[]>();
const RED_TEAM_KEYWORDS = ['drop', 'delete', 'shutdown', 'format'];
const logPath = path.join(__dirname, '..', 'redteam.log');

function logRedTeam(text: string) {
  const lower = text.toLowerCase();
  if (RED_TEAM_KEYWORDS.some(k => lower.includes(k))) {
    fs.appendFileSync(logPath, `${new Date().toISOString()}\t${text}\n`);
  }
}

export function generateCypher(text: string): NLQueryResult {
  const cypher = `MATCH (a)-[:FOLLOWS]->(b) WHERE a.name CONTAINS '${text.slice(0, 12)}' RETURN a,b LIMIT 25`;
  const plan = 'Projected simple plan';
  const estimate = Math.max(1, Math.min(1000, text.length * 2));
  const sandboxResult = 'rows: 0';
  return { cypher, plan, estimate, sandboxResult };
}

export function runQuery(sessionId: string, text: string): NLQueryResult {
  if (!sessionId) throw new Error('sessionId is required');
  const result = generateCypher(text);
  logRedTeam(text);
  const current = history.get(sessionId) ?? [];
  history.set(sessionId, [...current, result]);
  return result;
}

export function undo(sessionId: string): NLQueryResult {
  const entries = history.get(sessionId) ?? [];
  if (entries.length <= 1) {
    return { cypher: 'ROLLBACK', plan: 'no-op', estimate: 0, sandboxResult: 'rolled back' };
  }
  const withoutLast = entries.slice(0, -1);
  const previous = withoutLast[withoutLast.length - 1];
  history.set(sessionId, withoutLast);
  return previous;
}

export function getHistory(sessionId: string): NLQueryResult[] {
  return history.get(sessionId) ?? [];
}
