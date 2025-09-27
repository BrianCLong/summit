import { createServer, type IncomingMessage } from "node:http";
import { URL } from "node:url";
import {
  type BudgetConfig,
  type BudgetResult,
  type BudgetState,
  type CursorEvent,
  type CursorEventName,
  type CursorEventPayload,
  type CursorGatewayRequest,
  type GatewayAuthContext,
  type GatewayResponse,
  type PolicyDecision,
  type RateLimitConfig,
  type RateLimitResult,
  type RateLimitState,
  normalizeCursorEvent,
} from "common-types";
import { PolicyEvaluator } from "policy";
import { ProvenanceLedger } from "prov-ledger";

export interface GatewayLogger {
  info?(message: string, meta?: Record<string, unknown>): void;
  warn?(message: string, meta?: Record<string, unknown>): void;
  error?(message: string, meta?: Record<string, unknown>): void;
}

export interface CursorGatewayOptions {
  policyEvaluator: PolicyEvaluator;
  ledger: ProvenanceLedger;
  budgetManager: BudgetManager;
  rateLimiter: RateLimiter;
  scopeMapping?: Partial<Record<CursorEventName, string[]>>;
  requireDeviceBinding?: boolean;
  requireMtls?: boolean;
  logger?: GatewayLogger;
}

export class CursorGatewayError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly ruleId?: string
  ) {
    super(message);
  }
}

const DEFAULT_SCOPE_MAPPING: Record<CursorEventName, string[]> = {
  "cursor.session.start": ["read_repo"],
  "cursor.session.stop": ["read_repo"],
  "cursor.prompt": ["call_llm"],
  "cursor.applyDiff": ["generate_code"],
  "cursor.commit": ["generate_code", "run_tool"],
};

export class CursorGateway {
  private readonly options: CursorGatewayOptions;

  constructor(options: CursorGatewayOptions) {
    this.options = options;
  }

  async handle(request: CursorGatewayRequest): Promise<GatewayResponse> {
    const now = request.now ?? new Date();
    const event = request.event;
    const auth = request.auth;

    this.validateTenant(event, auth);
    this.validateTokenExpiry(auth, now);
    if (this.options.requireDeviceBinding && !auth.deviceId) {
      throw new CursorGatewayError("device-binding-required", 401, "device-binding");
    }
    if (this.options.requireMtls && !auth.mTLSFingerprint) {
      throw new CursorGatewayError("mtls-required", 401, "mtls");
    }

    const requiredScopes = this.resolveScopes(event.event);
    const missingScopes = requiredScopes.filter(
      (scope) => !auth.scopes.includes(scope)
    );
    if (missingScopes.length > 0) {
      throw new CursorGatewayError(
        `missing-scopes:${missingScopes.join(",")}`,
        403,
        "scopes"
      );
    }

    const rateResult = this.options.rateLimiter.check(event, now.getTime());
    if (!rateResult.allowed) {
      const decision = this.buildDenyDecision(now, "deny:rate-limit", event, [
        "rate-limit",
      ]);
      const budget = this.options.budgetManager.consume(
        auth.tenantId,
        event.usage,
        now,
        { commit: false }
      );
      const record = await this.options.ledger.append(event, {
        decision,
        budget,
        rateLimit: rateResult,
        receivedAt: now,
      });
      this.options.logger?.warn?.("cursor.rate-limit", {
        tenantId: event.tenantId,
        requestId: event.provenance.requestId,
      });
      return { decision, budget, rateLimit: rateResult, record };
    }

    const budget = this.options.budgetManager.consume(
      auth.tenantId,
      event.usage,
      now
    );
    if (!budget.allowed) {
      const decision = this.buildDenyDecision(
        now,
        budget.reason ?? "deny:budget-exceeded",
        event,
        ["budget"]
      );
      const record = await this.options.ledger.append(event, {
        decision,
        budget,
        rateLimit: rateResult,
        receivedAt: now,
      });
      this.options.logger?.warn?.("cursor.budget-deny", {
        tenantId: event.tenantId,
        requestId: event.provenance.requestId,
        reason: budget.reason,
      });
      return { decision, budget, rateLimit: rateResult, record };
    }

    const policyDecision = this.options.policyEvaluator.evaluate(
      event,
      this.buildPolicyContext(event, auth)
    );

    const record = await this.options.ledger.append(event, {
      decision: policyDecision,
      budget,
      rateLimit: rateResult,
      receivedAt: now,
    });

    if (policyDecision.decision === "deny") {
      this.options.logger?.warn?.("cursor.policy-deny", {
        tenantId: event.tenantId,
        requestId: event.provenance.requestId,
        explanations: policyDecision.explanations,
      });
    } else {
      this.options.logger?.info?.("cursor.event.accepted", {
        tenantId: event.tenantId,
        requestId: event.provenance.requestId,
        checksum: record.checksum,
      });
    }

    return { decision: policyDecision, budget, rateLimit: rateResult, record };
  }

  private resolveScopes(eventName: CursorEventName): string[] {
    const override = this.options.scopeMapping?.[eventName];
    if (override) {
      return override;
    }
    return DEFAULT_SCOPE_MAPPING[eventName] ?? [];
  }

