/**
 * Shared types and helpers for the Universal AI Fabric runtime.
 */

export const DEFAULT_CAPS = {
  hardUsd: 0,
  softPct: 80,
  tokenCap: 6000,
  rpm: 30
};

export const LICENSE_ALLOW_LIST = [
  'Apache-2.0',
  'MIT',
  'OpenRAIL-M',
  'Meta-Community'
];

export const LICENSE_DENY_LIST = ['Proprietary-Client'];

export const MODEL_DEFINITIONS = [
  {
    id: 'mixtral-8x22b-instruct',
    family: 'mixtral',
    license: 'Apache-2.0',
    modality: ['text', 'code'],
    ctx: 65536,
    local: true,
    description: 'MoE planner and tool orchestrator tuned for strategy outputs.',
    cost: { usdPer1kTokens: 0 }
  },
  {
    id: 'llama-3-8b-instruct',
    family: 'llama3',
    license: 'Meta-Community',
    modality: ['text', 'code'],
    ctx: 8192,
    local: true,
    description: 'Balanced latency option for budget constrained workloads.',
    cost: { usdPer1kTokens: 0 }
  },
  {
    id: 'qwen-14b-instruct',
    family: 'qwen',
    license: 'Apache-2.0',
    modality: ['text', 'multilingual'],
    ctx: 32768,
    local: true,
    description: 'Multilingual specialist with strong reasoning depth.',
    cost: { usdPer1kTokens: 0 }
  },
  {
    id: 'gemma-2-9b-it',
    family: 'gemma',
    license: 'Apache-2.0',
    modality: ['text'],
    ctx: 8192,
    local: true,
    description: 'Lightweight adapter for low-latency developer flows.',
    cost: { usdPer1kTokens: 0 }
  },
  {
    id: 'falcon-2-vlm',
    family: 'falcon2',
    license: 'Apache-2.0',
    modality: ['multimodal'],
    ctx: 4096,
    local: true,
    description: 'Vision-language model for diagrams, OCR, and mixed media.',
    cost: { usdPer1kTokens: 0 }
  },
  {
    id: 'gpt-4o-mini',
    family: 'gpt-4o',
    license: 'Commercial',
    modality: ['text', 'multimodal'],
    ctx: 16384,
    local: false,
    description: 'Paid fallback with higher reasoning depth for edge cases.',
    cost: { usdPer1kTokens: 0.15 }
  },
  {
    id: 'grok-2',
    family: 'grok',
    license: 'Commercial',
    modality: ['text', 'multimodal'],
    ctx: 8192,
    local: false,
    description: 'Paid fallback vision model for diagram heavy payloads.',
    cost: { usdPer1kTokens: 0.2 }
  }
];

/**
 * Look up a model by identifier.
 * @param {string} id
 * @returns {ModelDefinition | undefined}
 */
export function getModelById(id) {
  return MODEL_DEFINITIONS.find((model) => model.id === id);
}

/**
 * Filter models by a set of constraints.
 * @param {{local?: boolean, modality?: string, family?: string, license?: string}} [filter]
 * @returns {ModelDefinition[]}
 */
export function listModels(filter = {}) {
  return MODEL_DEFINITIONS.filter((model) => {
    if (typeof filter.local === 'boolean' && model.local !== filter.local) {
      return false;
    }
    if (filter.modality && !model.modality.includes(filter.modality)) {
      return false;
    }
    if (filter.family && model.family !== filter.family) {
      return false;
    }
    if (filter.license && model.license !== filter.license) {
      return false;
    }
    return true;
  });
}

/**
 * Merge user supplied caps with the platform defaults.
 * @param {{hardUsd?: number, softPct?: number, tokenCap?: number, rpm?: number}} [caps]
 * @returns {{hardUsd: number, softPct: number, tokenCap: number, rpm: number}}
 */
export function normalizeCaps(caps) {
  return {
    hardUsd: typeof caps?.hardUsd === 'number' ? caps.hardUsd : DEFAULT_CAPS.hardUsd,
    softPct: typeof caps?.softPct === 'number' ? caps.softPct : DEFAULT_CAPS.softPct,
    tokenCap: typeof caps?.tokenCap === 'number' ? caps.tokenCap : DEFAULT_CAPS.tokenCap,
    rpm: typeof caps?.rpm === 'number' ? caps.rpm : DEFAULT_CAPS.rpm
  };
}

/**
 * Rough token estimation. Uses a conservative 4 characters per token heuristic.
 * @param {string | undefined | null} value
 * @returns {number}
 */
export function estimateTokens(value) {
  if (!value) {
    return 0;
  }
  const text = String(value).trim();
  if (!text) {
    return 0;
  }
  const characters = text.length;
  const tokens = Math.ceil(characters / 4);
  return Number.isFinite(tokens) && tokens > 0 ? tokens : 0;
}

/**
 * Compute USD cost using the model definition.
 * @param {ModelDefinition} model
 * @param {number} tokensIn
 * @param {number} tokensOut
 * @returns {{usd: number, tokensIn: number, tokensOut: number}}
 */
export function calculateCost(model, tokensIn, tokensOut) {
  const totalTokens = tokensIn + tokensOut;
  if (!model.cost || !model.cost.usdPer1kTokens) {
    return { usd: 0, tokensIn, tokensOut };
  }
  const usd = (totalTokens / 1000) * model.cost.usdPer1kTokens;
  return {
    usd: Math.max(0, Number(usd.toFixed(6))),
    tokensIn,
    tokensOut
  };
}

/**
 * Export shape definitions for documentation tooling.
 * @typedef {Object} ModelDefinition
 * @property {string} id
 * @property {string} family
 * @property {string} license
 * @property {string[]} modality
 * @property {number} ctx
 * @property {boolean} local
 * @property {string} description
 * @property {{usdPer1kTokens: number}} cost
 */

