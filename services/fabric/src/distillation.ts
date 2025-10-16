export type CloudProvider = 'aws' | 'gcp' | 'azure';

export interface Quote {
  provider: CloudProvider;
  region: string;
  spotUsdHour: number;
  latencyMs: number;
}

export interface DistilledBuildSignalSummary {
  branch: string;
  studentScore: number;
  reliability?: number;
  velocity?: number;
  security?: number;
  coverage?: number;
  timestamp: number;
}

export interface FabricDistillationContext {
  needGpu?: boolean;
  expectedBurst?: number;
  minReliability?: number;
  buildSignals?: DistilledBuildSignalSummary[];
}

export interface RankedQuote {
  quote: Quote;
  score: number;
  rationale: string[];
}

interface ProviderProfile {
  key: string;
  emaCost: number;
  emaLatency: number;
  reliabilityBias: number;
  observations: number;
  lastScore: number;
}

interface FabricSnapshot {
  providers: Array<ProviderProfile & { quote: Quote }>;
  reliabilityPulse: number;
  velocityPulse: number;
  securityPulse: number;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(Math.max(value, min), max);
}

export class FabricDistillationEngine {
  private readonly providerProfiles: Map<string, ProviderProfile> = new Map();
  private reliabilityPulse = 0.72;
  private velocityPulse = 0.68;
  private securityPulse = 0.7;
  private lastSignals: DistilledBuildSignalSummary[] = [];

