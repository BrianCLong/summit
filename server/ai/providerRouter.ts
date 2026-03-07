// MIT License
// Simple provider router honoring free-first policy with budgets and graceful fallback.
import assert from "node:assert";
import fetch from "node-fetch";
import { URL } from "node:url";

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
  name: "groq"|"openrouter"|"openai"|"anthropic"|"nvidia";
  envKey: string;                 // e.g., GROQ_API_KEY
  supports: (tag: ModelTag) => boolean;
  estimate: (tag: ModelTag, toks: number) => { costUsd: number; p95ms: number };
  call: (payload: any) => Promise<ProviderResponse>;
}

interface ProviderResponse {
  ok: boolean;
  text?: string;
  usage?: any;
  model?: string;
  error?: string;
  toolCalls?: Array<{ id: string; type: string; function?: { name?: string; arguments?: string } }>;
}

const NVIDIA_ENDPOINT = "https://integrate.api.nvidia.com/v1/chat/completions";
const NVIDIA_ALLOWED_HOST = "integrate.api.nvidia.com";
const KIMI_MODEL_ID = "moonshotai/kimi-k2.5";

const has = (k: string) => typeof process.env[k] === "string" && process.env[k]!.trim().length > 0;
const enabled = (k: string) => process.env[k] === "1";

const normalizeOpenAICompatResponse = (statusOk: boolean, body: any): ProviderResponse => {
  const message = body?.choices?.[0]?.message;
  const content = message?.content;
  const text = typeof content === "string"
    ? content
    : Array.isArray(content)
      ? content.map((part: any) => part?.text ?? "").filter(Boolean).join("\n")
      : undefined;

  return {
    ok: statusOk,
    text,
    usage: body?.usage,
    model: body?.model,
    error: body?.error?.message,
    toolCalls: Array.isArray(message?.tool_calls) ? message.tool_calls : undefined,
  };
};

export const isNvidiaIntegrateEnabled = (): boolean => {
  if (!enabled("FEATURE_NVIDIA_INTEGRATE")) return false;
  if (!enabled("NVIDIA_INTEGRATE_API_ALLOW")) return false;

  const allowlist = (process.env.NVIDIA_INTEGRATE_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return allowlist.includes(NVIDIA_ALLOWED_HOST);
};

export const buildNvidiaPayload = (payload: any, thinkingEnabled: boolean): any => {
  const basePayload = {
    ...payload,
    model: KIMI_MODEL_ID,
  };
  if (!thinkingEnabled) return basePayload;

  return {
    ...basePayload,
    chat_template_kwargs: {
      ...(payload?.chat_template_kwargs ?? {}),
      thinking: true,
    },
  };
};

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
      return normalizeOpenAICompatResponse(r.ok, j);
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
      return normalizeOpenAICompatResponse(r.ok, j);
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
      return normalizeOpenAICompatResponse(r.ok, j);
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
  },
  {
    name: "nvidia",
    envKey: "NVIDIA_API_KEY",
    supports: (_t) => true,
    estimate: (_t, _toks) => ({ costUsd: 0.01, p95ms: 1000 }),
    call: async (payload) => {
      assert(has("NVIDIA_API_KEY"), "Missing NVIDIA_API_KEY");
      assert(isNvidiaIntegrateEnabled(), "NVIDIA Integrate is not enabled by policy");

      const endpointHost = new URL(NVIDIA_ENDPOINT).hostname;
      assert(endpointHost === NVIDIA_ALLOWED_HOST, "NVIDIA endpoint host is not allowlisted");

      const nvidiaPayload = buildNvidiaPayload(payload, enabled("FEATURE_KIMI_THINKING"));
      const r = await fetch(NVIDIA_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(nvidiaPayload),
      });
      const j = await r.json();
      return normalizeOpenAICompatResponse(r.ok, j);
    },
  }
];

export async function routeLLM(opts: RouteOpts, payload: any) {
  const order = ["nvidia","groq","openrouter","openai","anthropic"] as const;
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
    if (res.ok && (res.text || (res.toolCalls && res.toolCalls.length > 0))) {
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


/*
Env keys expected: GROQ_API_KEY, OPENROUTER_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY.
Usage: call routeLLM({ tag:"fast.code", inputTokens:1200, latencyBudgetMs:1500, hardCostUsd:0, softWarnUsd:0.5, allowPaid:false }, payload).
*/
