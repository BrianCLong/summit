import type { Request, Response } from "express"; // swap if you use another server
import { z } from "zod";
import cronParser from "cron-parser";

// ---- Types (align with your updated policy schema) -------------------------
type Env = "dev"|"staging"|"prod";

type Policy = {
  kill_switch: boolean;
  max_loa: Record<Env, number>;
  allow_hosted: Record<Env, boolean>;
  defaults: {
    model_chain: string[];              // fallback order
    weights?: { perf?: number; cost?: number; reliability?: number; local?: number; headroom?: number }
  };
  windows: {                            // named windows caps (rpm/budget)
    [key: string]: { type: "daily_utc_00"|"weekly_utc_00"|"rolling_5h"|"daily_pacific_00"; rpm_cap?: number }
  };
  budgets?: {                           // provider budgets (daily)
    [provider: string]: { daily_limit_usd: number }
  };
  routes: RouteRule[];
};

type RouteRule = {
  id: string;
  enabled: boolean;
  when: Partial<{
    env: Env[]; tenant: string[]; task: string[]; tags: string[];
    time_cron: string;                    // e.g., "*/5 * * * *"
    hosted_allowed: boolean;              // override
    max_loa: number;                      // override
  }>;
  then: {
    models: string[];                     // candidates (ids like "ollama/llama3:8b")
    prompt_style?: string;                // optional system prompt id
    weights?: Policy["defaults"]["weights"];
  };
};

type Burndown = {
  windows: {
    m1: WindowStats; h1: WindowStats; d1: WindowStats
  }
};
type WindowStats = {
  reset_at: string;
  per_model: Record<string, {
    req: number; tokens: number; p50_ms?: number; p95_ms?: number;
    caps?: { minute_rpm_cap?: number }; fraction_of_cap?: number;
  }>;
  totals: { req: number; p50_ms?: number; p95_ms?: number; cost: number };
};

type ModelCard = { id: string; provider: string; local?: boolean; cost_per_1k?: number; reliability?: number };

const PlanReq = z.object({
  task: z.string(),
  input: z.string().optional(),
  env: z.custom<Env>(),
  loa: z.number().int().min(0).max(3),
  meta: z.record(z.any()).optional(),
  controls: z.object({
    cost_guard: z.object({ usd_cap: z.number().gte(0).default(0.0), stop_on_cap: z.boolean().default(true) }).optional(),
    slo_target_ms: z.number().int().positive().optional(),
    allow_hosted: z.boolean().optional(),
  }).partial().optional()
});

type PlanResp = {
  decision?: { model: string; confidence: number; reason: string };
  candidates: Array<{ model: string; score: number; reasons: string[]; p95_ms?: number; est_cost_usd?: number }>;
  policy: { allow: boolean; reason?: string; max_loa: number; hosted_allowed: boolean };
  prompt_preview?: { system?: string; user?: string };
};

// ---- Utilities -------------------------------------------------------------
const W = { perf: 0.40, cost: 0.20, reliability: 0.15, local: 0.15, headroom: 0.10 };

function matchesCron(expr: string, now = new Date()): boolean {
  try {
    const it = cronParser.parseExpression(expr);
    // true if now is within the current minute tick
    const prev = it.prev(); const next = it.next();
    return (prev.getTime() <= now.getTime() && now.getTime() < next.getTime());
  } catch { return false; }
}

function ruleMatch(rule: RouteRule, ctx: { env: Env; task: string; tags: string[]; tenant?: string }) {
  if (!rule.enabled) return false;
  const w = rule.when || {};
  if (w.env && !w.env.includes(ctx.env)) return false;
  if (w.task && !w.task.includes(ctx.task)) return false;
  if (w.tags && !w.tags.every(t => ctx.tags.includes(t))) return false;
  if (w.tenant && ctx.tenant && !w.tenant.includes(ctx.tenant)) return false;
  if (w.time_cron && !matchesCron(w.time_cron)) return false;
  return true;
}

function p95For(model: string, b: Burndown): number | undefined {
  return b?.windows?.h1?.per_model?.[model]?.p95_ms ??
         b?.windows?.m1?.per_model?.[model]?.p95_ms ??
         b?.windows?.h1?.totals?.p95_ms;
}

function rpmHeadroom(model: string, b: Burndown): number {
  const m = b?.windows?.m1?.per_model?.[model];
  if (!m) return 1.0;
  const f = m.fraction_of_cap;
  return (f == null) ? 1.0 : Math.max(0, 1 - f);
}

function estimateCostUSD(tokens: number, card?: ModelCard): number {
  const rate = card?.cost_per_1k ?? 0.0;
  return (tokens / 1000.0) * rate;
}

