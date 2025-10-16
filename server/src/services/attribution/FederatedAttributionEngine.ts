/**
 * FederatedAttributionEngine
 * --------------------------
 * A cross-platform attribution system that supports distributed tracking while
 * preserving privacy. The engine orchestrates user journey capture, consent
 * governance, multi-touch attribution scoring, and privacy-safe cohort
 * analytics. It is designed to be production-ready and includes integration
 * hooks for downstream analytics providers.
 */

import { EventEmitter } from 'events';

export type TouchpointChannel =
  | 'email'
  | 'paid_search'
  | 'organic_search'
  | 'display'
  | 'social'
  | 'referral'
  | 'direct'
  | 'other';

export type ConsentType =
  | 'analytics'
  | 'personalization'
  | 'advertising'
  | 'cross_domain';

export interface AttributionEvent {
  eventId: string;
  userId: string;
  timestamp: number;
  domain: string;
  channel: TouchpointChannel;
  campaign?: string;
  touchpointType?: string;
  metadata?: Record<string, unknown>;
  requiredConsents?: ConsentType[];
  nodeId?: string;
}

export interface ConversionEvent extends AttributionEvent {
  conversionId: string;
  goalType: 'purchase' | 'signup' | 'download' | 'custom';
  value: number;
  currency?: string;
}

export interface ConsentRecord {
  userId: string;
  domain: string;
  consentTypes: ConsentType[];
  granted: boolean;
  timestamp: number;
  expiresAt?: number;
  source?: string;
}

export interface FederatedNode {
  nodeId: string;
  region: string;
  capabilities: ('ingest' | 'scoring' | 'cohort')[];
  lastHeartbeat: number;
  metadata?: Record<string, unknown>;
}

export interface AnalyticsConnector {
  id: string;
  name: string;
  description?: string;
  sendAttribution(payload: AttributionDispatchPayload): Promise<void> | void;
  healthCheck?(): Promise<boolean> | boolean;
}

export type MultiTouchModelType =
  | 'first_touch'
  | 'last_touch'
  | 'linear'
  | 'time_decay'
  | 'u_shaped'
  | 'position_based';

export interface MultiTouchModelOptions {
  halfLifeHours?: number;
  customWeights?: Map<string, number>;
}

export interface AttributionContribution {
  event: AttributionEvent;
  weight: number;
  contributionValue: number;
}

export interface AttributionResult {
  conversion: ConversionEvent;
  model: MultiTouchModelType;
  contributions: AttributionContribution[];
  totalContribution: number;
  uniqueChannels: number;
  uniqueDomains: number;
  journeyLength: number;
  computedAt: number;
}

export interface ConversionPathSummary {
  userId: string;
  touches: number;
  channels: TouchpointChannel[];
  domains: string[];
  campaigns: string[];
  timeToConvertMs: number;
  averageTouchIntervalMs: number;
  lastTouchChannel?: TouchpointChannel;
  firstTouchChannel?: TouchpointChannel;
  conversionChannel?: TouchpointChannel;
}

export interface CohortDefinition {
  cohortId: string;
  channels?: TouchpointChannel[];
  domains?: string[];
  goalTypes?: ConversionEvent['goalType'][];
  minValue?: number;
  lookbackDays?: number;
}

export interface CohortMetrics {
  cohortId: string;
  population: number;
  conversions: number;
  totalValue: number;
  averageValue: number;
  averageTouches: number;
  uniqueChannels: number;
  noiseApplied: number;
  generatedAt: number;
}

export interface AttributionDispatchPayload {
  connectorId: string;
  result: AttributionResult;
  cohortMetrics?: CohortMetrics;
}

export interface FederatedAttributionConfig {
  lookbackWindowDays: number;
  retentionWindowDays: number;
  consentRefreshDays: number;
  minCohortPopulation: number;
  differentialPrivacyEpsilon: number;
  realTimeWindowMinutes: number;
  random?: () => number;
}

const DEFAULT_CONFIG: FederatedAttributionConfig = {
  lookbackWindowDays: 30,
  retentionWindowDays: 90,
  consentRefreshDays: 365,
  minCohortPopulation: 25,
  differentialPrivacyEpsilon: 1.2,
  realTimeWindowMinutes: 30,
};

