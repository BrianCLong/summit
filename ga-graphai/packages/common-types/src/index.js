export * from "./linearx";
const RESOURCE_KINDS = {
  MODEL: "model",
  RUNTIME: "runtime",
  HARDWARE: "hardware"
};
const SAFETY_TIERS = { A: "A", B: "B", C: "C" };
const LICENSE_CLASSES = {
  MIT_OK: "MIT-OK",
  OPEN_DATA_OK: "Open-Data-OK",
  RESTRICTED_TOS: "Restricted-TOS"
};
const ZERO_SPEND_OPTIMIZATIONS = {
  KV_CACHE: "kvCache",
  MEMOIZATION: "memo",
  QUANTIZATION: "quant",
  SPECULATIVE_DECODE: "specDecode",
  BATCHING: "batching",
  VLLM: "vLLM",
  LORA: "LoRA"
};
function clamp(value, min, max) {
  if (Number.isNaN(value)) {
    return min;
  }
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}
function computeValueDensity(metrics) {
  const quality = clamp(metrics.quality ?? 0, 0, 1);
  const coverage = clamp(metrics.coverage ?? 1, 0, 1);
  const cost = metrics.cost ?? 0;
  const latency = metrics.latency ?? 0;
  if (cost <= 0 || latency <= 0) {
    return 0;
  }
  return quality * coverage / (cost * latency);
}
function percentile(values, percentileValue) {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const idx = clamp(percentileValue, 0, 1) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) {
    return sorted[lower];
  }
  const weight = idx - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}
