import type { NarrativeState, EntityDynamicState, TimeVariantParameter } from './types.js';

export interface DriftEvent {
  targetId: string;
  targetType: 'entity' | 'parameter';
  metric: string;
  severity: 'low' | 'medium' | 'high';
  tick: number;
  description: string;
  expectedValue: number;
  actualValue: number;
  deviationScore: number; // Z-score
}

export interface DriftConfig {
  windowSize: number; // Number of history points to use for baseline
  sensitivity: number; // Z-score threshold (e.g., 2.0 or 3.0)
  minDataPoints: number; // Minimum history needed
}

export class NarrativeDriftDetector {
  constructor(
    private config: DriftConfig = {
      windowSize: 10,
      sensitivity: 2.5,
      minDataPoints: 5,
    },
  ) {}

  detect(state: NarrativeState): DriftEvent[] {
    const events: DriftEvent[] = [];

    // Check Entities
    for (const [id, entity] of Object.entries(state.entities)) {
      events.push(...this.checkEntity(id, entity, state.tick));
    }

    // Check Parameters
    for (const [name, param] of Object.entries(state.parameters)) {
      events.push(...this.checkParameter(name, param, state.tick));
    }

    return events;
  }

  private checkEntity(
    id: string,
    entity: EntityDynamicState,
    currentTick: number,
  ): DriftEvent[] {
    const events: DriftEvent[] = [];

    // Check Sentiment
    const sentimentHistory = entity.history.map((h) => h.sentiment);
    const sentimentDrift = this.analyzeSeries(sentimentHistory, 'sentiment');
    if (sentimentDrift) {
      events.push({
        targetId: id,
        targetType: 'entity',
        ...sentimentDrift,
        tick: currentTick,
      });
    }

    // Check Influence
    const influenceHistory = entity.history.map((h) => h.influence);
    const influenceDrift = this.analyzeSeries(influenceHistory, 'influence');
    if (influenceDrift) {
      events.push({
        targetId: id,
        targetType: 'entity',
        ...influenceDrift,
        tick: currentTick,
      });
    }

    return events;
  }

  private checkParameter(
    name: string,
    param: TimeVariantParameter,
    currentTick: number,
  ): DriftEvent[] {
    const history = param.history.map((h) => h.value);
    const drift = this.analyzeSeries(history, 'value');
    if (drift) {
      return [
        {
          targetId: name,
          targetType: 'parameter',
          ...drift,
          tick: currentTick,
        },
      ];
    }
    return [];
  }

  private analyzeSeries(
    data: number[],
    metric: string,
  ): Omit<DriftEvent, 'targetId' | 'targetType' | 'tick'> | null {
    // We need at least (minDataPoints + 1) to have comparison
    if (data.length < this.config.minDataPoints + 1) return null;

    const current = data[data.length - 1];
    // History excludes the current point for baseline calculation
    const history = data.slice(
      Math.max(0, data.length - 1 - this.config.windowSize),
      data.length - 1,
    );

    if (history.length === 0) return null;

    const mean = history.reduce((a, b) => a + b, 0) / history.length;
    const variance =
      history.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / history.length;
    const stdDev = Math.sqrt(variance);

    // Handle zero variance (constant history)
    if (stdDev === 0) {
      if (Math.abs(current - mean) > 0.0001) {
        return {
          metric,
          severity: 'high',
          description: `Sudden shift from stable baseline ${mean.toFixed(
            2,
          )} to ${current.toFixed(2)}`,
          expectedValue: mean,
          actualValue: current,
          deviationScore: 999,
        };
      }
      return null;
    }

    const zScore = Math.abs((current - mean) / stdDev);

    if (zScore > this.config.sensitivity) {
      const severity =
        zScore > this.config.sensitivity * 2
          ? 'high'
          : zScore > this.config.sensitivity * 1.5
            ? 'medium'
            : 'low';
      return {
        metric,
        severity,
        description: `Value ${current.toFixed(
          2,
        )} deviates from historical baseline ${mean.toFixed(2)} (Z=${zScore.toFixed(
          2,
        )})`,
        expectedValue: mean,
        actualValue: current,
        deviationScore: zScore,
      };
    }

    return null;
  }
}
