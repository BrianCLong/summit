import { NarrativeSimulationEngine } from './engine.js';
import type {
  SimulationConfig,
  ScenarioResult,
  ScenarioCluster,
  NarrativeState,
  ShockDefinition,
} from './types.js';

export class ScenarioSimulator {
  /**
   * Runs a batch of simulations with the given configuration and optional shock.
   * @param config Base simulation configuration
   * @param iterations Number of parallel simulations to run
   * @param ticks Number of ticks to simulate per run
   * @param shock Optional shock to inject at a specific tick (default tick 5)
   */
  async runBatch(
    config: SimulationConfig,
    iterations: number = 10,
    ticks: number = 20,
    shock?: ShockDefinition
  ): Promise<ScenarioResult> {
    const promises: Promise<NarrativeState>[] = [];

    for (let i = 0; i < iterations; i++) {
      const engine = new NarrativeSimulationEngine({
        ...config,
        id: `${config.id}-run-${i}`,
      });

      // If a shock is defined, we need to inject it.
      // Since `tick(steps)` runs all steps at once, we can't easily inject in the middle without splitting the tick call.
      // We will define a runner function.
      promises.push(this.runSingleSimulation(engine, ticks, shock));
    }

    const results = await Promise.all(promises);
    return this.clusterOutcomes(config.id, results);
  }

  private async runSingleSimulation(
    engine: NarrativeSimulationEngine,
    totalTicks: number,
    shock?: ShockDefinition
  ): Promise<NarrativeState> {
    const shockTick = shock ? Math.min(5, totalTicks - 1) : -1;

    if (shock && shockTick >= 0) {
      // Run until shock
      if (shockTick > 0) {
        await engine.tick(shockTick);
      }
      // Inject shock
      engine.injectShock(shock);
      // Run remaining
      await engine.tick(totalTicks - shockTick);
    } else {
      await engine.tick(totalTicks);
    }

    return engine.getState();
  }

  private clusterOutcomes(
    scenarioId: string,
    states: NarrativeState[]
  ): ScenarioResult {
    // 1. Calculate metrics for each state
    const points = states.map((state) => {
      const entities = Object.values(state.entities);
      const avgSentiment =
        entities.reduce((sum, e) => sum + e.sentiment, 0) / entities.length;
      const avgInfluence =
        entities.reduce((sum, e) => sum + e.influence, 0) / entities.length;
      const avgPressure =
        entities.reduce((sum, e) => sum + e.pressure, 0) / entities.length;
      return { id: state.id, avgSentiment, avgInfluence, avgPressure };
    });

    // 2. Simple clustering/binning
    const clusters: Record<string, ScenarioCluster> = {};

    // Define 4 quadrants based on Sentiment (X) and Pressure/Volatility (Y)
    // Sentiment: < -0.1 (Negative), > 0.1 (Positive), else Neutral
    // Pressure: < 0.3 (Stable), > 0.3 (Volatile)

    points.forEach((p) => {
      let label = 'Neutral Stability';
      if (p.avgPressure > 0.3) {
        if (p.avgSentiment < -0.1) label = 'Crisis (High Volatility, Negative)';
        else if (p.avgSentiment > 0.1) label = 'Optimistic Chaos';
        else label = 'High Volatility';
      } else {
        if (p.avgSentiment < -0.1) label = 'Stagnation (Stable Negative)';
        else if (p.avgSentiment > 0.1) label = 'Prosperity (Stable Positive)';
        else label = 'Stability';
      }

      if (!clusters[label]) {
        clusters[label] = {
          label,
          count: 0,
          representativeStateId: p.id,
          avgSentiment: 0,
          avgInfluence: 0,
          sampleIds: [],
        };
      }

      const c = clusters[label];
      c.count++;
      c.sampleIds.push(p.id);
      // Online average update
      c.avgSentiment =
        c.avgSentiment + (p.avgSentiment - c.avgSentiment) / c.count;
      c.avgInfluence =
        c.avgInfluence + (p.avgInfluence - c.avgInfluence) / c.count;
    });

    return {
      scenarioId,
      totalRuns: states.length,
      clusters: Object.values(clusters).sort((a, b) => b.count - a.count),
      allStates: [], // Omit to save bandwidth, or provide summary
    };
  }
}
