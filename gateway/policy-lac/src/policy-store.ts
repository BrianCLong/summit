import fs from "fs";
import path from "path";
import { evaluate, loadPolicy, Decision, Context } from "./policy-engine";

export type LoadedPolicy = {
  id: string;
  path: string;
  policy: any;
};

export function discoverPolicies(policiesDir: string): LoadedPolicy[] {
  if (!fs.existsSync(policiesDir)) {
    throw new Error(`Policy directory not found: ${policiesDir}`);
  }
  return fs
    .readdirSync(policiesDir)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => {
      const full = path.join(policiesDir, file);
      return {
        id: path.basename(file, ".json"),
        path: full,
        policy: loadPolicy(full),
      };
    });
}

export function mergePolicies(policies: LoadedPolicy[]) {
  const combined = { version: "v1", rules: [] as any[] };
  for (const { policy, id } of policies) {
    const rules = policy.rules.map((rule: any) => ({ ...rule, id: rule.id || id }));
    combined.rules.push(...rules);
  }
  return combined;
}

export function explainDecision(policy: any, ctx: Context): Decision {
  return evaluate(policy, ctx);
}

export function diffPolicies(left: any, right: any) {
  const leftRules = new Map(left.rules.map((r: any) => [r.id, r]));
  const rightRules = new Map(right.rules.map((r: any) => [r.id, r]));

  const removed: string[] = [];
  const added: string[] = [];
  const changed: string[] = [];

  for (const id of leftRules.keys()) {
    if (!rightRules.has(id)) {
      removed.push(id);
    } else if (JSON.stringify(leftRules.get(id)) !== JSON.stringify(rightRules.get(id))) {
      changed.push(id);
    }
  }

  for (const id of rightRules.keys()) {
    if (!leftRules.has(id)) {
      added.push(id);
    }
  }

  return { added, removed, changed };
}
