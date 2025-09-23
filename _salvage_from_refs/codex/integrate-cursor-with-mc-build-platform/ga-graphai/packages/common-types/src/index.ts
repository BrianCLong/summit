export type CursorEventName =
  | "cursor.session.start"
  | "cursor.session.stop"
  | "cursor.prompt"
  | "cursor.applyDiff"
  | "cursor.commit";

export type CursorPurpose =
  | "investigation"
  | "threat-intel"
  | "fraud-risk"
  | "t&s"
  | "benchmarking"
  | "training"
  | "demo"
  | (string & {});

export type CursorDataClass =
  | "public-code"
  | "pseudo-data"
  | "production-PII"
  | "secrets"
  | "proprietary-client"
  | "legal-hold"
  | (string & {});

export interface CursorActor {
  id: string;
  email?: string;
  displayName?: string;
  scopes?: string[];
  deviceBindingId?: string;
}

export interface CursorModel {
  name: string;
  vendor: string;
  routing?: "proxy" | "direct" | (string & {});
  version?: string;
}

export interface CursorInputReference {
  promptSha256?: string;
  contextRefs?: string[];
  summary?: string;
}

export interface CursorOutputReference {
  diffSha256?: string;
  linesAdded?: number;
  linesModified?: number;
  artifactSha256?: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd?: number;
  currency?: string;
}

export interface PolicyDecision {
  decision: "allow" | "deny";
  explanations: string[];
  ruleIds?: string[];
  obligations?: string[];
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface PolicyEvaluationContext {
  repoMeta?: {
    license?: string;
    visibility?: "public" | "private" | "internal" | (string & {});
    tags?: string[];
  };
  scan?: {
    piiFound?: boolean;
    secretsFound?: boolean;
    licenseFindings?: string[];
    redactionsApplied?: boolean;
  };
  purpose?: CursorPurpose;
  dataClasses?: CursorDataClass[];
  model?: CursorModel;
  story?: {
    id?: string;
    type?: string;
    url?: string;
  };
}

export interface CursorEvent {
  tenantId: string;
  repo: string;
  branch: string;
  event: CursorEventName;
  actor: CursorActor;
  ts: string;
  model?: CursorModel;
  inputRef?: CursorInputReference;
  outputRef?: CursorOutputReference;
  purpose: CursorPurpose;
  policy?: PolicyDecision;
  provenance: {
    sessionId: string;
    requestId: string;
    parentRequestId?: string;
  };
  usage?: TokenUsage;
  storyRef?: {
    id?: string;
    key?: string;
    url?: string;
  };
  dataClasses?: CursorDataClass[];
  workspaceRulesVersion?: string;
  tags?: string[];
}

export interface ProvenanceRecord extends CursorEvent {
  policy: PolicyDecision;
  receivedAt: string;
  checksum: string;
  budget?: BudgetResult;
  rateLimit?: RateLimitResult;
}

export interface BudgetConfig {
  tokens: number;
  currency?: number;
  windowMs: number;
  alertPercent?: number;
}

export interface BudgetState {
  windowStartedAt: number;
  tokensConsumed: number;
  currencyConsumed: number;
  lastEventAt?: number;
}

export interface BudgetResult {
  allowed: boolean;
  reason?: string;
  remainingTokens: number;
  remainingCurrency?: number;
  alertTriggered: boolean;
  budget: BudgetConfig | null;
  state: BudgetState;
}

export interface RateLimitConfig {
  capacity: number;
  refillPerSecond: number;
  keyFactory?: (event: CursorEvent) => string;
}

export interface RateLimitState {
  tokens: number;
  updatedAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  state: RateLimitState;
  config: RateLimitConfig;
}

export interface GatewayAuthContext {
  tenantId: string;
  actor: CursorActor;
  deviceId?: string;
  scopes: string[];
  tokenExpiresAt: string;
  mTLSFingerprint?: string;
  purpose?: CursorPurpose;
  storyRef?: {
    id?: string;
    key?: string;
    url?: string;
  };
  attributes?: Record<string, unknown>;
  dataClasses?: CursorDataClass[];
  repoMeta?: PolicyEvaluationContext["repoMeta"];
  scan?: PolicyEvaluationContext["scan"];
  model?: CursorModel;
  requestIp?: string;
  requestId?: string;
}

export interface CursorGatewayRequest {
  event: CursorEvent;
  auth: GatewayAuthContext;
  now?: Date;
}

export interface GatewayResponse {
  decision: PolicyDecision;
  budget: BudgetResult;
  rateLimit: RateLimitResult;
  record: ProvenanceRecord;
}

export interface CursorEventPayloadActor {
  id: string;
  email?: string;
  display_name?: string;
}

export interface CursorEventPayloadModel {
  name: string;
  vendor: string;
  routing?: string;
  version?: string;
}

export interface CursorEventPayload {
  tenant_id: string;
  repo: string;
  branch: string;
  actor: CursorEventPayloadActor;
  event: CursorEventName;
  ts: string;
  model?: CursorEventPayloadModel;
  input_ref?: {
    prompt_sha256?: string;
    context_refs?: string[];
    summary?: string;
  };
  output_ref?: {
    diff_sha256?: string;
    lines_added?: number;
    lines_modified?: number;
    artifact_sha256?: string;
  };
  purpose: CursorPurpose;
  policy?: PolicyDecision;
  provenance: {
    session_id: string;
    request_id: string;
    parent_request_id?: string;
  };
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    cost_usd?: number;
    currency?: string;
  };
  story_ref?: {
    id?: string;
    key?: string;
    url?: string;
  };
  data_classes?: CursorDataClass[];
  workspace_rules_version?: string;
  tags?: string[];
}

