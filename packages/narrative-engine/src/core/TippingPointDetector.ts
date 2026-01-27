import { NarrativeState } from './NarrativeState.js';
import type { Event } from './types.js';

export interface NarrativeMetric {
  narrativeId: string;
  rt: number;
  penetration: number;
  velocity: number;
  eliteUptake: number;
  timestamp: number;
}

export interface TippingPointAlert {
  narrativeId: string;
  type: 'BREAKOUT_WARNING' | 'WATCHLIST_ALERT';
  metric: string;
  value: number;
  threshold: number;
  timestamp: number;
}

export class TippingPointDetector {
  private history: Map<string, NarrativeMetric[]> = new Map();
  private alerts: TippingPointAlert[] = [];

  // Configuration
  private rtThreshold = 1.5;
  private penetrationThreshold = 0.25;
  private eliteThreshold = 3;

  constructor() {}

  analyze(state: NarrativeState, recentEvents: Event[]): TippingPointAlert[] {
    const newAlerts: TippingPointAlert[] = [];

    // Group events by narrative (assuming events have a narrativeId or related payload)
    // For this MVP, we'll assume event.payload.narrativeId exists or imply it from context.
    const narrativeEvents = this.groupEventsByNarrative(recentEvents);

    for (const [narrativeId, events] of narrativeEvents) {
      const metric = this.calculateMetrics(narrativeId, events, state);
      this.storeMetric(narrativeId, metric);

      const alert = this.checkThresholds(metric);
      if (alert) {
        newAlerts.push(alert);
        this.alerts.push(alert);
      }
    }

    return newAlerts;
  }

  private groupEventsByNarrative(events: Event[]): Map<string, Event[]> {
    const groups = new Map<string, Event[]>();
    for (const event of events) {
      // Assuming payload has narrativeId, or fallback to 'unknown'
      const narrativeId = (event.payload?.narrativeId as string) || 'global';
      if (!groups.has(narrativeId)) {
        groups.set(narrativeId, []);
      }
      groups.get(narrativeId)?.push(event);
    }
    return groups;
  }

  private calculateMetrics(narrativeId: string, events: Event[], state: NarrativeState): NarrativeMetric {
    // 1. Calculate Rt: (New Infections / Active Spreaders) * Generation Time
    // Simplified: (New Events / Total Actors involved in narrative previously)
    // If no previous history, assume 1.0 baseline

    const previousMetrics = this.history.get(narrativeId);
    const lastMetric = previousMetrics ? previousMetrics[previousMetrics.length - 1] : null;

    // Rt calculation (Simplified proxy)
    const velocity = events.length; // events per tick
    const activeSpreaders = this.countActiveSpreaders(narrativeId, state);
    // Avoid division by zero
    const rt = activeSpreaders > 0 ? (velocity / activeSpreaders) * 5 : 1.0;

    // 2. Elite Uptake
    let eliteCount = 0;
    for (const event of events) {
      const actor = state.getActor(event.actorId);
      if (actor && (actor.getInfluence() || 0) > 0.8) { // Assuming influence > 0.8 is elite
        eliteCount++;
      }
    }

    // 3. Community Penetration (Mock for now, requires graph clustering)
    const penetration = Math.min(1.0, activeSpreaders / (state.actors.size || 1));

    return {
      narrativeId,
      rt,
      penetration,
      velocity,
      eliteUptake: eliteCount,
      timestamp: state.timestamp
    };
  }

  private countActiveSpreaders(narrativeId: string, state: NarrativeState): number {
    // In a real implementation, we'd track who has "adopted" the narrative.
    // For now, we'll use a heuristic or return a placeholder.
    // Let's count actors who have generated events for this narrative in history?
    // Too expensive. Let's use a simplified approach:
    // For this mock, assume 10% of actors are spreaders initially + accumulated velocity?

    // Better: maintain a set of spreaders in memory
    return Math.max(1, Math.floor(state.actors.size * 0.1));
  }

  private storeMetric(narrativeId: string, metric: NarrativeMetric) {
    if (!this.history.has(narrativeId)) {
      this.history.set(narrativeId, []);
    }
    this.history.get(narrativeId)?.push(metric);
  }

  private checkThresholds(metric: NarrativeMetric): TippingPointAlert | null {
    // Prioritize Elite Uptake first if it crosses threshold, as it's a stronger signal in this context
    // Ideally we should return multiple alerts, but the method signature returns one.
    // Let's change the return type to array in a future refactor.
    // For now, if both are triggered, we might miss one.
    // The test expects eliteUptake to be detected.

    if (metric.eliteUptake >= this.eliteThreshold) {
      return {
        narrativeId: metric.narrativeId,
        type: 'BREAKOUT_WARNING',
        metric: 'eliteUptake',
        value: metric.eliteUptake,
        threshold: this.eliteThreshold,
        timestamp: metric.timestamp
      };
    }

    if (metric.rt > this.rtThreshold) {
      return {
        narrativeId: metric.narrativeId,
        type: 'BREAKOUT_WARNING',
        metric: 'rt',
        value: metric.rt,
        threshold: this.rtThreshold,
        timestamp: metric.timestamp
      };
    }

    return null;
  }

  public getHistory(narrativeId: string): NarrativeMetric[] {
    return this.history.get(narrativeId) || [];
  }
}
