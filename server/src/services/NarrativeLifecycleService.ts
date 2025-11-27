import logger from '../utils/logger';

export enum NarrativeStage {
  BIRTH = 'BIRTH',
  GROWTH = 'GROWTH',
  PEAK = 'PEAK',
  DECLINE = 'DECLINE'
}

export interface NarrativeMetrics {
  volume: number; // Total mentions
  velocity: number; // Mentions per hour
  sentiment: number; // -1 to 1
  reach: number; // Estimated audience
}

export interface Narrative {
  id: string;
  topic: string;
  stage: NarrativeStage;
  momentum: number; // acceleration of velocity
  metrics: NarrativeMetrics;
  lastUpdated: Date;
}

export type InterventionType = 'FACT_CHECK' | 'COUNTER_MESSAGING' | 'PLATFORM_FLAGGING' | 'AMPLIFICATION_REDUCTION';

/**
 * Narrative Lifecycle Modeling Service
 *
 * Sprint 23:
 * - Models the birth, growth, peak, and decline of influence narratives.
 * - Identifies tipping points.
 * - Simulates interventions.
 */
export class NarrativeLifecycleService {
  private narratives: Map<string, Narrative> = new Map();

  // Thresholds for stage transitions (simplified for prototype)
  private readonly GROWTH_THRESHOLD_VELOCITY = 50;
  private readonly PEAK_THRESHOLD_VOLUME = 10000;
  private readonly DECLINE_THRESHOLD_MOMENTUM = -10;

  constructor() {}

  /**
   * Initialize a new narrative tracking.
   */
  public createNarrative(id: string, topic: string): Narrative {
    const narrative: Narrative = {
      id,
      topic,
      stage: NarrativeStage.BIRTH,
      momentum: 0,
      metrics: {
        volume: 0,
        velocity: 0,
        sentiment: 0,
        reach: 0
      },
      lastUpdated: new Date()
    };
    this.narratives.set(id, narrative);
    return narrative;
  }

  /**
   * Update narrative metrics and determine lifecycle stage.
   */
  public updateNarrative(id: string, newMetrics: NarrativeMetrics): Narrative {
    const narrative = this.narratives.get(id);
    if (!narrative) {
      throw new Error(`Narrative ${id} not found`);
    }

    // Calculate momentum (change in velocity)
    // In a real system, we'd use time delta. Here assuming uniform updates.
    const momentum = newMetrics.velocity - narrative.metrics.velocity;

    narrative.momentum = momentum;
    narrative.metrics = newMetrics;
    narrative.lastUpdated = new Date();

    this.evaluateStage(narrative);

    return narrative;
  }

  /**
   * Determine the current stage based on metrics.
   */
  private evaluateStage(narrative: Narrative) {
    const { velocity, volume } = narrative.metrics;
    const { momentum, stage } = narrative;

    // State machine logic
    switch (stage) {
      case NarrativeStage.BIRTH:
        if (velocity > this.GROWTH_THRESHOLD_VELOCITY) {
          narrative.stage = NarrativeStage.GROWTH;
          logger.info(`Narrative ${narrative.id} entered GROWTH stage`);
        }
        break;

      case NarrativeStage.GROWTH:
        // Transition to PEAK if volume is high but momentum slows
        if (volume > this.PEAK_THRESHOLD_VOLUME || (momentum < 0 && velocity > this.GROWTH_THRESHOLD_VELOCITY)) {
          narrative.stage = NarrativeStage.PEAK;
          logger.info(`Narrative ${narrative.id} reached PEAK`);
        }
        break;

      case NarrativeStage.PEAK:
        // Transition to DECLINE if momentum is significantly negative or velocity drops
        if (momentum < this.DECLINE_THRESHOLD_MOMENTUM || velocity < this.GROWTH_THRESHOLD_VELOCITY / 2) {
          narrative.stage = NarrativeStage.DECLINE;
          logger.info(`Narrative ${narrative.id} entered DECLINE`);
        }
        break;

      case NarrativeStage.DECLINE:
        // Possible re-emergence logic could go here
        break;
    }
  }

  /**
   * Identifies if a narrative is at a "Tipping Point" (critical moment of growth).
   */
  public isTippingPoint(id: string): boolean {
    const narrative = this.narratives.get(id);
    if (!narrative) return false;

    // Tipping point: Approaching growth threshold with high acceleration
    return (
      narrative.stage === NarrativeStage.BIRTH &&
      narrative.metrics.velocity > (this.GROWTH_THRESHOLD_VELOCITY * 0.8) &&
      narrative.momentum > 5
    );
  }

  /**
   * Simulates the effect of an intervention on the narrative.
   * Returns the predicted new state after intervention.
   */
  public simulateIntervention(id: string, type: InterventionType): Narrative {
    const narrative = this.narratives.get(id);
    if (!narrative) throw new Error(`Narrative ${id} not found`);

    // Clone narrative for simulation
    const simulation = JSON.parse(JSON.stringify(narrative)) as Narrative;

    // Apply intervention effects
    switch (type) {
      case 'FACT_CHECK':
        // Reduces credibility, slows momentum slightly
        simulation.momentum -= 5;
        simulation.metrics.velocity *= 0.9;
        break;

      case 'COUNTER_MESSAGING':
        // Competes for attention, reduces reach
        simulation.metrics.reach *= 0.8;
        simulation.metrics.velocity *= 0.85;
        break;

      case 'PLATFORM_FLAGGING':
        // Significant reduction in visibility
        simulation.metrics.velocity *= 0.4;
        simulation.metrics.reach *= 0.4;
        simulation.momentum = -20;
        break;

      case 'AMPLIFICATION_REDUCTION':
        // Capping the velocity
        simulation.metrics.velocity = Math.min(simulation.metrics.velocity, 10);
        simulation.momentum = -10;
        break;
    }

    // Re-evaluate stage based on simulated metrics
    this.evaluateStage(simulation);

    return simulation;
  }
}