  rankQuotes(
    quotes: Quote[],
    context: FabricDistillationContext = {},
  ): RankedQuote[] {
    this.ingestSignals(context.buildSignals);

    const { needGpu, expectedBurst, minReliability } = context;
    const burstAmplifier = expectedBurst
      ? clamp(expectedBurst / 10, 0, 0.3)
      : 0;

    return quotes
      .map((quote) => {
        const rationale: string[] = [];
        const profile = this.getOrCreateProfile(quote);

        profile.emaCost = this.ema(profile.emaCost, quote.spotUsdHour, 0.35);
        profile.emaLatency = this.ema(
          profile.emaLatency,
          quote.latencyMs,
          0.35,
        );

        const costScore = this.scoreCost(profile.emaCost);
        const latencyScore = this.scoreLatency(profile.emaLatency);
        const reliabilityScore = this.scoreReliability(profile, minReliability);

        const urgency = clamp(1 - this.velocityPulse, 0, 1);
        const securityUrgency = clamp(1 - this.securityPulse, 0, 1);

        let costWeight = 0.4 - urgency * 0.08;
        let latencyWeight = 0.3 + urgency * 0.15;
        let reliabilityWeight = 0.3 + securityUrgency * 0.15;

        if (needGpu) {
          reliabilityWeight += 0.05;
          latencyWeight += 0.05;
          rationale.push('GPU bias applied for deterministic warm-up');
        }

        const weightTotal = costWeight + latencyWeight + reliabilityWeight;
        costWeight /= weightTotal;
        latencyWeight /= weightTotal;
        reliabilityWeight /= weightTotal;

        let score =
          costWeight * costScore +
          latencyWeight * latencyScore +
          reliabilityWeight * reliabilityScore +
          burstAmplifier;

        if (reliabilityScore < (minReliability ?? 0.45)) {
          score *= reliabilityScore / ((minReliability ?? 0.45) || 1);
          rationale.push('Reliability gating applied by fabric distiller');
        }

        profile.lastScore = score;
        profile.observations += 1;

        if (costScore > 0.7)
          rationale.push('Cost-efficient after distillation');
        if (latencyScore > 0.75 && urgency > 0.2)
          rationale.push('Latency prioritized due to slow build velocity');
        if (reliabilityScore > 0.75 && securityUrgency > 0.2) {
          rationale.push('Reliability uplifted for security hardening');
        }
        if (burstAmplifier > 0) {
          rationale.push(
            `Burst amplifier ${burstAmplifier.toFixed(2)} for expected demand`,
          );
        }

        return {
          quote,
          score: clamp(score),
          rationale,
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  prepareLaunchPlan(quote: Quote, label: string) {
    const profile = this.getOrCreateProfile(quote);
    return {
      id: `${profile.key}:${label}`,
      reliabilityBias: profile.reliabilityBias,
      expectedLatency: profile.emaLatency,
      expectedCost: profile.emaCost,
    };
  }

  recordOutcome(quote: Quote, success: boolean) {
    const profile = this.getOrCreateProfile(quote);
    const delta = success ? 0.1 : -0.15;
    profile.reliabilityBias = clamp(
      profile.reliabilityBias + delta,
      0.05,
      0.98,
    );
  }

  getSnapshot(): FabricSnapshot {
    const providers = Array.from(this.providerProfiles.values()).map(
      (profile) => ({
        ...profile,
        quote: this.parseKey(profile.key),
      }),
    );

    return {
      providers,
      reliabilityPulse: this.reliabilityPulse,
      velocityPulse: this.velocityPulse,
      securityPulse: this.securityPulse,
    };
  }

  private ingestSignals(signals?: DistilledBuildSignalSummary[]): void {
    if (!signals || signals.length === 0) return;

    this.lastSignals = signals;

    const avg = (
      selector: (signal: DistilledBuildSignalSummary) => number | undefined,
    ) => {
      const values = signals
        .map((signal) => selector(signal))
        .filter(
          (value): value is number =>
            typeof value === 'number' && !Number.isNaN(value),
        );
      if (values.length === 0) return undefined;
      return values.reduce((acc, value) => acc + value, 0) / values.length;
    };

    const reliability = avg(
      (signal) => signal.reliability ?? signal.studentScore,
    );
    const velocity = avg((signal) => signal.velocity);
    const security = avg((signal) => signal.security ?? signal.coverage);

    if (typeof reliability === 'number') {
      this.reliabilityPulse = clamp(reliability);
    }
    if (typeof velocity === 'number') {
      this.velocityPulse = clamp(velocity);
    }
    if (typeof security === 'number') {
      this.securityPulse = clamp(security);
    }
  }

  private scoreCost(cost: number): number {
    if (cost <= 0) return 1;
    const scaled = 1 / (1 + cost);
    return clamp(scaled);
  }

  private scoreLatency(latency: number): number {
    if (latency <= 0) return 1;
    const scaled = 1 / (1 + latency / 100);
    return clamp(scaled);
  }

  private scoreReliability(
    profile: ProviderProfile,
    minReliability?: number,
  ): number {
    const baseline = clamp(
      (profile.reliabilityBias + this.reliabilityPulse) / 2,
    );
    if (!minReliability) return baseline;

    if (baseline < minReliability) {
      return clamp(baseline * 0.9);
    }

    return baseline;
  }

  private getOrCreateProfile(quote: Quote): ProviderProfile {
    const key = this.keyForQuote(quote);
    const existing = this.providerProfiles.get(key);
    if (existing) {
      return existing;
    }

    const profile: ProviderProfile = {
      key,
      emaCost: quote.spotUsdHour,
      emaLatency: quote.latencyMs,
      reliabilityBias: 0.7,
      observations: 0,
      lastScore: 0,
    };
    this.providerProfiles.set(key, profile);
    return profile;
  }

  private keyForQuote(quote: Quote): string {
    return `${quote.provider}:${quote.region}`;
  }

  private parseKey(key: string): Quote {
    const [provider, region] = key.split(':');
    return {
      provider: provider as CloudProvider,
      region,
      spotUsdHour: this.providerProfiles.get(key)?.emaCost ?? 1,
      latencyMs: this.providerProfiles.get(key)?.emaLatency ?? 250,
    };
  }

  private ema(current: number, incoming: number, alpha: number): number {
    return current * (1 - alpha) + incoming * alpha;
  }
}
