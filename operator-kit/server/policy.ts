import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import YAML from 'yaml';

export type Defaults = {
  stream: boolean;
  reserve_fraction: number;
  max_sla_ms: number;
};

export type Quota = {
  type: string;
  window?: string;
  unit?: string;
  cap?: string;
  period?: string;
  tz?: string;
  units?: {
    rpd?: string;
    tpd?: string;
  };
};

export type ModelConfig = {
  name: string;
  class: string;
  quota: Quota;
  allow_tasks: string[];
  loa_max: number;
};

export type Match = {
  task: string;
  loa: number;
};

export type RouteConfig = {
  prefer: string[];
  fallback: string[];
  max_cost_usd: number;
  stream: boolean;
  context_budget_tokens: number;
};

export type RoutingRule = {
  match: Match;
  route: RouteConfig;
};

export type WorkUnitOverridesSchema = {
  tokens_max: string; // int
  context_budget_tokens: string; // int
  temperature: { min: number; max: number };
  streaming: boolean;
  tools_allowed: string[];
  cost_ceiling_usd: number; // float
  provider_hints: string[];
};

export type Policy = {
  policy: {
    version: number;
    defaults: Defaults;
    models: ModelConfig[];
    routing_rules: RoutingRule[];
  };
  work_unit_overrides_schema: WorkUnitOverridesSchema;
  _hash?: string;
  _loadedAt?: number;
};

const POLICY_FILE =
  process.env.POLICY_FILE || path.resolve('config/router.policy.yml');
let cached: Policy | null = null;

export function loadPolicy(): Policy {
  if (cached) return cached;
  const text = fs.readFileSync(POLICY_FILE, 'utf8');
  const p = YAML.parse(text) as Policy;
  p._loadedAt = Date.now();
  p._hash = crypto.createHash('sha1').update(text).digest('hex');
  cached = p;
  return p;
}

export function watchPolicy(onChange: (p: Policy) => void) {
  fs.watch(POLICY_FILE, { persistent: false }, () => {
    try {
      cached = null;
      const p = loadPolicy();
      onChange(p);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('policy reload failed', e);
    }
  });
}