  private validateTenant(event: CursorEvent, auth: GatewayAuthContext): void {
    if (event.tenantId !== auth.tenantId) {
      throw new CursorGatewayError("tenant-mismatch", 403, "tenant");
    }
  }

  private validateTokenExpiry(auth: GatewayAuthContext, now: Date): void {
    const expires = Date.parse(auth.tokenExpiresAt);
    if (Number.isNaN(expires)) {
      throw new CursorGatewayError("token-expiry-invalid", 401, "token");
    }
    if (expires <= now.getTime()) {
      throw new CursorGatewayError("token-expired", 401, "token");
    }
  }

  private buildPolicyContext(event: CursorEvent, auth: GatewayAuthContext) {
    return {
      repoMeta: auth.repoMeta,
      scan: auth.scan,
      purpose: auth.purpose ?? event.purpose,
      dataClasses: auth.dataClasses,
      model: auth.model ?? event.model,
      story: auth.storyRef,
    };
  }

  private buildDenyDecision(
    now: Date,
    explanation: string,
    event: CursorEvent,
    ruleIds: string[]
  ): PolicyDecision {
    return {
      decision: "deny",
      explanations: [explanation],
      ruleIds,
      timestamp: now.toISOString(),
      metadata: {
        tenantId: event.tenantId,
        repo: event.repo,
        event: event.event,
      },
    };
  }
}

export interface BudgetManagerOptions {
  budgets: Record<string, BudgetConfig>;
  defaultBudget?: BudgetConfig;
  now?: () => Date;
}

export class BudgetManager {
  private readonly budgets: Record<string, BudgetConfig>;
  private readonly defaultBudget?: BudgetConfig;
  private readonly now: () => Date;
  private readonly states = new Map<string, BudgetState>();

  constructor(options: BudgetManagerOptions) {
    this.budgets = options.budgets;
    this.defaultBudget = options.defaultBudget;
    this.now = options.now ?? (() => new Date());
  }

  consume(
    tenantId: string,
    usage: CursorEvent["usage"],
    at: Date = this.now(),
    opts: { commit?: boolean } = {}
  ): BudgetResult {
    const config = this.budgets[tenantId] ?? this.defaultBudget;
    const commit = opts.commit ?? true;

    if (!config) {
      return {
        allowed: true,
        reason: undefined,
        remainingTokens: Number.POSITIVE_INFINITY,
        remainingCurrency: undefined,
        alertTriggered: false,
        budget: null,
        state: {
          windowStartedAt: at.getTime(),
          tokensConsumed: 0,
          currencyConsumed: 0,
          lastEventAt: at.getTime(),
        },
      };
    }

    const state = this.resolveState(tenantId, config, at);
    const tokens = usage?.totalTokens ?? 0;
    const currency = usage?.costUsd ?? 0;

    const nextTokens = state.tokensConsumed + tokens;
    const nextCurrency = state.currencyConsumed + currency;

    const tokensAllowed = nextTokens <= config.tokens;
    const currencyAllowed =
      config.currency === undefined || nextCurrency <= config.currency;
    const allowed = tokensAllowed && currencyAllowed;

    const alertThreshold = config.alertPercent ?? 0.8;
    const tokenAlert = nextTokens >= config.tokens * alertThreshold;
    const currencyAlert =
      config.currency !== undefined &&
      nextCurrency >= config.currency * alertThreshold;

    if (allowed && commit) {
      state.tokensConsumed = nextTokens;
      state.currencyConsumed = nextCurrency;
    }
    state.lastEventAt = at.getTime();

    return {
      allowed,
      reason: allowed ? undefined : this.buildBudgetReason(tokensAllowed, currencyAllowed),
      remainingTokens: Math.max(config.tokens - nextTokens, 0),
      remainingCurrency:
        config.currency !== undefined
          ? Math.max(config.currency - nextCurrency, 0)
          : undefined,
      alertTriggered: tokenAlert || currencyAlert,
      budget: config,
      state: { ...state },
    };
  }

  private buildBudgetReason(tokensAllowed: boolean, currencyAllowed: boolean): string {
    if (!tokensAllowed && !currencyAllowed) {
      return "deny:budget-tokens-currency";
    }
    if (!tokensAllowed) {
      return "deny:budget-tokens";
    }
    if (!currencyAllowed) {
      return "deny:budget-currency";
    }
    return "deny:budget";
  }

  private resolveState(
    tenantId: string,
    config: BudgetConfig,
    at: Date
  ): BudgetState {
    const existing = this.states.get(tenantId);
    if (!existing) {
      const initial: BudgetState = {
        windowStartedAt: at.getTime(),
        tokensConsumed: 0,
        currencyConsumed: 0,
        lastEventAt: at.getTime(),
      };
      this.states.set(tenantId, initial);
      return initial;
    }

    const windowExpired =
      at.getTime() - existing.windowStartedAt >= config.windowMs;
    if (windowExpired) {
      existing.windowStartedAt = at.getTime();
      existing.tokensConsumed = 0;
      existing.currencyConsumed = 0;
    }
    return existing;
  }
}

