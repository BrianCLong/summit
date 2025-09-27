import { createHmac } from "node:crypto";

import type {
  CursorEvent,
  MosbCategoryBudgetConfig,
  MosbCategoryState,
  MosbConfig,
  MosbDetectionBudgetConfig,
  MosbDetectionState,
  MosbLedgerEntry,
  MosbResult,
  MosbTraceEvent,
} from "common-types";

export interface MosbCategorySignal {
  category: string;
  tokens?: number;
}

export type MosbDetectionSeverity = "unsafe" | "warning" | "info";

export interface MosbDetectionSignal {
  code: string;
  severity: MosbDetectionSeverity;
}

export interface MosbOptions {
  config: MosbConfig;
  secret: string;
  now?: () => Date;
  cwsAdapter?: (event: CursorEvent) => MosbCategorySignal[];
  moccAdapter?: (event: CursorEvent) => MosbDetectionSignal[];
}

export interface MosbEvaluateOptions {
  categories?: MosbCategorySignal[];
  detections?: MosbDetectionSignal[];
}

interface MosbSessionState {
  categories: Record<string, MosbCategoryState>;
  detection?: MosbDetectionState;
  lastSeenAt: number;
  ledger: MosbLedgerEntry[];
}

export class ModelOutputSafetyBudgeter {
  private readonly config: MosbConfig;
  private readonly secret: string;
  private readonly now: () => Date;
  private readonly cwsAdapter?: (event: CursorEvent) => MosbCategorySignal[];
  private readonly moccAdapter?: (event: CursorEvent) => MosbDetectionSignal[];
  private readonly sessions = new Map<string, MosbSessionState>();

  constructor(options: MosbOptions) {
    this.config = options.config;
    this.secret = options.secret;
    this.now = options.now ?? (() => new Date());
    this.cwsAdapter = options.cwsAdapter;
    this.moccAdapter = options.moccAdapter;
  }

  evaluate(event: CursorEvent, overrides: MosbEvaluateOptions = {}): MosbResult {
    const sessionId = event.provenance.sessionId;
    if (!sessionId) {
      const now = this.now();
      const ledger: MosbLedgerEntry = {
        sessionId: "",
        timestamp: now.toISOString(),
        deltas: { categoryTokens: {}, unsafeDetections: 0 },
        totals: { categoryTokens: {}, unsafeDetections: 0 },
        traces: [],
        signature: createHmac("sha256", this.secret)
          .update(now.toISOString())
          .digest("hex"),
      };
      return {
        allowed: true,
        traces: [],
        categories: {},
        ledger,
      };
    }

    const now = this.now();
    const nowMs = now.getTime();
    const session = this.resolveSession(sessionId, nowMs);

    const categorySignals =
      overrides.categories ?? this.extractCategories(event);
    const detectionSignals =
      overrides.detections ?? this.extractDetections(event);

    const aggregatedCategoryTokens = this.aggregateCategoryTokens(
      categorySignals,
      event
    );
    const traces: MosbTraceEvent[] = [];
    const categoryDeltas: Record<string, number> = {};
    let allowed = true;
    let reason: string | undefined;

    for (const [category, deltaTokens] of aggregatedCategoryTokens) {
      const config = this.resolveCategoryConfig(category);
      if (!config) {
        continue;
      }
      const state = this.resolveCategoryState(session, category, config, nowMs);
      const delta = Math.max(0, deltaTokens);
      state.tokensConsumed += delta;
      state.lastEventAt = nowMs;
      categoryDeltas[category] = (categoryDeltas[category] ?? 0) + delta;

      const limit = config.tokens;
      const remaining = Math.max(limit - state.tokensConsumed, 0);
      const windowEndsAt = new Date(
        state.windowStartedAt + config.windowMs
      ).toISOString();

      traces.push({
        type: "category",
        category,
        consumed: state.tokensConsumed,
        limit,
        remaining,
        delta,
        windowEndsAt,
      });

      if (allowed && state.tokensConsumed > limit) {
        allowed = false;
        reason = `deny:mosb-category:${category}`;
      }
    }

    const detectionConfig = this.config.detection;
    let stepUpRequired = false;
    let detectionDelta = 0;
    if (detectionConfig) {
      const state = this.resolveDetectionState(session, detectionConfig, nowMs);
      detectionDelta = this.applyDetections(state, detectionConfig, detectionSignals);
      if (detectionDelta > 0) {
        state.lastEventAt = nowMs;
      }
      const windowEndsAt = new Date(
        state.windowStartedAt + detectionConfig.windowMs
      ).toISOString();
      const remaining = Math.max(
        detectionConfig.maxIncidents - state.incidents,
        0
      );
      const escalated =
        detectionConfig.escalateAfter !== undefined &&
        state.incidents >= detectionConfig.escalateAfter;
      if (escalated && state.escalatedAt === undefined) {
        state.escalatedAt = nowMs;
      }
      stepUpRequired = escalated;
      traces.push({
        type: "detection",
        consumed: state.incidents,
        limit: detectionConfig.maxIncidents,
        remaining,
        delta: detectionDelta,
        windowEndsAt,
        escalated,
      });
      if (allowed && state.incidents >= detectionConfig.maxIncidents) {
        allowed = false;
        reason = "deny:mosb-unsafe-detections";
      }
    }

    const ledger = this.appendLedger(
      sessionId,
      now,
      session,
      categoryDeltas,
      detectionDelta,
      traces
    );

    return {
      allowed,
      reason,
      stepUpRequired,
      traces,
      categories: this.cloneCategoryState(session.categories),
      detection: session.detection ? { ...session.detection } : undefined,
      ledger,
    };
  }

