"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.planRoute = planRoute;
const zod_1 = require("zod");
const cron_parser_1 = __importDefault(require("cron-parser"));
const PlanReq = zod_1.z.object({
    task: zod_1.z.string(),
    input: zod_1.z.string().optional(),
    env: zod_1.z.custom(),
    loa: zod_1.z.number().int().min(0).max(3),
    meta: zod_1.z.record(zod_1.z.any()).optional(),
    controls: zod_1.z.object({
        cost_guard: zod_1.z.object({ usd_cap: zod_1.z.number().gte(0).default(0.0), stop_on_cap: zod_1.z.boolean().default(true) }).optional(),
        slo_target_ms: zod_1.z.number().int().positive().optional(),
        allow_hosted: zod_1.z.boolean().optional(),
    }).partial().optional()
});
// ---- Utilities -------------------------------------------------------------
const W = { perf: 0.40, cost: 0.20, reliability: 0.15, local: 0.15, headroom: 0.10 };
function matchesCron(expr, now = new Date()) {
    try {
        const it = cron_parser_1.default.parseExpression(expr);
        // true if now is within the current minute tick
        const prev = it.prev();
        const next = it.next();
        return (prev.getTime() <= now.getTime() && now.getTime() < next.getTime());
    }
    catch {
        return false;
    }
}
function ruleMatch(rule, ctx) {
    if (!rule.enabled)
        return false;
    const w = rule.when || {};
    if (w.env && !w.env.includes(ctx.env))
        return false;
    if (w.task && !w.task.includes(ctx.task))
        return false;
    if (w.tags && !w.tags.every(t => ctx.tags.includes(t)))
        return false;
    if (w.tenant && ctx.tenant && !w.tenant.includes(ctx.tenant))
        return false;
    if (w.time_cron && !matchesCron(w.time_cron))
        return false;
    return true;
}
function p95For(model, b) {
    return b?.windows?.h1?.per_model?.[model]?.p95_ms ??
        b?.windows?.m1?.per_model?.[model]?.p95_ms ??
        b?.windows?.h1?.totals?.p95_ms;
}
function rpmHeadroom(model, b) {
    const m = b?.windows?.m1?.per_model?.[model];
    if (!m)
        return 1.0;
    const f = m.fraction_of_cap;
    return (f == null) ? 1.0 : Math.max(0, 1 - f);
}
function estimateCostUSD(tokens, card) {
    const rate = card?.cost_per_1k ?? 0.0;
    return (tokens / 1000.0) * rate;
}
function currentSpend(burn, model) {
    if (!burn || !model)
        return 0;
    return burn.spend_day_usd?.[model] ?? 0;
}
function withinBudget(policy, burn, model, maxPriceHint) {
    const cap = policy.budgets?.[model]?.daily_limit_usd; // Access budget from policy.budgets
    if (cap == null)
        return true;
    const spent = currentSpend(burn, model);
    const ceiling = Math.min(cap, maxPriceHint ?? Number.POSITIVE_INFINITY);
    return spent <= ceiling;
}
function sloForecast(model, rule, burn) {
    const hist = latencyP95(burn, model);
    const target = rule.p95_target_ms ?? 6000;
    // crude saturation estimate: 1 when hist > target, else 0.3 scaled
    const saturation = hist > target ? Math.min(1, (hist - target) / target + 0.5) : Math.max(0.1, hist / Math.max(1, target));
    return { p95_ms: hist || target, saturation };
}
function costForecast(model, maxPrice) {
    // If you have a live price table, swap this in.
    return Math.min(maxPrice ?? Number.POSITIVE_INFINITY, 0.02); // placeholder few cents
}
const metricsFetcher_1 = require("../metricsFetcher");
function candidateScore(model, rule, burn, metricsCache) {
    const slo = sloForecast(model, rule, burn);
    const cost = costForecast(model, rule.max_price_usd);
    // Incorporate Prometheus metrics
    const p95_latency = metricsCache?.[`p95_latency_${model}`] || slo.p95_ms;
    const error_rate = metricsCache?.error_rate || 0; // Global error rate for now
    const budget_fraction = metricsCache?.[`budget_fraction_${model}`] || 0;
    // Lower is better
    const costWeight = 0.4;
    const sloWeight = 0.6;
    // New scoring logic incorporating Prometheus metrics
    // Penalize for high latency, high error rate, and high budget fraction
    const latencyPenalty = p95_latency / (rule.p95_target_ms ?? 6000);
    const errorPenalty = error_rate * 100; // Scale error rate
    const budgetPenalty = budget_fraction * 0.5; // Moderate penalty for budget usage
    return (sloWeight * latencyPenalty) + (costWeight * cost) + errorPenalty + budgetPenalty;
}
// ---- Data access (replace with your real sources) --------------------------
const policy_1 = require("../policy");
async function getPolicy() {
    return (0, policy_1.loadPolicy)();
}
async function getBurndown() {
    return fetchJSON(`${PROXY_BASE}/status/burndown.json`);
}
async function loadHealth() {
    return fetchJSON(`${PROXY_BASE}/status/health.json`);
}
async function getModels(ids) {
    // Dummy implementation for now. In a real system, this would fetch from a model catalog.
    const allModels = [
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
async function getProviderSpentUSD(provider) {
    // Placeholder: In a real system, this would fetch actual spent amounts from a billing system.
    return 0;
}
// ---- Handler ---------------------------------------------------------------
const api_1 = require("@opentelemetry/api");
const tracer = api_1.trace.getTracer('symphony-operator-kit', '1.0.0');
async function planRoute(req, res) {
    return tracer.startActiveSpan('planRoute', async (span) => {
        try {
            const parsed = PlanReq.safeParse(req.body);
            if (!parsed.success) {
                span.setStatus({ code: api_1.SpanStatusCode.ERROR, message: parsed.error.message });
                return res.status(400).json({ error: parsed.error.flatten() });
            }
            const { task, env, loa, meta, controls } = parsed.data;
            span.setAttributes({
                'symphony.plan.task': task,
                'symphony.plan.env': env,
                'symphony.plan.loa': loa,
            });
            const tags = meta?.tags || [];
            const policy = await getPolicy();
            // Hard gates
            const hostedAllowed = controls?.allow_hosted ?? policy.allow_hosted[env] ?? false;
            const maxLoa = policy.max_loa[env] ?? 0;
            if (policy.kill_switch)
                return res.json({ candidates: [], policy: { allow: false, reason: "kill_switch=1", max_loa: maxLoa, hosted_allowed: hostedAllowed } });
            if (loa > maxLoa)
                return res.json({ candidates: [], policy: { allow: false, reason: `loa ${loa} > max_loa ${maxLoa}`, max_loa: maxLoa, hosted_allowed: hostedAllowed } });
            // Route selection
            const matched = policy.routes.filter(r => ruleMatch(r, { env, task, tags, tenant: meta?.tenant }));
            const weights = matched[0]?.then?.weights || policy.defaults.weights || W;
            // Candidate set
            const ruleModels = matched.flatMap(r => r.then.models);
            const fallback = policy.defaults.model_chain || [];
            const uniqueIds = Array.from(new Set([...ruleModels, ...fallback]));
            let cards = await getModels(uniqueIds);
            // Filter by hosted policy
            if (!hostedAllowed)
                cards = cards.filter(c => c.local === true);
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
                    ranked.push({ model: m.id, score: -1e9, reasons: [`budget: ${budget.reason}`], p95_ms: p95, est_cost_usd: cost });
                    continue;
                }
                // SLO check (soft)
                const reasons = [];
                if (sloTarget && p95 && p95 > sloTarget)
                    reasons.push(`p95 ${Math.round(p95)}ms > slo ${sloTarget}ms`);
                const score = candidateScore(m.id, rule, bd, metricsFetcher_1.metricsCache);
                ranked.push({ model: m.id, score, reasons: reasons.length ? reasons : ["ok"], p95_ms: p95, est_cost_usd: cost });
            }
            ranked.sort((a, b) => b.score - a.score || a.model.localeCompare(b.model));
            const top = ranked[0];
            const resp = {
                decision: top ? { model: top.model, confidence: Number((Math.min(1, Math.max(0, top.score)))).toFixed ? parseFloat((Math.min(1, Math.max(0, top.score))).toFixed(2)) : 0.8, reason: (top.reasons || []).join("; ") } : undefined,
                candidates: ranked,
                policy: { allow: true, max_loa: maxLoa, hosted_allowed: hostedAllowed },
                prompt_preview: { system: "You are Symphony…", user: String(meta?.prompt_preview || "") }
            };
            return res.json(resp);
        }
        finally {
        }
        function deny(reason, code, input, policy, rule) {
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
    });
}
