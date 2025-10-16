import assert from 'node:assert';

const PROVIDER_BOOTSTRAP_HINTS = {
  groq: 'Add GROQ_API_KEY in settings to unlock fast free-tier throughput.',
  openrouter:
    'Add OPENROUTER_API_KEY to access multiple free/discounted models as fallback.',
  openai:
    'Add OPENAI_API_KEY to unlock premium reasoning (paid, respect caps).',
  anthropic:
    'Add ANTHROPIC_API_KEY to unlock long-context drafting (paid, respect caps).',
};

const MODEL_TAG_DEFAULTS = {
  'fast.code': {
    groq: 'llama-3.1-8b-instant',
    openrouter: 'meta-llama/llama-3.1-8b-instruct:free',
    openai: 'gpt-4o-mini',
    anthropic: 'claude-3-haiku-20240307',
  },
  'fast.summarize': {
    groq: 'llama-3.1-8b-instant',
    openrouter: 'meta-llama/llama-3.1-8b-instruct:free',
    openai: 'gpt-4o-mini',
    anthropic: 'claude-3-haiku-20240307',
  },
  'cheap.translate': {
    groq: 'llama-3.1-8b-instant',
    openrouter: 'meta-llama/llama-3.1-8b-instruct:free',
    openai: 'gpt-4o-mini',
    anthropic: 'claude-3-haiku-20240307',
  },
  'reason.dense': {
    groq: 'llama-3.1-70b-versatile',
    openrouter: 'meta-llama/llama-3.1-70b-instruct',
    openai: 'gpt-4o-mini',
    anthropic: 'claude-3-sonnet-20240229',
  },
  'reason.long': {
    groq: 'llama-3.1-70b-versatile',
    openrouter: 'anthropic/claude-3-haiku',
    openai: 'gpt-4o',
    anthropic: 'claude-3-sonnet-20240229',
  },
  'reason.safety': {
    groq: 'llama-guard-3-8b',
    openrouter: 'meta-llama/llama-guard-3-8b',
    openai: 'gpt-4o-mini',
    anthropic: 'claude-3-haiku-20240307',
  },
  'vision.ocr': {
    groq: 'llama-3.2-11b-vision-preview',
    openrouter: 'gpt-4o-mini-vision',
    openai: 'gpt-4o-mini-vision',
    anthropic: 'claude-3-haiku-20240307',
  },
  'rag.graph': {
    groq: 'llama-3.1-70b-versatile',
    openrouter: 'meta-llama/llama-3.1-70b-instruct',
    openai: 'gpt-4o-mini',
    anthropic: 'claude-3-sonnet-20240229',
  },
  'rag.docs': {
    groq: 'llama-3.1-70b-versatile',
    openrouter: 'meta-llama/llama-3.1-70b-instruct',
    openai: 'gpt-4o-mini',
    anthropic: 'claude-3-sonnet-20240229',
  },
};

const PROVIDER_ORDER = ['groq', 'openrouter', 'openai', 'anthropic'];