function updateEma(current, observation, alpha = 0.3) {
  if (!Number.isFinite(observation)) {
    return current;
  }
  if (!Number.isFinite(current)) {
    return observation;
  }
  return alpha * observation + (1 - alpha) * current;
}
function createDecisionRecord(payload) {
  const arms = Array.isArray(payload.arms) ? payload.arms.map((arm) => ({ id: String(arm.id), V: Number(arm.V) })) : [];
  const record = {
    taskId: String(payload.taskId),
    arms,
    chosen: String(payload.chosen),
    pred: {
      quality: Number(payload.pred?.quality ?? 0),
      lat: Number(payload.pred?.lat ?? 0),
      cost: Number(payload.pred?.cost ?? 0)
    },
    actual: {
      quality: Number(payload.actual?.quality ?? 0),
      lat: Number(payload.actual?.lat ?? 0),
      cost: Number(payload.actual?.cost ?? 0)
    },
    provenanceUri: String(payload.provenanceUri ?? ""),
    budgetDeltaUSD: Number(payload.budgetDeltaUSD ?? 0)
  };
  return Object.freeze(record);
}
function createBudgetSnapshot(input) {
  const baseline = Math.max(0, Number(input.baselineMonthlyUSD ?? 0));
  const consumed = Math.max(0, Number(input.consumedUSD ?? 0));
  const now = input.timestamp instanceof Date ? input.timestamp : /* @__PURE__ */ new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysElapsed = Math.max(1, (now.getTime() - startOfMonth.getTime()) / (1e3 * 60 * 60 * 24));
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const burnRate = consumed / daysElapsed;
  const forecast = burnRate * daysInMonth;
  const headroomPct = baseline > 0 ? clamp(1 - forecast / baseline, 0, 1) : 1;
  return {
    baselineMonthlyUSD: baseline,
    consumedUSD: consumed,
    headroomPct,
    burnRateUSDPerDay: burnRate,
    forecastUSD: forecast
  };
}
function aggregateCoverage(contributions) {
  if (!Array.isArray(contributions) || contributions.length === 0) {
    return 0;
  }
  const total = contributions.reduce((acc, value) => acc + clamp(value, 0, 1), 0);
  return clamp(total / contributions.length, 0, 1);
}
function buildMemoCacheKey(promptHash, policyVersion) {
  return `${promptHash}::${policyVersion}`;
}
function normalizeLatency(latency) {
  const p50 = Number(latency?.p50 ?? 0);
  const p95 = Number(latency?.p95 ?? 0);
  if (p95 < p50) {
    return { p50, p95: p50 };
  }
  return { p50, p95 };
}
const DEFAULT_CAPS = Object.freeze({
  hardUsd: 0,
  softPct: 0.8,
  tokenCap: 25e4,
  rpm: 600
});
function normalizeCaps(caps) {
  if (!caps) {
    return DEFAULT_CAPS;
  }
  const normalized = {
    hardUsd: Math.max(0, Number(caps.hardUsd ?? DEFAULT_CAPS.hardUsd)),
    softPct: clamp(Number(caps.softPct ?? DEFAULT_CAPS.softPct), 0, 1),
    tokenCap: Math.max(0, Math.round(Number(caps.tokenCap ?? DEFAULT_CAPS.tokenCap))),
    rpm: Math.max(0, Math.round(Number(caps.rpm ?? DEFAULT_CAPS.rpm)))
  };
  return Object.freeze(normalized);
}
const MODEL_CATALOG = Object.freeze([
  {
    id: "mixtral-8x22b-instruct",
    displayName: "Mixtral 8x22B Instruct",
    family: "mixtral",
    provider: "mistral",
    local: true,
    license: "Apache-2.0",
    contextWindow: 32768,
    rpm: 180,
    pricing: { input: 0, output: 0 },
    modality: ["text"],
    capabilities: ["reasoning", "code"],
    tags: ["general", "oss"]
  },
  {
    id: "llama-3-8b-instruct",
    displayName: "Llama 3 8B Instruct",
    family: "llama",
    provider: "meta",
    local: true,
    license: "Llama-3-community",
    contextWindow: 8192,
    rpm: 300,
    pricing: { input: 0, output: 0 },
    modality: ["text"],
    capabilities: ["general", "chat"],
    tags: ["oss", "fast"]
  },
  {
    id: "qwen-14b-instruct",
    displayName: "Qwen 14B Instruct",
    family: "qwen",
    provider: "alibaba",
    local: true,
    license: "Qwen-Community",
    contextWindow: 32768,
    rpm: 220,
    pricing: { input: 0, output: 0 },
    modality: ["text"],
    capabilities: ["multilingual", "chat"],
    tags: ["oss", "multilingual"]
  },
  {
    id: "gemma-2-9b-it",
    displayName: "Gemma 2 9B IT",
    family: "gemma",
    provider: "google",
    local: true,
    license: "Gemma-2",
    contextWindow: 8192,
    rpm: 280,
    pricing: { input: 0, output: 0 },
    modality: ["text"],
    capabilities: ["summarization", "chat"],
    tags: ["oss"]
  },
  {
    id: "falcon-2-vlm",
    displayName: "Falcon 2 VLM",
    family: "falcon",
    provider: "tii",
    local: true,
    license: "Falcon-2",
    contextWindow: 4096,
    rpm: 120,
    pricing: { input: 0, output: 0 },
    modality: ["text", "vision"],
    capabilities: ["vision", "multimodal"],
    tags: ["oss", "vision"]
  },
  {
    id: "gpt-4o-mini",
    displayName: "GPT-4o Mini",
    family: "gpt-4o",
    provider: "openai",
    local: false,
    license: "OpenAI-terms",
    contextWindow: 128e3,
    rpm: 90,
    pricing: { input: 15e-5, output: 6e-4 },
    modality: ["text", "vision"],
    capabilities: ["reasoning", "vision", "speech"],
    tags: ["paid", "fallback"]
  },
  {
    id: "grok-2",
    displayName: "Grok 2",
    family: "grok",
    provider: "xai",
    local: false,
    license: "xAI-terms",
    contextWindow: 131072,
    rpm: 60,
    pricing: { input: 18e-5, output: 72e-5 },
    modality: ["text", "vision"],
    capabilities: ["analysis", "chat"],
    tags: ["paid", "fallback"]
  }
]);
function listModels(filter = {}) {
  return MODEL_CATALOG.filter((model) => {
    if (typeof filter.local === "boolean" && model.local !== filter.local) {
      return false;
    }
    if (filter.family && model.family !== filter.family) {
      return false;
    }
    if (filter.provider && model.provider !== filter.provider) {
      return false;
    }
    if (filter.license && model.license !== filter.license) {
      return false;
    }
    if (filter.modality && !model.modality.includes(filter.modality)) {
      return false;
    }
    if (filter.tag && !(model.tags ?? []).includes(filter.tag)) {
      return false;
    }
    return true;
  });
}
function getModelById(id) {
  return MODEL_CATALOG.find((model) => model.id === id);
}
function calculateCost(model, tokensIn, tokensOut) {
  const usd = Math.max(0, tokensIn) * (model.pricing.input ?? 0) + Math.max(0, tokensOut) * (model.pricing.output ?? 0);
  return {
    usd: Number(usd.toFixed(6)),
    tokensIn: Math.max(0, Math.floor(tokensIn)),
    tokensOut: Math.max(0, Math.floor(tokensOut))
  };
}
function estimateTokens(text) {
  if (!text) {
    return 0;
  }
  const value = typeof text === "string" ? text : text.content ?? "";
  const normalized = value.trim();
  if (!normalized) {
    return 0;
  }
  const wordCount = normalized.split(/\s+/).length;
  const charEstimate = Math.ceil(normalized.length / 4);
  return Math.max(wordCount, charEstimate);
}
const EMPTY_USAGE = {
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0
};
function normalizeUsage(usage) {
  if (!usage) {
    return EMPTY_USAGE;
  }
  const promptTokens = usage.prompt_tokens ?? 0;
  const completionTokens = usage.completion_tokens ?? 0;
  const totalTokens = usage.total_tokens ?? promptTokens + completionTokens;
  return {
    promptTokens,
    completionTokens,
    totalTokens,
    costUsd: usage.cost_usd,
    currency: usage.currency
  };
}
function normalizeCursorEvent(payload) {
  return {
    tenantId: payload.tenant_id,
    repo: payload.repo,
    branch: payload.branch,
    actor: {
      id: payload.actor.id,
      email: payload.actor.email,
      displayName: payload.actor.display_name
    },
    event: payload.event,
    ts: payload.ts,
    model: payload.model ? {
      name: payload.model.name,
      vendor: payload.model.vendor,
      routing: payload.model.routing,
      version: payload.model.version
    } : void 0,
    inputRef: payload.input_ref ? {
      promptSha256: payload.input_ref.prompt_sha256,
      contextRefs: payload.input_ref.context_refs,
      summary: payload.input_ref.summary
    } : void 0,
    outputRef: payload.output_ref ? {
      diffSha256: payload.output_ref.diff_sha256,
      linesAdded: payload.output_ref.lines_added,
      linesModified: payload.output_ref.lines_modified,
      artifactSha256: payload.output_ref.artifact_sha256
    } : void 0,
    purpose: payload.purpose,
    policy: payload.policy,
    provenance: {
      sessionId: payload.provenance.session_id,
      requestId: payload.provenance.request_id,
      parentRequestId: payload.provenance.parent_request_id
    },
    usage: normalizeUsage(payload.usage),
    storyRef: payload.story_ref,
    dataClasses: payload.data_classes,
    workspaceRulesVersion: payload.workspace_rules_version,
    tags: payload.tags
  };
}
function mergeDataClasses(event, context) {
  const classes = /* @__PURE__ */ new Set();
  for (const value of event.dataClasses ?? []) {
    classes.add(value);
  }
  for (const value of context?.dataClasses ?? []) {
    classes.add(value);
  }
  return Array.from(classes);
}
const DAY_MS = 24 * 60 * 60 * 1e3;
const TENANT_BUDGETS = {
  test: {
    tokens: 3e6,
    currency: 25,
    windowMs: DAY_MS,
    alertPercent: 0.8
  },
  demo: {
    tokens: 3e6,
    currency: 25,
    windowMs: DAY_MS,
    alertPercent: 0.8
  },
  "maestro-internal": {
    tokens: 3e6,
    currency: 25,
    windowMs: DAY_MS,
    alertPercent: 0.8
  },
  "production-sample": {
    tokens: 12e6,
    currency: 100,
    windowMs: DAY_MS,
    alertPercent: 0.85
  }
};
const MODEL_ALLOWLIST = [
  "gpt-4.1-mini",
  "claude-3.5-sonnet"
];
const PURPOSE_ALLOWLIST = [
  "investigation",
  "threat-intel",
  "fraud-risk",
  "t&s",
  "benchmarking",
  "training",
  "demo"
];
const NODE_CATEGORIES = {
  source: ["git.clone", "s3.fetch", "artifact.import"],
  build: ["build.compile", "build.cache"],
  test: ["test.junit", "test.pytest", "test.map", "test.reduce"],
  quality: ["quality.lint", "quality.coverage"],
  security: ["security.sca", "security.sast", "security.dast"],
  package: ["package.docker", "package.helm"],
  deploy: ["deploy.canary", "deploy.rollback", "deploy.promotion"],
  utility: [
    "util.fanout",
    "util.fanin",
    "util.gate",
    "util.approval",
    "util.map",
    "util.reduce"
  ],
  ai: ["ai.summarize", "ai.release-notes"]
};
const DEFAULT_VALIDATION_DEFAULTS = {
  retries: 1,
  timeoutMs: 15 * 60 * 1e3,
  budgetUSD: 5,
  evidenceRequired: true
};
const SHORT_RETENTION = "short-30d";
const DEFAULT_RETENTION = "standard-365d";
function emptyWorkflow(tenantId, name, createdBy) {
  return normalizeWorkflow({
    workflowId: "",
    name,
    version: 1,
    tenantId,
    policy: {
      purpose: "engineering",
      retention: DEFAULT_RETENTION,
      licenseClass: "MIT-OK",
      pii: false
    },
    constraints: {
      latencyP95Ms: 30 * 60 * 1e3,
      budgetUSD: 25,
      errorBudgetPercent: 0.1,
      maxParallelism: 32
    },
    nodes: [],
    edges: [],
    createdBy,
    createdAt: createdBy ? (/* @__PURE__ */ new Date()).toISOString() : void 0
  });
}
function normalizeWorkflow(workflow, defaults = {}) {
  const mergedDefaults = {
    ...DEFAULT_VALIDATION_DEFAULTS,
    ...workflow.defaults,
    ...defaults
  };
  const nodes = workflow.nodes.map((node) => applyNodeDefaults(node, mergedDefaults));
  return {
    ...workflow,
    defaults: mergedDefaults,
    nodes
  };
}
function applyNodeDefaults(node, defaults) {
  return {
    ...node,
    retries: node.retries ?? defaults.retries,
    timeoutMs: node.timeoutMs ?? defaults.timeoutMs,
    budgetUSD: node.budgetUSD ?? defaults.budgetUSD,
    evidenceOutputs: node.evidenceOutputs && node.evidenceOutputs.length > 0 ? node.evidenceOutputs : defaults.evidenceRequired ? [
      {
        type: "provenance",
        path: `prov/${node.id}.json`,
        required: true
      }
    ] : []
  };
}
function derivePolicyInput(workflow) {
  const normalized = normalizeWorkflow(workflow);
  const evidence = analyzeEvidence(normalized.nodes);
  return {
    workflow: normalized,
    topology: { edges: normalized.edges },
    evidence,
    constraints: normalized.constraints
  };
}
function analyzeEvidence(nodes) {
  const missing = [];
  const optional = [];
  const complete = [];
  for (const node of nodes) {
    const outputs = node.evidenceOutputs ?? [];
    if (!outputs.length) {
      missing.push(node.id);
      continue;
    }
    const requiredOutputs = outputs.filter((item) => item.required !== false);
    if (!requiredOutputs.length) {
      optional.push(node.id);
    } else {
      complete.push(node.id);
    }
  }
  return { missing, optional, complete };
}
function listSourceNodes(workflow) {
  const targets = new Set(workflow.edges.map((edge) => edge.to));
  return workflow.nodes.filter((node) => !targets.has(node.id)).map((node) => node.id);
}
function listSinkNodes(workflow) {
  const outgoing = new Set(workflow.edges.map((edge) => edge.from));
  return workflow.nodes.filter((node) => !outgoing.has(node.id)).map((node) => node.id);
}
function listOrphanNodes(workflow) {
  const sources = new Set(listSourceNodes(workflow));
  const sinks = new Set(listSinkNodes(workflow));
  return workflow.nodes.filter((node) => !sources.has(node.id) && !sinks.has(node.id)).map((node) => node.id);
}
function summarizeWorkflow(workflow) {
  const pools = /* @__PURE__ */ new Set();
  for (const node of workflow.nodes) {
    if (node.pool) {
      pools.add(node.pool);
    }
  }
  return { nodeCount: workflow.nodes.length, edgeCount: workflow.edges.length, pools };
}
function createWhatIfScenario(label, overrides) {
  return {
    label,
    overrides
  };
}
function enumerateArtifacts(nodes) {
  const collected = [];
  for (const node of nodes) {
    if (node.produces) {
      collected.push(...node.produces);
    }
  }
  return collected;
}
function buildLedgerUri(context, runId) {
  const base = context.ledgerBaseUri.replace(/\/$/, "");
  return `${base}/${runId}`;
}
function collectEvidencePointers(nodes) {
  const pointers = [];
  for (const node of nodes) {
    for (const evidence of node.evidenceOutputs ?? []) {
      pointers.push({ nodeId: node.id, path: evidence.path, type: evidence.type });
    }
  }
  return pointers;
}
function ensureSecret(value) {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value;
  return typeof candidate.vault === "string" && typeof candidate.key === "string";
}
const REQUIRED_AC_THRESHOLD = 0.01;
function validateTaskSpec(spec) {
  const errors = [];
  const warnings = [];
  if (!spec.taskId.trim()) {
    errors.push("taskId is required");
  }
  if (!spec.tenantId.trim()) {
    errors.push("tenantId is required");
  }
  if (!spec.goal.trim()) {
    errors.push("goal is required");
  }
  if (spec.acceptanceCriteria.length === 0) {
    errors.push("at least one acceptance criteria is required");
  }
  spec.acceptanceCriteria.forEach((ac) => {
    if (!ac.statement.trim()) {
      errors.push(`${ac.id} statement is empty`);
    }
    if (parseFloat(ac.threshold) < REQUIRED_AC_THRESHOLD) {
      warnings.push(`${ac.id} threshold appears too low`);
    }
  });
  if (spec.constraints.budgetUSD <= 0) {
    errors.push("budget must be positive");
  }
  if (spec.constraints.latencyP95Ms <= 0) {
    errors.push("latencyP95Ms must be positive");
  }
  if (spec.constraints.contextTokensMax <= 0) {
    errors.push("contextTokensMax must be positive");
  }
  if (!spec.policy.retention) {
    errors.push("policy.retention missing");
  }
  if (spec.policy.pii) {
    if (!spec.policyTags.includes("pii:present")) {
      warnings.push("PII flagged but policy tag missing");
    }
  } else if (!spec.policyTags.includes("pii:absent")) {
    warnings.push("PII absent but missing explicit policy tag");
  }
  const due = Date.parse(spec.sla.due);
  if (Number.isNaN(due)) {
    errors.push("sla.due must be ISO date");
  }
  const coverage = /* @__PURE__ */ new Set();
  for (const ac of spec.acceptanceCriteria) {
    coverage.add(ac.id);
  }
  if (coverage.size !== spec.acceptanceCriteria.length) {
    errors.push("acceptance criteria ids must be unique");
  }
  spec.policyTags.forEach((tag) => {
    if (tag.startsWith("license") && spec.policy.licenseClass === "RESTRICTED") {
      warnings.push("license tag indicates restrictions; verify downstream routing");
    }
  });
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
export {
  DEFAULT_CAPS,
  DEFAULT_RETENTION,
  DEFAULT_VALIDATION_DEFAULTS,
  LICENSE_CLASSES,
  MODEL_ALLOWLIST,
  NODE_CATEGORIES,
  PURPOSE_ALLOWLIST,
  RESOURCE_KINDS,
  SAFETY_TIERS,
  SHORT_RETENTION,
  TENANT_BUDGETS,
  ZERO_SPEND_OPTIMIZATIONS,
  aggregateCoverage,
  analyzeEvidence,
  buildLedgerUri,
  buildMemoCacheKey,
  calculateCost,
  clamp,
  collectEvidencePointers,
  computeValueDensity,
  createBudgetSnapshot,
  createDecisionRecord,
  createWhatIfScenario,
  derivePolicyInput,
  emptyWorkflow,
  ensureSecret,
  enumerateArtifacts,
  estimateTokens,
  getModelById,
  listModels,
  listOrphanNodes,
  listSinkNodes,
  listSourceNodes,
  mergeDataClasses,
  normalizeCaps,
  normalizeCursorEvent,
  normalizeLatency,
  normalizeWorkflow,
  percentile,
  summarizeWorkflow,
  updateEma,
  validateTaskSpec
};