export interface RateLimiterOptions {
  config: RateLimitConfig;
  now?: () => number;
}

export class RateLimiter {
  private readonly config: RateLimitConfig;
  private readonly now: () => number;
  private readonly states = new Map<string, RateLimitState>();

  constructor(options: RateLimiterOptions) {
    this.config = options.config;
    this.now = options.now ?? (() => Date.now());
  }

  check(event: CursorEvent, timestamp: number = this.now()): RateLimitResult {
    const key = this.config.keyFactory
      ? this.config.keyFactory(event)
      : `${event.tenantId}:${event.actor.id}:${event.event}`;
    const state = this.states.get(key) ?? {
      tokens: this.config.capacity,
      updatedAt: timestamp,
    };

    const elapsedSeconds = (timestamp - state.updatedAt) / 1000;
    if (elapsedSeconds > 0) {
      const refill = elapsedSeconds * this.config.refillPerSecond;
      state.tokens = Math.min(this.config.capacity, state.tokens + refill);
      state.updatedAt = timestamp;
    }

    if (state.tokens < 1) {
      this.states.set(key, state);
      return {
        allowed: false,
        reason: "rate-limit-exceeded",
        state: { ...state },
        config: this.config,
      };
    }

    state.tokens -= 1;
    this.states.set(key, state);

    return {
      allowed: true,
      state: { ...state },
      config: this.config,
    };
  }
}

export interface GatewayHttpOptions {
  gateway: CursorGateway;
  logger?: GatewayLogger;
}

export function createGatewayHttpServer(options: GatewayHttpOptions) {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "", "http://localhost");
    if (req.method !== "POST" || url.pathname !== "/v1/cursor/events") {
      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "not-found" }));
      return;
    }

    try {
      const payload = await readJson(req);
      const eventPayload = payload.event ?? payload;
      const event = normalizePayloadToEvent(eventPayload);
      const auth = buildAuthContext(payload.auth, req, event);
      const result = await options.gateway.handle({ event, auth });
      const status = result.decision.decision === "allow" ? 202 : 403;
      res.writeHead(status, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          decision: result.decision,
          budget: result.budget,
          rateLimit: result.rateLimit,
          checksum: result.record.checksum,
        })
      );
    } catch (error) {
      if (error instanceof CursorGatewayError) {
        res.writeHead(error.status, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: error.message, ruleId: error.ruleId }));
        return;
      }

      options.logger?.error?.("cursor.gateway.error", {
        message: (error as Error).message,
      });
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "internal-error" }));
    }
  });

  return server;
}

async function readJson(req: IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) {
    return {};
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) {
    return {};
  }
  return JSON.parse(raw);
}

function normalizePayloadToEvent(payload: unknown): CursorEvent {
  if (isCursorEvent(payload)) {
    return payload;
  }
  if (isCursorEventPayload(payload)) {
    return normalizeCursorEvent(payload);
  }
  throw new CursorGatewayError("invalid-event-payload", 400, "payload");
}

function isCursorEvent(value: unknown): value is CursorEvent {
  return (
    typeof value === "object" &&
    value !== null &&
    "tenantId" in value &&
    "event" in value &&
    "provenance" in value
  );
}

function isCursorEventPayload(value: unknown): value is CursorEventPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    "tenant_id" in value &&
    "provenance" in value
  );
}

function buildAuthContext(
  payload: any,
  req: IncomingMessage,
  event: CursorEvent
): GatewayAuthContext {
  const scopes = parseScopes(payload?.scopes ?? req.headers["x-mc-scopes"]);
  const actor = payload?.actor ?? {
    id: payload?.actorId ?? req.headers["x-actor-id"] ?? event.actor.id,
    email: payload?.actorEmail ?? req.headers["x-actor-email"] ?? event.actor.email,
    displayName:
      payload?.actorDisplayName ?? req.headers["x-actor-display-name"] ?? event.actor.displayName,
  };

  return {
    tenantId: payload?.tenantId ?? event.tenantId,
    actor,
    deviceId: payload?.deviceId ?? (req.headers["x-device-id"] as string | undefined),
    scopes,
    tokenExpiresAt:
      payload?.tokenExpiresAt ?? (req.headers["x-token-expiry"] as string) ?? new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    mTLSFingerprint:
      payload?.mTLSFingerprint ?? (req.headers["x-mtls-fingerprint"] as string | undefined),
    purpose: payload?.purpose,
    storyRef: payload?.storyRef ?? event.storyRef,
    attributes: payload?.attributes,
    dataClasses: payload?.dataClasses ?? event.dataClasses,
    repoMeta: payload?.repoMeta,
    scan: payload?.scan,
    model: payload?.model ?? event.model,
    requestIp: req.socket.remoteAddress ?? undefined,
    requestId: (req.headers["x-request-id"] as string | undefined) ?? payload?.requestId,
  };
}

function parseScopes(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.map(String);
  }
  if (typeof input === "string") {
    return input
      .split(",")
      .map((scope) => scope.trim())
      .filter((scope) => scope.length > 0);
  }
  return [];
}
