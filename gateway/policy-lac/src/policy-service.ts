import fs from 'fs';
import path from 'path';
import { Context, Decision, evaluate, loadPolicy } from './policy-engine';

export type DecisionSnapshot = { context: Context; decision: Decision };
export type DecisionDiff = { context: Context; current: Decision; target: Decision };

function normalizeContext(raw: Partial<Context>): Context {
  if (!raw.action || !raw.resource) {
    throw new Error('Context requires action and resource');
  }
  return {
    action: raw.action,
    resource: raw.resource,
    attributes: typeof raw.attributes === 'object' && raw.attributes !== null ? raw.attributes : {}
  };
}

export class PolicyService {
  private policy: any;
  constructor(private readonly policyPath: string) {
    this.policy = loadPolicy(policyPath);
  }

  get policyVersion(): string {
    return this.policy.version ?? 'unknown';
  }

  reload(): void {
    this.policy = loadPolicy(this.policyPath);
  }

  evaluateContext(rawContext: Partial<Context>): Decision {
    const context = normalizeContext(rawContext);
    return evaluate(this.policy, context);
  }

  simulate(contexts: Partial<Context>[]): DecisionSnapshot[] {
    const normalized = contexts.map(normalizeContext);
    return normalized
      .sort((a, b) => `${a.action}:${a.resource}`.localeCompare(`${b.action}:${b.resource}`))
      .map((context) => ({ context, decision: evaluate(this.policy, context) }));
  }

  diff(targetPolicyPath: string, contexts: Partial<Context>[]): DecisionDiff[] {
    const targetPolicy = loadPolicy(targetPolicyPath);
    const normalized = contexts.map(normalizeContext);
    return normalized
      .map((context) => {
        const current = evaluate(this.policy, context);
        const target = evaluate(targetPolicy, context);
        return { context, current, target };
      })
      .filter((entry) => entry.current.allowed !== entry.target.allowed || entry.current.reason !== entry.target.reason);
  }
}

export function loadExampleContexts(): Context[] {
  const contextsDir = path.join(__dirname, '..', 'contexts', 'examples');
  const files = fs.readdirSync(contextsDir).filter((file) => file.endsWith('.json')).sort();
  return files.map((file) => {
    const payload = JSON.parse(fs.readFileSync(path.join(contextsDir, file), 'utf8')) as Partial<Context>;
    return normalizeContext(payload);
  });
}