interface StoredScore {
  conversionId: string;
  model: MultiTouchModelType;
  score: number;
  updatedAt: number;
}

/**
 * The FederatedAttributionEngine orchestrates distributed attribution analytics
 * while preserving privacy boundaries.
 */
export class FederatedAttributionEngine extends EventEmitter {
  private readonly config: FederatedAttributionConfig;
  private readonly journeys: Map<string, AttributionEvent[]> = new Map();
  private readonly conversions: Map<string, ConversionEvent[]> = new Map();
  private readonly consentLedger: Map<string, ConsentRecord[]> = new Map();
  private readonly connectors: Map<string, AnalyticsConnector> = new Map();
  private readonly nodes: Map<string, FederatedNode> = new Map();
  private readonly realTimeScores: Map<string, StoredScore[]> = new Map();

  constructor(config?: Partial<FederatedAttributionConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    if (!this.config.random) {
      this.config.random = Math.random;
    }
  }

  registerNode(node: FederatedNode): void {
    this.nodes.set(node.nodeId, {
      ...node,
      lastHeartbeat: node.lastHeartbeat || Date.now(),
    });
    this.emit('nodeRegistered', node);
  }

  updateNodeHeartbeat(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.lastHeartbeat = Date.now();
      this.nodes.set(nodeId, node);
      this.emit('nodeHeartbeat', node);
    }
  }

  getRegisteredNodes(): FederatedNode[] {
    return Array.from(this.nodes.values());
  }

  registerConnector(connector: AnalyticsConnector): void {
    this.connectors.set(connector.id, connector);
    this.emit('connectorRegistered', connector);
  }

  removeConnector(connectorId: string): void {
    this.connectors.delete(connectorId);
  }

  getConnectors(): AnalyticsConnector[] {
    return Array.from(this.connectors.values());
  }

  recordConsent(record: ConsentRecord): void {
    const ledgerKey = this.getConsentKey(record.userId, record.domain);
    const existing = this.consentLedger.get(ledgerKey) ?? [];
    const sanitized: ConsentRecord = {
      ...record,
      timestamp: record.timestamp,
      expiresAt:
        record.expiresAt ??
        record.timestamp + this.config.consentRefreshDays * 24 * 60 * 60 * 1000,
    };
    this.consentLedger.set(ledgerKey, [...existing, sanitized]);
    this.emit('consentRecorded', sanitized);
  }

  getConsentHistory(userId: string, domain: string): ConsentRecord[] {
    return [
      ...(this.consentLedger.get(this.getConsentKey(userId, domain)) ?? []),
    ];
  }

  recordEvent(event: AttributionEvent): boolean {
    const requiredConsents = event.requiredConsents ?? ['analytics'];
    if (!this.hasValidConsent(event.userId, event.domain, requiredConsents)) {
      this.emit('eventSkipped', { reason: 'missing_consent', event });
      return false;
    }

    const timeline = this.journeys.get(event.userId) ?? [];
    const sanitized: AttributionEvent = {
      ...event,
      timestamp: event.timestamp,
    };
    timeline.push(sanitized);
    timeline.sort((a, b) => a.timestamp - b.timestamp);
    this.journeys.set(event.userId, this.pruneEvents(timeline));
    this.emit('eventRecorded', sanitized);
    return true;
  }

  getJourney(userId: string): AttributionEvent[] {
    return [...(this.journeys.get(userId) ?? [])];
  }

  recordConversion(conversion: ConversionEvent): boolean {
    const recorded = this.recordEvent({
      ...conversion,
      requiredConsents: conversion.requiredConsents,
    });
    if (!recorded) {
      return false;
    }

    const history = this.conversions.get(conversion.userId) ?? [];
    history.push(conversion);
    history.sort((a, b) => a.timestamp - b.timestamp);
    this.conversions.set(conversion.userId, history);
    this.emit('conversionRecorded', conversion);
    return true;
  }

  analyzeConversionPath(
    userId: string,
    conversion?: ConversionEvent,
  ): ConversionPathSummary | null {
    const journey = this.getJourney(userId);
    if (journey.length === 0) {
      return null;
    }

    const lastTouch =
      conversion ?? (journey[journey.length - 1] as ConversionEvent);
    const lookbackLimit =
      lastTouch.timestamp -
      this.config.lookbackWindowDays * 24 * 60 * 60 * 1000;
    const relevant = journey
      .filter(
        (event) =>
          event.timestamp <= lastTouch.timestamp &&
          event.timestamp >= lookbackLimit,
      )
      .filter((event) => event.eventId !== lastTouch.eventId);

    if (relevant.length === 0) {
      return null;
    }

    const channels = relevant.map((t) => t.channel);
    const domains = relevant.map((t) => t.domain);
    const campaigns = relevant
      .map((t) => t.campaign)
      .filter((c): c is string => Boolean(c));
    const firstTouch = relevant[0];
    const preConversionLast = relevant[relevant.length - 1];

    const duration = lastTouch.timestamp - firstTouch.timestamp;
    const averageInterval =
      relevant.length > 1 ? duration / (relevant.length - 1) : 0;

    return {
      userId,
      touches: relevant.length,
      channels,
      domains,
      campaigns,
      timeToConvertMs: duration,
      averageTouchIntervalMs: averageInterval,
      firstTouchChannel: firstTouch.channel,
      lastTouchChannel: preConversionLast?.channel,
      conversionChannel: lastTouch.channel,
    };
  }

  computeAttribution(
    conversion: ConversionEvent,
    model: MultiTouchModelType,
    options?: MultiTouchModelOptions,
  ): AttributionResult | null {
    const journey = this.getJourney(conversion.userId);
    if (journey.length === 0) {
      return null;
    }

    const lookbackLimit =
      conversion.timestamp -
      this.config.lookbackWindowDays * 24 * 60 * 60 * 1000;
    const candidates = journey
      .filter(
        (event) =>
          event.timestamp <= conversion.timestamp &&
          event.timestamp >= lookbackLimit,
      )
      .filter((event) => event.eventId !== conversion.eventId);

    if (candidates.length === 0) {
      return null;
    }

    const weights = this.calculateWeights(
      candidates,
      conversion,
      model,
      options,
    );
    const contributions: AttributionContribution[] = candidates.map((event) => {
      const weight = weights.get(event.eventId) ?? 0;
      return {
        event,
        weight,
        contributionValue: Number((weight * conversion.value).toFixed(6)),
      };
    });

    const totalContribution = contributions.reduce(
      (acc, current) => acc + current.contributionValue,
      0,
    );
    const uniqueChannels = new Set(candidates.map((event) => event.channel))
      .size;
    const uniqueDomains = new Set(candidates.map((event) => event.domain)).size;

    const result: AttributionResult = {
      conversion,
      model,
      contributions,
      totalContribution,
      uniqueChannels,
      uniqueDomains,
      journeyLength: candidates.length,
      computedAt: Date.now(),
    };

    this.emit('attributionComputed', result);
    return result;
  }

  async processRealTimeAttribution(
    conversion: ConversionEvent,
    model: MultiTouchModelType,
    options?: MultiTouchModelOptions,
  ): Promise<AttributionResult | null> {
    const recorded = this.recordConversion(conversion);
    if (!recorded) {
      return null;
    }

    const attribution = this.computeAttribution(conversion, model, options);
    if (!attribution) {
      return null;
    }

    const windowLimit =
      Date.now() - this.config.realTimeWindowMinutes * 60 * 1000;
    const scores = this.realTimeScores.get(conversion.userId) ?? [];
    scores.push({
      conversionId: conversion.conversionId,
      model,
      score: attribution.totalContribution,
      updatedAt: Date.now(),
    });
    const filtered = scores.filter((score) => score.updatedAt >= windowLimit);
    this.realTimeScores.set(conversion.userId, filtered);

    await this.dispatchToConnectors(attribution);
    return attribution;
  }

  getRealTimeScores(userId: string): StoredScore[] {
    return [...(this.realTimeScores.get(userId) ?? [])];
  }

  generateCohortMetrics(definition: CohortDefinition): CohortMetrics | null {
    const lookbackMs =
      (definition.lookbackDays ?? this.config.lookbackWindowDays) *
      24 *
      60 *
      60 *
      1000;
    const horizon = Date.now() - lookbackMs;

    const populations: ConversionEvent[] = [];
    for (const [, userConversions] of this.conversions.entries()) {
      for (const conversion of userConversions) {
        if (conversion.timestamp < horizon) {
          continue;
        }
        if (
          definition.goalTypes &&
          !definition.goalTypes.includes(conversion.goalType)
        ) {
          continue;
        }
        if (definition.minValue && conversion.value < definition.minValue) {
          continue;
        }
        const path = this.analyzeConversionPath(conversion.userId, conversion);
        if (!path) {
          continue;
        }
        if (
          definition.channels &&
          !path.channels.some((channel) =>
            definition.channels?.includes(channel),
          )
        ) {
          continue;
        }
        if (
          definition.domains &&
          !path.domains.some((domain) => definition.domains?.includes(domain))
        ) {
          continue;
        }
        populations.push(conversion);
      }
    }

    if (populations.length < this.config.minCohortPopulation) {
      return null;
    }

    const totalValue = populations.reduce(
      (acc, conversion) => acc + conversion.value,
      0,
    );
    const averageValue = totalValue / populations.length;
    const touches = populations.map(
      (conversion) =>
        this.analyzeConversionPath(conversion.userId, conversion)?.touches ?? 0,
    );
    const averageTouches =
      touches.reduce((acc, current) => acc + current, 0) / populations.length;

    const channels = new Set<TouchpointChannel>();
    populations.forEach((conversion) => {
      const path = this.analyzeConversionPath(conversion.userId, conversion);
      path?.channels.forEach((channel) => channels.add(channel));
    });

    const noise = this.generateLaplaceNoise();
    const noisyValue = totalValue + noise;

    const metrics: CohortMetrics = {
      cohortId: definition.cohortId,
      population: populations.length,
      conversions: populations.length,
      totalValue: Number(noisyValue.toFixed(4)),
      averageValue: Number(averageValue.toFixed(4)),
      averageTouches: Number(averageTouches.toFixed(4)),
      uniqueChannels: channels.size,
      noiseApplied: Number(noise.toFixed(4)),
      generatedAt: Date.now(),
    };

    this.emit('cohortGenerated', metrics);
    return metrics;
  }

  private async dispatchToConnectors(result: AttributionResult): Promise<void> {
    const tasks = Array.from(this.connectors.values()).map(
      async (connector) => {
        try {
          await connector.sendAttribution({
            connectorId: connector.id,
            result,
          });
        } catch (error) {
          this.emit('connectorError', { connectorId: connector.id, error });
        }
      },
    );

    await Promise.all(tasks);
  }

  private pruneEvents(events: AttributionEvent[]): AttributionEvent[] {
    const retentionBoundary =
      Date.now() - this.config.retentionWindowDays * 24 * 60 * 60 * 1000;
    return events.filter((event) => event.timestamp >= retentionBoundary);
  }

  private getConsentKey(userId: string, domain: string): string {
    return `${userId}:${domain}`;
  }

  private hasValidConsent(
    userId: string,
    domain: string,
    consents: ConsentType[],
  ): boolean {
    const history = this.consentLedger.get(this.getConsentKey(userId, domain));
    if (!history || history.length === 0) {
      return false;
    }

    const now = Date.now();
    const latest = [...history]
      .filter(
        (entry) => entry.granted && (!entry.expiresAt || entry.expiresAt > now),
      )
      .sort((a, b) => b.timestamp - a.timestamp)[0];

    if (!latest) {
      return false;
    }

    return consents.every((type) => latest.consentTypes.includes(type));
  }

  private calculateWeights(
    events: AttributionEvent[],
    conversion: ConversionEvent,
    model: MultiTouchModelType,
    options?: MultiTouchModelOptions,
  ): Map<string, number> {
    switch (model) {
      case 'first_touch':
        return this.firstTouchWeights(events);
      case 'last_touch':
        return this.lastTouchWeights(events);
      case 'linear':
        return this.linearWeights(events);
      case 'time_decay':
        return this.timeDecayWeights(events, conversion, options);
      case 'u_shaped':
        return this.uShapedWeights(events);
      case 'position_based':
        return this.positionBasedWeights(events, options);
      default:
        return this.linearWeights(events);
    }
  }

  private firstTouchWeights(events: AttributionEvent[]): Map<string, number> {
    const weights = new Map<string, number>();
    if (events.length === 0) {
      return weights;
    }
    weights.set(events[0].eventId, 1);
    return weights;
  }

  private lastTouchWeights(events: AttributionEvent[]): Map<string, number> {
    const weights = new Map<string, number>();
    if (events.length === 0) {
      return weights;
    }
    weights.set(events[events.length - 1].eventId, 1);
    return weights;
  }

  private linearWeights(events: AttributionEvent[]): Map<string, number> {
    const weights = new Map<string, number>();
    if (events.length === 0) {
      return weights;
    }
    const share = 1 / events.length;
    events.forEach((event) => weights.set(event.eventId, share));
    return weights;
  }

  private timeDecayWeights(
    events: AttributionEvent[],
    conversion: ConversionEvent,
    options?: MultiTouchModelOptions,
  ): Map<string, number> {
    const halfLifeHours = options?.halfLifeHours ?? 24;
    const weights = new Map<string, number>();
    if (events.length === 0) {
      return weights;
    }

    const decayWeights = events.map((event) => {
      const hours = (conversion.timestamp - event.timestamp) / (1000 * 60 * 60);
      const weight = Math.pow(0.5, hours / halfLifeHours);
      return { event, weight };
    });

    const total = decayWeights.reduce(
      (acc, current) => acc + current.weight,
      0,
    );
    decayWeights.forEach(({ event, weight }) => {
      weights.set(event.eventId, weight / total);
    });
    return weights;
  }

  private uShapedWeights(events: AttributionEvent[]): Map<string, number> {
    const weights = new Map<string, number>();
    if (events.length === 0) {
      return weights;
    }
    if (events.length === 1) {
      weights.set(events[0].eventId, 1);
      return weights;
    }

    const firstWeight = 0.4;
    const lastWeight = 0.4;
    const middleWeight = events.length > 2 ? 0.2 / (events.length - 2) : 0;

    events.forEach((event, index) => {
      if (index === 0) {
        weights.set(event.eventId, firstWeight);
      } else if (index === events.length - 1) {
        weights.set(event.eventId, lastWeight);
      } else {
        weights.set(event.eventId, middleWeight);
      }
    });
    return weights;
  }

  private positionBasedWeights(
    events: AttributionEvent[],
    options?: MultiTouchModelOptions,
  ): Map<string, number> {
    const weights = new Map<string, number>();
    if (events.length === 0) {
      return weights;
    }

    if (
      options?.customWeights &&
      options.customWeights.size === events.length
    ) {
      const total = Array.from(options.customWeights.values()).reduce(
        (acc, value) => acc + value,
        0,
      );
      options.customWeights.forEach((weight, eventId) => {
        weights.set(eventId, weight / total);
      });
      return weights;
    }

    const firstWeight = 0.3;
    const lastWeight = 0.5;
    const middleShare = events.length > 2 ? 0.2 / (events.length - 2) : 0.2;

    events.forEach((event, index) => {
      if (index === 0) {
        weights.set(event.eventId, firstWeight);
      } else if (index === events.length - 1) {
        weights.set(event.eventId, lastWeight);
      } else {
        weights.set(event.eventId, middleShare);
      }
    });
    return weights;
  }

  private generateLaplaceNoise(): number {
    const epsilon = this.config.differentialPrivacyEpsilon;
    const random = this.config.random ?? Math.random;
    const u = random() - 0.5;
    const scale = 1 / epsilon;
    return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  }
}

export default FederatedAttributionEngine;
