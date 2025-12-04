/**
 * Intelligence Source Model
 * Represents a source of predictive signals in the collective intelligence system
 */

export enum SourceType {
  AGENT = 'AGENT',
  HUMAN = 'HUMAN',
  SENSOR = 'SENSOR',
  SUBSYSTEM = 'SUBSYSTEM',
  EXTERNAL_API = 'EXTERNAL_API',
  ML_MODEL = 'ML_MODEL',
}

export interface IntelligenceSource {
  id: string;
  name: string;
  type: SourceType;
  trustScore: number;
  reliability: number;
  latency: number;
  lastSignal?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegisterSourceInput {
  name: string;
  type: SourceType;
  metadata?: Record<string, unknown>;
  initialTrust?: number;
}

export class IntelligenceSourceFactory {
  static create(input: RegisterSourceInput): IntelligenceSource {
    const now = new Date();
    return {
      id: crypto.randomUUID(),
      name: input.name,
      type: input.type,
      trustScore: input.initialTrust ?? 0.5,
      reliability: 0.5,
      latency: 0,
      metadata: input.metadata,
      createdAt: now,
      updatedAt: now,
    };
  }

  static validate(source: IntelligenceSource): boolean {
    if (!source.id || !source.name || !source.type) {
      return false;
    }
    if (source.trustScore < 0 || source.trustScore > 1) {
      return false;
    }
    if (source.reliability < 0 || source.reliability > 1) {
      return false;
    }
    return true;
  }

  static updateTrust(
    source: IntelligenceSource,
    adjustment: number,
  ): IntelligenceSource {
    const newTrust = Math.max(0, Math.min(1, source.trustScore + adjustment));
    return {
      ...source,
      trustScore: newTrust,
      updatedAt: new Date(),
    };
  }

  static updateReliability(
    source: IntelligenceSource,
    accurateSignals: number,
    totalSignals: number,
  ): IntelligenceSource {
    if (totalSignals === 0) return source;
    const newReliability = accurateSignals / totalSignals;
    return {
      ...source,
      reliability: newReliability,
      updatedAt: new Date(),
    };
  }

  static recordLatency(
    source: IntelligenceSource,
    latencyMs: number,
  ): IntelligenceSource {
    // Exponential moving average for latency
    const alpha = 0.3;
    const newLatency = alpha * latencyMs + (1 - alpha) * source.latency;
    return {
      ...source,
      latency: newLatency,
      lastSignal: new Date(),
      updatedAt: new Date(),
    };
  }
}

export function getSourceWeight(source: IntelligenceSource): number {
  // Combine trust and reliability with latency penalty
  const latencyPenalty = Math.exp(-source.latency / 10000); // Decay over 10s
  return source.trustScore * source.reliability * latencyPenalty;
}

export function isSourceActive(
  source: IntelligenceSource,
  maxIdleMs: number = 300000,
): boolean {
  if (!source.lastSignal) return false;
  const idleTime = Date.now() - source.lastSignal.getTime();
  return idleTime < maxIdleMs;
}
