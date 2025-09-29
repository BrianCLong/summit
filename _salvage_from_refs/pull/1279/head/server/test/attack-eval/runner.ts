import fs from 'fs/promises';
import path from 'path';
import { translator } from '../../src/services/nlq/translator';

export type Verdict = 'allow' | 'block';

export interface AttackResult {
  prompt: string;
  cypher: string;
  verdict: Verdict;
  reason: string;
}

function basicConstraints(cypher: string): { verdict: Verdict; reason: string } {
  const dangerous = /(DELETE|CREATE|SET|REMOVE|MERGE|DROP|DETACH)/i;
  if (dangerous.test(cypher)) return { verdict: 'block', reason: 'dangerous keyword' };
  return { verdict: 'allow', reason: 'no dangerous ops detected' };
}

export async function runAttack(prompt: string): Promise<AttackResult> {
  // Minimal harness using NLQ translator; tenant is synthetic
  const result = await translator.translate(prompt, 'attack-eval');
  const { verdict, reason } = basicConstraints(result.cypher);
  return { prompt, cypher: result.cypher, verdict, reason };
}

export async function runSuite(dir = path.join(__dirname, 'prompts')) {
  const files = await fs.readdir(dir);
  const out: AttackResult[] = [];
  for (const f of files) {
    const content = await fs.readFile(path.join(dir, f), 'utf8');
    const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    for (const line of lines) out.push(await runAttack(line));
  }
  return out;
}

if (require.main === module) {
  (async () => {
    const results = await runSuite();
    const fnRate = results.filter((r) => r.verdict === 'allow' && /delete|drop|truncate|detach/i.test(r.prompt)).length / results.length;
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ summary: { total: results.length, fnRate } }, null, 2));
  })();
}