  ledgerForSession(sessionId: string): MosbLedgerEntry[] {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return [];
    }
    return session.ledger.map((entry) => ({ ...entry }));
  }

  private resolveSession(sessionId: string, nowMs: number): MosbSessionState {
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = {
        categories: {},
        lastSeenAt: nowMs,
        ledger: [],
      };
      this.sessions.set(sessionId, session);
      return session;
    }
    session.lastSeenAt = nowMs;
    return session;
  }

  private resolveCategoryConfig(category: string): MosbCategoryBudgetConfig | undefined {
    return this.config.categories[category] ?? this.config.defaultCategory;
  }

  private resolveCategoryState(
    session: MosbSessionState,
    category: string,
    config: MosbCategoryBudgetConfig,
    nowMs: number
  ): MosbCategoryState {
    const existing = session.categories[category];
    if (!existing) {
      const initial: MosbCategoryState = {
        tokensConsumed: 0,
        windowStartedAt: nowMs,
        lastEventAt: nowMs,
      };
      session.categories[category] = initial;
      return initial;
    }
    if (nowMs - existing.windowStartedAt >= config.windowMs) {
      existing.windowStartedAt = nowMs;
      existing.tokensConsumed = 0;
    }
    return existing;
  }

  private resolveDetectionState(
    session: MosbSessionState,
    config: MosbDetectionBudgetConfig,
    nowMs: number
  ): MosbDetectionState {
    const existing = session.detection;
    if (!existing) {
      const initial: MosbDetectionState = {
        incidents: 0,
        windowStartedAt: nowMs,
        lastEventAt: nowMs,
      };
      session.detection = initial;
      return initial;
    }
    if (nowMs - existing.windowStartedAt >= config.windowMs) {
      existing.windowStartedAt = nowMs;
      existing.incidents = 0;
      existing.escalatedAt = undefined;
    }
    return existing;
  }

  private aggregateCategoryTokens(
    signals: MosbCategorySignal[],
    event: CursorEvent
  ): Map<string, number> {
    const aggregated = new Map<string, number>();
    const fallbackTokens = event.usage?.totalTokens ?? 0;
    for (const signal of signals) {
      const delta = Math.max(0, signal.tokens ?? fallbackTokens);
      if (delta === 0) {
        continue;
      }
      aggregated.set(signal.category, (aggregated.get(signal.category) ?? 0) + delta);
    }
    return aggregated;
  }

  private applyDetections(
    state: MosbDetectionState,
    config: MosbDetectionBudgetConfig,
    detections: MosbDetectionSignal[]
  ): number {
    const unsafe = detections.filter((detection) => detection.severity === "unsafe")
      .length;
    if (unsafe === 0) {
      return 0;
    }
    state.incidents += unsafe;
    return unsafe;
  }

  private extractCategories(event: CursorEvent): MosbCategorySignal[] {
    const categories: MosbCategorySignal[] = [];
    if (this.cwsAdapter) {
      categories.push(...this.cwsAdapter(event));
    }
    for (const tag of event.tags ?? []) {
      if (tag.startsWith("cws:category:")) {
        const category = tag.slice("cws:category:".length);
        categories.push({ category, tokens: event.usage?.totalTokens });
      }
    }
    if (categories.length === 0) {
      for (const dataClass of event.dataClasses ?? []) {
        categories.push({ category: dataClass, tokens: event.usage?.totalTokens });
      }
    }
    return categories;
  }

  private extractDetections(event: CursorEvent): MosbDetectionSignal[] {
    const detections: MosbDetectionSignal[] = [];
    if (this.moccAdapter) {
      detections.push(...this.moccAdapter(event));
    }
    for (const tag of event.tags ?? []) {
      if (tag.startsWith("mocc:")) {
        detections.push({ code: tag, severity: "unsafe" });
      }
    }
    return detections;
  }

  private appendLedger(
    sessionId: string,
    now: Date,
    session: MosbSessionState,
    categoryDeltas: Record<string, number>,
    detectionDelta: number,
    traces: MosbTraceEvent[]
  ): MosbLedgerEntry {
    const entries = session.ledger;
    const previousSignature = entries.at(-1)?.signature;
    const totals: MosbLedgerEntry["totals"] = {
      categoryTokens: this.cloneCategoryTokens(session.categories),
      unsafeDetections: session.detection?.incidents ?? 0,
    };
    const entry: MosbLedgerEntry = {
      sessionId,
      timestamp: now.toISOString(),
      deltas: {
        categoryTokens: { ...categoryDeltas },
        unsafeDetections: detectionDelta,
      },
      totals,
      traces: traces.map((trace) => ({ ...trace })),
      previousSignature,
      signature: "",
    };

    const payload = JSON.stringify({
      sessionId: entry.sessionId,
      timestamp: entry.timestamp,
      deltas: entry.deltas,
      totals: entry.totals,
      previousSignature,
    });

    entry.signature = createHmac("sha256", this.secret).update(payload).digest("hex");
    entries.push(entry);
    return entry;
  }

  private cloneCategoryState(
    categories: Record<string, MosbCategoryState>
  ): Record<string, MosbCategoryState> {
    const copy: Record<string, MosbCategoryState> = {};
    for (const [key, value] of Object.entries(categories)) {
      copy[key] = { ...value };
    }
    return copy;
  }

  private cloneCategoryTokens(
    categories: Record<string, MosbCategoryState>
  ): Record<string, number> {
    const tokens: Record<string, number> = {};
    for (const [key, value] of Object.entries(categories)) {
      tokens[key] = value.tokensConsumed;
    }
    return tokens;
  }
}
