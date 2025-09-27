import crypto from 'node:crypto';
import {
  AttributionResult,
  CallbackEvent,
  DashboardSummary,
  Honeytoken,
  HoneytokenType,
  IncidentWebhookPayload,
  LeakCallback,
  LeakScoringModel,
  PlantHoneytokenInput,
  WebhookDispatcher,
} from './types';
import { DefaultLeakScoringModel } from './leak-scoring';

interface ServiceOptions {
  idFactory?: () => string;
  now?: () => Date;
  webhookDispatcher?: WebhookDispatcher;
  leakScoringModel?: LeakScoringModel;
  dashboardLimit?: number;
}

export class CanaryTokenPlantingTracebackService {
  private readonly tokens = new Map<string, Honeytoken>();
  private readonly tokensByValue = new Map<string, Honeytoken>();
  private readonly idFactory: () => string;
  private readonly now: () => Date;
  private readonly webhookDispatcher?: WebhookDispatcher;
  private readonly scoringModel: LeakScoringModel;
  private readonly dashboardLimit: number;

  constructor(options: ServiceOptions = {}) {
    this.idFactory = options.idFactory ?? (() => crypto.randomUUID());
    this.now = options.now ?? (() => new Date());
    this.webhookDispatcher = options.webhookDispatcher;
    this.scoringModel = options.leakScoringModel ?? new DefaultLeakScoringModel();
    this.dashboardLimit = options.dashboardLimit ?? 10;
  }

  plantToken(input: PlantHoneytokenInput): Honeytoken {
    this.removeExpiredTokens();
    const id = this.idFactory();
    const createdAt = this.now();
    const expiresAt = new Date(createdAt.getTime() + input.ttlSeconds * 1000);
    const tokenValue = this.generateTokenValue(input.type, id);
    const displayName = this.createDisplayName(input.type, id);
    const token: Honeytoken = {
      id,
      displayName,
      type: input.type,
      tokenValue,
      plantedBy: input.plantedBy,
      sourceSystem: input.sourceSystem,
      tags: [...(input.tags ?? [])],
      createdAt,
      expiresAt,
      leakScore: 0,
      callbackHistory: [],
      metadata: input.metadata,
    };

    this.tokens.set(id, token);
    this.tokensByValue.set(tokenValue, token);
    return token;
  }

  getTokenById(id: string): Honeytoken | undefined {
    this.removeExpiredTokens();
    return this.tokens.get(id);
  }

  recordCallback(event: CallbackEvent): AttributionResult | null {
    this.removeExpiredTokens();
    const token = this.tokensByValue.get(event.tokenValue);
    if (!token) {
      return null;
    }

    const callback = this.createCallback(event);
    token.callbackHistory.push(callback);
    token.leakScore = this.scoringModel.score(token, callback);

    const payload: AttributionResult = {
      token,
      leakCallback: callback,
      confidence: this.estimateConfidence(token, callback),
    };

    void this.dispatchWebhook(token, callback, payload.confidence);
    return payload;
  }

  getDashboard(): DashboardSummary {
    this.removeExpiredTokens();
    const tokens = Array.from(this.tokens.values());
    const totals = {
      planted: tokens.length,
      active: tokens.filter((token) => token.expiresAt.getTime() > this.now().getTime()).length,
      expired: tokens.filter((token) => token.expiresAt.getTime() <= this.now().getTime()).length,
    };
    const tokensByType: DashboardSummary['tokensByType'] = {
      email: 0,
      'file-beacon': 0,
      'unique-phrase': 0,
    };
    for (const token of tokens) {
      tokensByType[token.type] = (tokensByType[token.type] ?? 0) + 1;
    }
    const topAlerts = tokens
      .filter((token) => token.callbackHistory.length > 0)
      .sort((a, b) => b.leakScore - a.leakScore)
      .slice(0, this.dashboardLimit)
      .map((token) => ({
        tokenId: token.id,
        displayName: token.displayName,
        leakScore: token.leakScore,
        lastSeen: token.callbackHistory[token.callbackHistory.length - 1]?.observedAt ?? null,
      }));

    const recentActivity = tokens
      .flatMap((token) =>
        token.callbackHistory.map((callback) => ({
          tokenId: token.id,
          callbackId: callback.id,
          observedAt: callback.observedAt,
          channel: callback.channel,
          sourceAddress: callback.sourceAddress,
        })),
      )
      .sort((a, b) => b.observedAt.getTime() - a.observedAt.getTime())
      .slice(0, this.dashboardLimit);

    return {
      totals,
      tokensByType,
      topAlerts,
      recentActivity,
    };
  }

  registerWebhook(dispatcher: WebhookDispatcher): void {
    (this as { webhookDispatcher?: WebhookDispatcher }).webhookDispatcher = dispatcher;
  }

  private createCallback(event: CallbackEvent): LeakCallback {
    return {
      id: this.idFactory(),
      observedAt: this.now(),
      channel: event.channel,
      sourceAddress: event.sourceAddress,
      context: event.context,
    };
  }

  private createDisplayName(type: HoneytokenType, id: string): string {
    const suffix = id.slice(0, 8);
    switch (type) {
      case 'email':
        return `Inbox Canary ${suffix}`;
      case 'file-beacon':
        return `Document Canary ${suffix}`;
      case 'unique-phrase':
        return `Phrase Canary ${suffix}`;
      default:
        return `Canary ${suffix}`;
    }
  }

  private generateTokenValue(type: HoneytokenType, id: string): string {
    if (type === 'email') {
      return `alerts+${id}@canary.intel`; // placeholder domain for instrumentation
    }
    if (type === 'file-beacon') {
      return `<!-- ctpt:${id}:${crypto.randomBytes(6).toString('hex')} -->`;
    }
    return `ctpt-${id}-${crypto.randomBytes(4).toString('hex')}`;
  }

  private estimateConfidence(token: Honeytoken, callback: LeakCallback): number {
    let confidence = 0.6;
    if (token.tags.includes('high-sensitivity')) {
      confidence += 0.1;
    }
    if (callback.channel === 'http-callback') {
      confidence += 0.15;
    }
    if (callback.sourceAddress) {
      confidence += 0.05;
    }
    return Math.min(0.95, Number(confidence.toFixed(2)));
  }

  private async dispatchWebhook(token: Honeytoken, callback: LeakCallback, confidence: number): Promise<void> {
    if (!this.webhookDispatcher) {
      return;
    }
    const payload: IncidentWebhookPayload = {
      incidentId: this.idFactory(),
      tokenId: token.id,
      tokenType: token.type,
      tokenDisplayName: token.displayName,
      leakScore: token.leakScore,
      sourceSystem: token.sourceSystem,
      channel: callback.channel,
      observedAt: callback.observedAt.toISOString(),
      confidence,
      tags: token.tags,
    };
    await this.webhookDispatcher.dispatch(payload);
  }

  private removeExpiredTokens(): void {
    const now = this.now().getTime();
    for (const token of this.tokens.values()) {
      if (token.expiresAt.getTime() <= now) {
        this.tokens.delete(token.id);
        this.tokensByValue.delete(token.tokenValue);
      }
    }
  }
}

export type CTPTService = CanaryTokenPlantingTracebackService;
