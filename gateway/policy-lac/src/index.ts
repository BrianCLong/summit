import express from 'express';
import fs from 'fs';
import path from 'path';

type Effect = 'allow' | 'deny';
interface PolicyRule {
  operation: string;
  effect: Effect;
  reason: string;
}

interface EvaluationResult {
  allowed: boolean;
  reason: string;
  operation: string;
}

class PolicyEngine {
  private rules: PolicyRule[] = [];

  constructor(policyPath: string) {
    const raw = fs.readFileSync(policyPath, 'utf-8');
    const parsed = JSON.parse(raw) as { rules: PolicyRule[] };
    this.rules = (parsed.rules || []).map(rule => ({ ...rule, operation: rule.operation.trim() }));
  }

  evaluate(operation: string): EvaluationResult {
    const normalized = operation.trim();
    if (isUnsafeOperation(normalized)) {
      return { allowed: false, reason: 'Unsafe operation blocked at edge', operation: normalized };
    }
    const rule = this.rules.find(r => r.operation === normalized);
    if (rule) {
      return { allowed: rule.effect === 'allow', reason: rule.reason, operation: normalized };
    }
    return { allowed: false, reason: 'Denied by default (no matching policy)', operation: normalized };
  }

  simulate(operations: string[]): EvaluationResult[] {
    const results = operations.map(op => this.evaluate(op));
    return results.sort((a, b) => a.operation.localeCompare(b.operation));
  }

  diff(updatedRules: PolicyRule[]): { removed: PolicyRule[]; added: PolicyRule[] } {
    const currentKey = (r: PolicyRule) => `${r.operation}:${r.effect}`;
    const currentSet = new Set(this.rules.map(currentKey));
    const updatedSet = new Set(updatedRules.map(currentKey));
    const removed = this.rules.filter(r => !updatedSet.has(currentKey(r)));
    const added = updatedRules.filter(r => !currentSet.has(currentKey(r)));
    return {
      removed: removed.sort((a, b) => a.operation.localeCompare(b.operation)),
      added: added.sort((a, b) => a.operation.localeCompare(b.operation))
    };
  }
}

const policyPath = path.join(__dirname, '..', 'policies', 'default.json');
const engine = new PolicyEngine(policyPath);

const app = express();
app.use(express.json());

function isUnsafeOperation(operation: string): boolean {
  const lowered = operation.toLowerCase();
  return lowered.includes('drop') || lowered.includes('truncate') || lowered.startsWith('admin.') || lowered.startsWith('db.');
}

app.post('/policy/explain', (req, res) => {
  const operation = req.body?.operation || 'policy.explain';
  const evaluation = engine.evaluate(operation);
  res.json({ ...evaluation });
});

app.post('/policy/snapshot', (req, res) => {
  const proposedRules: PolicyRule[] = req.body?.rules || [];
  const diff = engine.diff(proposedRules);
  res.json({ snapshot: { removed: diff.removed, added: diff.added } });
});

app.post('/policy/simulate', (req, res) => {
  const operations: string[] = req.body?.operations || [];
  const simulation = engine.simulate(operations);
  res.json({ decisions: simulation });
});

app.listen(4000, () => console.log('[policy-lac] listening on 4000'));

export { PolicyEngine };
