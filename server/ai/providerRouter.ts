// MIT License
// Simple provider router honoring free-first policy with budgets and graceful fallback.
import assert from "node:assert";
import fetch from "node-fetch";

type ModelTag = "fast.code"|"fast.summarize"|"cheap.translate"|"reason.long"|"reason.safety"|"reason.dense"|"vision.ocr"|"rag.graph"|"rag.docs";

interface RouteOpts {
  tag: ModelTag;
  inputTokens: number;
  latencyBudgetMs: number;
  hardCostUsd: number;    // 0 for free-only bootstrap
  softWarnUsd: number;    // e.g., 0.5
  allowPaid?: boolean;
}

interface Provider {
  name: "groq"|"openrouter"|"openai"|"anthropic";
  envKey: string;                 // e.g., GROQ_API_KEY
  supports: (tag: ModelTag) => boolean;
  estimate: (tag: ModelTag, toks: number) => { costUsd: number; p95ms: number };
  call: (payload: any) => Promise<{ ok: boolean; text?: string; usage?: any; model?: string; error?: string }>;
}

const has = (k: string) => typeof process.env[k] === "string" && process.env[k]!.trim().length > 0;

const providers: Provider[] = [
  {
    name: "groq",
    envKey: "GROQ_API_KEY",
    supports: (t) => ["fast.code","fast.summarize","cheap.translate","vision.ocr","rag.docs","rag.graph","reason.dense"].includes(t),
    estimate: (t, toks) => ({ costUsd: 0, p95ms: t==="fast.code" ? 300 : 800 }),
    call: async (payload) => {
      assert(has("GROQ_API_KEY"), "Missing GROQ_API_KEY");
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const j = await r.json();
      return { ok: r.ok, text: j.choices?.[0]?.message?.content, usage: j.usage, model: j.model, error: j.error?.message };
    }
  },
  {
    name: "openrouter",
    envKey: "OPENROUTER_API_KEY",
    supports: (_t) => true,
    estimate: (_t, _toks) => ({ costUsd: 0, p95ms: 1200 }),
    call: async (payload) => {
      assert(has("OPENROUTER_API_KEY"), "Missing OPENROUTER_API_KEY");
      const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const j = await r.json();
      return { ok: r.ok, text: j.choices?.[0]?.message?.content, usage: j.usage, model: j.model, error: j.error?.message };
    }
  },
  {
    name: "openai",
    envKey: "OPENAI_API_KEY",
    supports: (_t) => true,
    estimate: (_t, _toks) => ({ costUsd: 0.02, p95ms: 1500 }),
    call: async (payload) => {
      assert(has("OPENAI_API_KEY"), "Missing OPENAI_API_KEY");
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const j = await r.json();
      return { ok: r.ok, text: j.choices?.[0]?.message?.content, usage: j.usage, model: j.model, error: j.error?.message };
    }
  },
  {
    name: "anthropic",
    envKey: "ANTHROPIC_API_KEY",
    supports: (t) => ["reason.long","reason.safety","reason.dense","rag.docs"].includes(t),
    estimate: (_t, _toks) => ({ costUsd: 0.03, p95ms: 1600 }),
    call: async (payload) => {
      assert(has("ANTHROPIC_API_KEY"), "Missing ANTHROPIC_API_KEY");
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const j = await r.json();
      // normalize to text
      const text = Array.isArray(j.content) ? j.content.map((c:any)=>c.text||"").join("\n") : j.content?.[0]?.text;
      return { ok: r.ok, text, usage: j.usage, model: j.model, error: j.error?.message };
    }
  }
];

export async function routeLLM(opts: RouteOpts, payload: any) {
  const order = ["groq","openrouter","openai","anthropic"] as const;
  let spent = 0;
  let lastErr = "";

  for (const name of order) {
    const p = providers.find(x => x.name === name)!;
    if (!has(p.envKey)) continue;
    if (!p.supports(opts.tag)) continue;

    const est = p.estimate(opts.tag, opts.inputTokens);
    if (!opts.allowPaid && est.costUsd > 0) continue;
    if (spent + est.costUsd > opts.hardCostUsd) continue;
    if (est.p95ms > opts.latencyBudgetMs) {
      // try next provider; too slow for SLA
      continue;
    }

    const res = await p.call(payload).catch((e) => ({ ok:false, error: String(e) }));
    if (res.ok && res.text) {
      return { ...res, provider: name };
    }
    lastErr = res.error || `Unknown error from ${name}`;
  }

  return {
    ok: false,
    error: lastErr || "No eligible provider within budgets. Add keys or relax caps.",
    provider: null
  };
}


Env keys expected: GROQ_API_KEY, OPENROUTER_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY.
Usage: call routeLLM({ tag:"fast.code", inputTokens:1200, latencyBudgetMs:1500, hardCostUsd:0, softWarnUsd:0.5, allowPaid:false }, payload).