const providers = [
  {
    name: 'groq',
    envKey: 'GROQ_API_KEY',
    supports: (tag) =>
      [
        'fast.code',
        'fast.summarize',
        'cheap.translate',
        'vision.ocr',
        'rag.docs',
        'rag.graph',
        'reason.dense',
        'reason.long',
        'reason.safety',
      ].includes(tag),
    estimate: (tag) => ({ costUsd: 0, p95ms: tag === 'fast.code' ? 300 : 800 }),
    call: async (payload) => {
      assert(hasEnv('GROQ_API_KEY'), 'Missing GROQ_API_KEY');
      const response = await fetch(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json();
      return {
        ok: response.ok,
        text: data.choices?.[0]?.message?.content,
        usage: data.usage,
        model: data.model,
        error: data.error?.message,
      };
    },
  },
  {
    name: 'openrouter',
    envKey: 'OPENROUTER_API_KEY',
    supports: () => true,
    estimate: () => ({ costUsd: 0, p95ms: 1200 }),
    call: async (payload) => {
      assert(hasEnv('OPENROUTER_API_KEY'), 'Missing OPENROUTER_API_KEY');
      const response = await fetch(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json();
      return {
        ok: response.ok,
        text: data.choices?.[0]?.message?.content,
        usage: data.usage,
        model: data.model,
        error: data.error?.message,
      };
    },
  },
  {
    name: 'openai',
    envKey: 'OPENAI_API_KEY',
    supports: () => true,
    estimate: () => ({ costUsd: 0.02, p95ms: 1500 }),
    call: async (payload) => {
      assert(hasEnv('OPENAI_API_KEY'), 'Missing OPENAI_API_KEY');
      const response = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json();
      return {
        ok: response.ok,
        text: data.choices?.[0]?.message?.content,
        usage: data.usage,
        model: data.model,
        error: data.error?.message,
      };
    },
  },
  {
    name: 'anthropic',
    envKey: 'ANTHROPIC_API_KEY',
    supports: (tag) =>
      [
        'reason.long',
        'reason.safety',
        'reason.dense',
        'rag.docs',
        'rag.graph',
      ].includes(tag),
    estimate: () => ({ costUsd: 0.03, p95ms: 1600 }),
    call: async (payload) => {
      assert(hasEnv('ANTHROPIC_API_KEY'), 'Missing ANTHROPIC_API_KEY');
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      const text = Array.isArray(data.content)
        ? data.content.map((chunk) => chunk?.text || '').join('\n')
        : data.content?.[0]?.text;
      return {
        ok: response.ok,
        text,
        usage: data.usage,
        model: data.model,
        error: data.error?.message,
      };
    },
  },
];

function hasEnv(key) {
  return (
    typeof process.env[key] === 'string' && process.env[key].trim().length > 0
  );
}

function tagToEnvKey(tag) {
  return tag.toUpperCase().replace(/\./g, '_');
}

function resolveModel(tag, providerName) {
  const envKey = `${providerName.toUpperCase()}_${tagToEnvKey(tag)}_MODEL`;
  if (hasEnv(envKey)) {
    return process.env[envKey].trim();
  }
  const defaults = MODEL_TAG_DEFAULTS[tag];
  if (!defaults) {
    return null;
  }
  return defaults[providerName] || null;
}

function buildBootstrapMessage(missingProviders) {
  if (!missingProviders.length) {
    return '';
  }
  return missingProviders
    .map((name) => PROVIDER_BOOTSTRAP_HINTS[name] || '')
    .filter(Boolean)
    .join(' ');
}

function estimateTokensFromMessages(messages) {
  const text = messages.map((m) => m?.content || '').join(' ');
  return Math.max(1, Math.ceil(text.length / 4));
}

export async function routeLLM(opts, payload) {
  const missingProviders = new Set();
  const skippedForModel = new Set();
  let lastErr = '';

  for (const name of PROVIDER_ORDER) {
    const provider = providers.find((p) => p.name === name);
    if (!provider) {
      continue;
    }
    if (!hasEnv(provider.envKey)) {
      missingProviders.add(name);
      continue;
    }
    if (!provider.supports(opts.tag)) {
      continue;
    }

    const model = resolveModel(opts.tag, name);
    if (!model) {
      skippedForModel.add(name);
      continue;
    }

    const estimate = provider.estimate(opts.tag, opts.inputTokens);
    if (!opts.allowPaid && estimate.costUsd > 0) {
      continue;
    }
    if (estimate.p95ms > opts.latencyBudgetMs) {
      continue;
    }
    if (estimate.costUsd > opts.hardCostUsd) {
      continue;
    }

    const payloadWithModel = { ...payload, model };

    try {
      const result = await provider.call(payloadWithModel);
      if (result.ok && result.text) {
        return {
          ...result,
          provider: name,
          usedModelTag: opts.tag,
        };
      }
      lastErr = result.error || `Unknown error from ${name}`;
    } catch (error) {
      lastErr = String(error);
    }
  }

  const hints = buildBootstrapMessage(Array.from(missingProviders));
  const modelHint = skippedForModel.size
    ? `Model mapping missing for providers: ${Array.from(skippedForModel).join(', ')}.`
    : '';
  const message =
    [lastErr, hints, modelHint].filter(Boolean).join(' ').trim() ||
    'No eligible provider within budgets. Add keys or relax caps.';

  return {
    ok: false,
    error: message,
    provider: null,
    usedModelTag: opts.tag,
  };
}

export function buildRouterPayload(messages, extra = {}) {
  const tokens = estimateTokensFromMessages(messages);
  return {
    opts: {
      inputTokens: tokens,
    },
    payload: extra,
  };
}