const EMPTY_USAGE: TokenUsage = {
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
};

function normalizeUsage(usage?: CursorEventPayload["usage"]): TokenUsage {
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
    currency: usage.currency,
  };
}

export function normalizeCursorEvent(payload: CursorEventPayload): CursorEvent {
  return {
    tenantId: payload.tenant_id,
    repo: payload.repo,
    branch: payload.branch,
    actor: {
      id: payload.actor.id,
      email: payload.actor.email,
      displayName: payload.actor.display_name,
    },
    event: payload.event,
    ts: payload.ts,
    model: payload.model
      ? {
          name: payload.model.name,
          vendor: payload.model.vendor,
          routing: payload.model.routing,
          version: payload.model.version,
        }
      : undefined,
    inputRef: payload.input_ref
      ? {
          promptSha256: payload.input_ref.prompt_sha256,
          contextRefs: payload.input_ref.context_refs,
          summary: payload.input_ref.summary,
        }
      : undefined,
    outputRef: payload.output_ref
      ? {
          diffSha256: payload.output_ref.diff_sha256,
          linesAdded: payload.output_ref.lines_added,
          linesModified: payload.output_ref.lines_modified,
          artifactSha256: payload.output_ref.artifact_sha256,
        }
      : undefined,
    purpose: payload.purpose,
    policy: payload.policy,
    provenance: {
      sessionId: payload.provenance.session_id,
      requestId: payload.provenance.request_id,
      parentRequestId: payload.provenance.parent_request_id,
    },
    usage: normalizeUsage(payload.usage),
    storyRef: payload.story_ref,
    dataClasses: payload.data_classes,
    workspaceRulesVersion: payload.workspace_rules_version,
    tags: payload.tags,
  };
}

export function mergeDataClasses(
  event: CursorEvent,
  context?: PolicyEvaluationContext
): CursorDataClass[] {
  const classes = new Set<CursorDataClass>();

  for (const value of event.dataClasses ?? []) {
    classes.add(value);
  }

  for (const value of context?.dataClasses ?? []) {
    classes.add(value);
  }

  return Array.from(classes);
}

const DAY_MS = 24 * 60 * 60 * 1000;

export const TENANT_BUDGETS: Record<string, BudgetConfig> = {
  test: {
    tokens: 3_000_000,
    currency: 25,
    windowMs: DAY_MS,
    alertPercent: 0.8,
  },
  demo: {
    tokens: 3_000_000,
    currency: 25,
    windowMs: DAY_MS,
    alertPercent: 0.8,
  },
  "maestro-internal": {
    tokens: 3_000_000,
    currency: 25,
    windowMs: DAY_MS,
    alertPercent: 0.8,
  },
  "production-sample": {
    tokens: 12_000_000,
    currency: 100,
    windowMs: DAY_MS,
    alertPercent: 0.85,
  },
};

export const MODEL_ALLOWLIST = [
  "gpt-4.1-mini",
  "claude-3.5-sonnet",
] as const;

export const PURPOSE_ALLOWLIST: CursorPurpose[] = [
  "investigation",
  "threat-intel",
  "fraud-risk",
  "t&s",
  "benchmarking",
  "training",
  "demo",
];
