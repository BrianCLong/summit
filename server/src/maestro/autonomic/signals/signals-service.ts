
import { Signal, SignalType, SignalSeries, HealthSnapshot, ComponentHealth, HealthStatus } from './types';
import { randomUUID } from 'crypto';

export class SignalsService {
  private signals: Signal[] = [];
  // In-memory buffer for now, would be a Time Series DB in prod
  private retentionPeriodMs = 7 * 24 * 60 * 60 * 1000; // 7 days

  public ingestSignal(signal: Omit<Signal, 'id' | 'timestamp'> & { timestamp?: Date }): void {
    const newSignal: Signal = {
      ...signal,
      id: randomUUID(),
      timestamp: signal.timestamp || new Date(),
    };
    this.signals.push(newSignal);
    this.pruneOldSignals();
  }

  public getSignals(
    type: SignalType,
    sourceId: string,
    windowStart: Date,
    windowEnd: Date = new Date()
  ): Signal[] {
    return this.signals.filter(
      (s) =>
        s.type === type &&
        s.sourceId === sourceId &&
        s.timestamp >= windowStart &&
        s.timestamp <= windowEnd
    );
  }

  public aggregateSignals(
    type: SignalType,
    sourceId: string,
    periodStr: '5m' | '1h' | '24h' | '7d'
  ): SignalSeries {
    const now = new Date();
    let durationMs = 0;
    switch (periodStr) {
      case '5m': durationMs = 5 * 60 * 1000; break;
      case '1h': durationMs = 60 * 60 * 1000; break;
      case '24h': durationMs = 24 * 60 * 60 * 1000; break;
      case '7d': durationMs = 7 * 24 * 60 * 60 * 1000; break;
    }

    const windowStart = new Date(now.getTime() - durationMs);
    const relevantSignals = this.getSignals(type, sourceId, windowStart, now);

    return {
      type,
      sourceId,
      period: periodStr,
      datapoints: relevantSignals.map(s => ({ timestamp: s.timestamp, value: s.value })).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
    };
  }

  public generateHealthSnapshot(tenantId: string): HealthSnapshot {
    const now = new Date();
    // 1 hour window for health calculation default
    const windowStart = new Date(now.getTime() - 60 * 60 * 1000);
    const tenantSignals = this.signals.filter(s => s.tenantId === tenantId && s.timestamp >= windowStart);

    // Group by source type
    const systemSignals = tenantSignals.filter(s => s.metadata?.scope === 'SYSTEM');
    // Assuming sourceId can map to workstreams or agents via external registry or metadata
    // For simplicity here, we rely on metadata 'scope' and 'id'

    // This is a simplified derivation. In a real system, we'd query a registry of all active agents/workstreams.
    // Here we derive "known" entities from the signal stream itself.
    const workstreamIds = new Set(tenantSignals.filter(s => s.metadata?.scope === 'WORKSTREAM').map(s => s.sourceId));
    const agentIds = new Set(tenantSignals.filter(s => s.metadata?.scope === 'AGENT').map(s => s.sourceId));

    const systemHealth = this.calculateComponentHealth('system-core', 'SYSTEM', systemSignals);

    const workstreams: Record<string, ComponentHealth> = {};
    workstreamIds.forEach(id => {
      workstreams[id] = this.calculateComponentHealth(id, 'WORKSTREAM', tenantSignals.filter(s => s.sourceId === id));
    });

    const agents: Record<string, ComponentHealth> = {};
    agentIds.forEach(id => {
      agents[id] = this.calculateComponentHealth(id, 'AGENT', tenantSignals.filter(s => s.sourceId === id));
    });

    return {
      timestamp: now,
      tenantId,
      system: systemHealth,
      workstreams,
      agents,
    };
  }

  private calculateComponentHealth(id: string, type: ComponentHealth['type'], signals: Signal[]): ComponentHealth {
    if (signals.length === 0) {
      return {
        id,
        type,
        score: 100, // Default to healthy if no bad signals
        status: HealthStatus.UNKNOWN,
        metrics: {},
        issues: [],
        lastUpdated: new Date(),
      };
    }

    // Basic heuristic:
    // Errors reduce score heavily.
    // High latency reduces score moderately.
    // Successes boost score (up to 100).

    let score = 100;
    const issues: string[] = [];
    const metricsAcc: Record<string, number[]> = {};

    for (const s of signals) {
      if (!metricsAcc[s.type]) metricsAcc[s.type] = [];
      metricsAcc[s.type].push(s.value);

      if (s.type === SignalType.TASK_FAILURE_COUNT || s.type === SignalType.LLM_ERROR_RATE || s.type === SignalType.CI_BUILD_STATUS && s.value === 0) {
        score -= 20; // Heavy penalty for failures
        issues.push(`Detected failure: ${s.type}`);
      }
      if (s.type === SignalType.POLICY_DENIAL) {
        score -= 10;
        issues.push('Policy denial');
      }
      if (s.type === SignalType.TASK_LATENCY && s.value > 5000) { // Arbitrary threshold for demo
        score -= 5;
        issues.push('High latency');
      }
    }

    // Average metrics
    const finalMetrics: Record<string, number> = {};
    for (const k in metricsAcc) {
      const sum = metricsAcc[k].reduce((a, b) => a + b, 0);
      finalMetrics[k] = sum / metricsAcc[k].length;
    }

    score = Math.max(0, Math.min(100, score));

    let status = HealthStatus.HEALTHY;
    if (score < 50) status = HealthStatus.CRITICAL;
    else if (score < 80) status = HealthStatus.DEGRADED;

    return {
      id,
      type,
      score,
      status,
      metrics: finalMetrics,
      issues: Array.from(new Set(issues)).slice(0, 5), // Dedupe and limit
      lastUpdated: new Date(),
    };
  }

  private pruneOldSignals() {
    const cutoff = new Date(Date.now() - this.retentionPeriodMs);
    this.signals = this.signals.filter(s => s.timestamp >= cutoff);
  }

  // Helper for tests to clear state
  public _reset() {
    this.signals = [];
  }
}