function currentSpend(burn?: Burndown, model?: string): number {
  if (!burn || !model) return 0;
  return burn.spend_day_usd?.[model] ?? 0;
}

function withinBudget(policy: Policy, burn: Burndown | undefined, model: string, maxPriceHint?: number): { ok: boolean; reason?: string } {
  const cap = policy.budgets?.[model]?.daily_limit_usd; // Access budget from policy.budgets
  if (cap == null) return true;
  const spent = currentSpend(burn, model);
  const ceiling = Math.min(cap, maxPriceHint ?? Number.POSITIVE_INFINITY);
  return spent <= ceiling;
}

function sloForecast(model: string, rule: RouteRule, burn?: Burndown) {
  const hist = latencyP95(burn, model);
  const target = rule.p95_target_ms ?? 6000;
  // crude saturation estimate: 1 when hist > target, else 0.3 scaled
  const saturation = hist > target ? Math.min(1, (hist - target) / target + 0.5) : Math.max(0.1, hist / Math.max(1, target));
  return { p95_ms: hist || target, saturation };
}

function costForecast(model: string, maxPrice?: number): number {
  // If you have a live price table, swap this in.
  return Math.min(maxPrice ?? Number.POSITIVE_INFINITY, 0.02); // placeholder few cents
}

import { metricsCache } from "../metricsFetcher";

import { metricsCache } from "../metricsFetcher";

import { metricsCache } from "../metricsFetcher";

import { metricsCache } from "../metricsFetcher";

import { metricsCache } from "../metricsFetcher";

import { metricsCache } from "../metricsFetcher";

function candidateScore(model: string, rule: RouteRule, burn?: Burndown, metricsCache?: Record<string, any>) {
  const slo = sloForecast(model, rule, burn);
  const cost = costForecast(model, rule.max_price_usd);

  // Incorporate Prometheus metrics
  const p95_latency = metricsCache?.[`p95_latency_${model}`] || slo.p95_ms;
  const error_rate = metricsCache?.error_rate || 0; // Global error rate for now
  const budget_fraction = metricsCache?.[`budget_fraction_${model}`] || 0;

  // Lower is better
  const costWeight = 0.4;
  const sloWeight  = 0.6;

  // New scoring logic incorporating Prometheus metrics
  // Penalize for high latency, high error rate, and high budget fraction
  const latencyPenalty = p95_latency / (rule.p95_target_ms ?? 6000);
  const errorPenalty = error_rate * 100; // Scale error rate
  const budgetPenalty = budget_fraction * 0.5; // Moderate penalty for budget usage

  return (sloWeight * latencyPenalty) + (costWeight * cost) + errorPenalty + budgetPenalty;
}

// ---- Data access (replace with your real sources) --------------------------
import { loadPolicy as loadPolicyFromFile } from "../policy";
import { Policy, Burndown, Health } from "../types/policy";

async function getPolicy(): Promise<Policy> {
  return loadPolicyFromFile();
}

async function getBurndown(): Promise<Burndown> {
  return fetchJSON<Burndown>(`${PROXY_BASE}/status/burndown.json`);
}

async function loadHealth(): Promise<Health | undefined> {
  return fetchJSON<Health>(`${PROXY_BASE}/status/health.json`);
}

async function getModels(ids: string[]): Promise<ModelCard[]> {
  // Dummy implementation for now. In a real system, this would fetch from a model catalog.
  const allModels: ModelCard[] = [
    { id: "openai/chatgpt-plus", provider: "openai", local: false, cost_per_1k: 0.001, reliability: 0.99 },
    { id: "google/gemini-pro", provider: "google", local: false, cost_per_1k: 0.0005, reliability: 0.98 },
    { id: "anthropic/claude-pro", provider: "anthropic", local: false, cost_per_1k: 0.002, reliability: 0.97 },
    { id: "xai/grok", provider: "xai", local: false, cost_per_1k: 0.0008, reliability: 0.95 },
    { id: "perplexity/api", provider: "perplexity", local: false, cost_per_1k: 0.0003, reliability: 0.96 },
    { id: "deepseek/api", provider: "deepseek", local: false, cost_per_1k: 0.0002, reliability: 0.94 },
    { id: "venice/api", provider: "venice", local: false, cost_per_1k: 0.0001, reliability: 0.93 },
    { id: "local/ollama", provider: "ollama", local: true, cost_per_1k: 0, reliability: 1.0 },
    { id: "local/lmstudio", provider: "lmstudio", local: true, cost_per_1k: 0, reliability: 1.0 },
    { id: "local/ollama-coder", provider: "ollama", local: true, cost_per_1k: 0, reliability: 1.0 },
  ];
  return allModels.filter(m => ids.includes(m.id));
}

async function getProviderSpentUSD(provider: string): Promise<number> {
  // Placeholder: In a real system, this would fetch actual spent amounts from a billing system.
  return 0;
}

// ---- Handler ---------------------------------------------------------------
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('symphony-operator-kit', '1.0.0');

export async function planRoute(req: Request, res: Response) {
  return tracer.startActiveSpan('planRoute', async (span) => {
    try {
      const parsed = PlanReq.safeParse(req.body);
      if (!parsed.success) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: parsed.error.message });
        return res.status(400).json({ error: parsed.error.flatten() });
      }

      const { task, env, loa, meta, controls } = parsed.data;
      span.setAttributes({
        'symphony.plan.task': task,
        'symphony.plan.env': env,
        'symphony.plan.loa': loa,
      });
  const tags = (meta?.tags as string[]) || [];

  const policy = await getPolicy();

  // Hard gates
  const hostedAllowed = controls?.allow_hosted ?? policy.allow_hosted[env] ?? false;
  const maxLoa = policy.max_loa[env] ?? 0;
  if (policy.kill_switch) return res.json({ candidates: [], policy:{allow:false, reason:"kill_switch=1", max_loa:maxLoa, hosted_allowed: hostedAllowed} } as PlanResp);
  if (loa > maxLoa)       return res.json({ candidates: [], policy:{allow:false, reason:`loa ${loa} > max_loa ${maxLoa}`, max_loa:maxLoa, hosted_allowed: hostedAllowed} } as PlanResp);

  // Route selection
  const matched = policy.routes.filter(r => ruleMatch(r, { env, task, tags, tenant: meta?.tenant }));
  const weights = matched[0]?.then?.weights || policy.defaults.weights || W;

  // Candidate set
  const ruleModels = matched.flatMap(r => r.then.models);
  const fallback   = policy.defaults.model_chain || [];
  const uniqueIds  = Array.from(new Set([...ruleModels, ...fallback]));
  let cards = await getModels(uniqueIds);

  // Filter by hosted policy
  if (!hostedAllowed) cards = cards.filter(c => c.local === true);

  // Load telemetry/burndown
  const bd = await getBurndown();

  // Score candidates
  const expectedTokens = Number(meta?.expected_tokens ?? 1500); // caller can override
  const sloTarget = controls?.slo_target_ms;
  const localBias = true;

  const ranked = [];
  for (const m of cards) {
    const p95 = p95For(m.id, bd);
    const head = rpmHeadroom(m.id, bd);
    const cost = estimateCostUSD(expectedTokens, m);

    // budget check (provider-level)
    const spent = await getProviderSpentUSD(m.provider);
    const budget = withinBudget(policy, bd, m.provider, cost, rule.max_price_usd ?? input.max_cost_usd);
    if (!budget.ok) {
      ranked.push({ model: m.id, score: -1e9, reasons:[`budget: ${budget.reason}`], p95_ms: p95, est_cost_usd: cost });
      continue;
    }

    // SLO check (soft)
    const reasons: string[] = [];
    if (sloTarget && p95 && p95 > sloTarget) reasons.push(`p95 ${Math.round(p95)}ms > slo ${sloTarget}ms`);

    const score = candidateScore(m.id, rule, bd, metricsCache);
    ranked.push({ model: m.id, score, reasons: reasons.length? reasons : ["ok"], p95_ms: p95, est_cost_usd: cost });
  }

  ranked.sort((a,b)=> b.score - a.score || a.model.localeCompare(b.model));
  const top = ranked[0];

  const resp: PlanResp = {
    decision: top ? { model: top.model, confidence: Number((Math.min(1, Math.max(0, top.score)))).toFixed ? parseFloat((Math.min(1, Math.max(0, top.score))).toFixed(2)) : 0.8, reason: (top.reasons||[]).join("; ") } : undefined,
    candidates: ranked,
    policy: { allow: true, max_loa: maxLoa, hosted_allowed: hostedAllowed },
    prompt_preview: { system: "You are Symphony…", user: String(meta?.prompt_preview || "") }
  };

  return res.json(resp);
}

function deny(reason: string, code: DenyCode, input: PlanInput, policy?: Policy, rule?: RouteRule): PlanDecision {
  return {
    decision: null,
    policy: { allow: false, reason, deny_code: code, rule },
    audit_id: undefined,
    audit: {
      work_unit: input.work_unit,
      loa: input.loa,
      privacy: input.privacy,
      rule_id: rule?.id,
      version: policy?.policy?.version, // Access version from policy.policy.version
      updated_by: process.env.OPERATOR_USER || "system",
      request_id: process.env.REQUEST_ID,
      local_only: LOCAL_ONLY
    }
  };
}

// Default export for route handler usage
export default { plan: planRoute };