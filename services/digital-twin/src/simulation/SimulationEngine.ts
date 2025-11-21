import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';
import type {
  DigitalTwin,
  SimulationConfig,
  SimulationResult,
  TwinStateVector,
  RunSimulationRequest,
} from '../types/index.js';

const logger = pino({ name: 'SimulationEngine' });

interface Scenario {
  name: string;
  overrides: Record<string, unknown>;
}

/**
 * Multi-scale Adaptive Simulation Engine
 * Supports Monte Carlo, Agent-Based, and System Dynamics models
 */
export class SimulationEngine {
  async runSimulation(
    twin: DigitalTwin,
    request: RunSimulationRequest,
  ): Promise<SimulationResult> {
    const startTime = new Date();
    const { config, scenarios = [{ name: 'baseline', overrides: {} }] } = request;

    logger.info(
      { twinId: twin.metadata.id, engine: config.engine, scenarios: scenarios.length },
      'Starting simulation',
    );

    const outcomes = await Promise.all(
      scenarios.map((scenario) => this.runScenario(twin, config, scenario)),
    );

    const endTime = new Date();
    const insights = this.generateInsights(outcomes);
    const recommendations = this.generateRecommendations(twin, outcomes);

    const result: SimulationResult = {
      id: uuidv4(),
      twinId: twin.metadata.id,
      config,
      startTime,
      endTime,
      outcomes,
      insights,
      recommendations,
    };

    logger.info(
      {
        twinId: twin.metadata.id,
        durationMs: endTime.getTime() - startTime.getTime(),
        outcomeCount: outcomes.length,
      },
      'Simulation completed',
    );

    return result;
  }

  private async runScenario(
    twin: DigitalTwin,
    config: SimulationConfig,
    scenario: Scenario,
  ): Promise<SimulationResult['outcomes'][0]> {
    const initialState = {
      ...twin.currentStateVector.properties,
      ...scenario.overrides,
    };

    switch (config.engine) {
      case 'MONTE_CARLO':
        return this.runMonteCarlo(initialState, config, scenario);
      case 'AGENT_BASED':
        return this.runAgentBased(initialState, config, scenario);
      case 'SYSTEM_DYNAMICS':
        return this.runSystemDynamics(initialState, config, scenario);
      case 'HYBRID':
        return this.runHybrid(initialState, config, scenario);
      default:
        throw new Error(`Unknown simulation engine: ${config.engine}`);
    }
  }

  private async runMonteCarlo(
    initialState: Record<string, unknown>,
    config: SimulationConfig,
    scenario: Scenario,
  ): Promise<SimulationResult['outcomes'][0]> {
    const results: Record<string, number[]> = {};

    // Initialize result arrays for numeric properties
    for (const [key, value] of Object.entries(initialState)) {
      if (typeof value === 'number') {
        results[key] = [];
      }
    }

    // Run iterations
    for (let i = 0; i < config.iterations; i++) {
      const state = { ...initialState };

      // Simulate time steps
      for (let t = 0; t < config.timeHorizon / config.timeStep; t++) {
        for (const [key, value] of Object.entries(state)) {
          if (typeof value === 'number') {
            // Add random walk with drift
            const drift = (config.parameters[`${key}_drift`] as number) ?? 0;
            const volatility = (config.parameters[`${key}_volatility`] as number) ?? 0.1;
            const noise = this.normalRandom() * volatility * Math.sqrt(config.timeStep);
            state[key] = value * (1 + drift * config.timeStep + noise);
          }
        }
      }

      // Record final state
      for (const [key, value] of Object.entries(state)) {
        if (typeof value === 'number') {
          results[key].push(value);
        }
      }
    }

    // Compute statistics
    const finalState: Record<string, unknown> = {};
    const metrics: Record<string, number> = {};

    for (const [key, values] of Object.entries(results)) {
      finalState[key] = this.mean(values);
      metrics[`${key}_mean`] = this.mean(values);
      metrics[`${key}_std`] = this.stdDev(values);
      metrics[`${key}_p5`] = this.percentile(values, 5);
      metrics[`${key}_p95`] = this.percentile(values, 95);
    }

    return {
      scenario: scenario.name,
      probability: 1.0 / config.iterations,
      stateVector: {
        timestamp: new Date(),
        confidence: 0.8,
        source: 'MONTE_CARLO_SIMULATION',
        properties: finalState,
      },
      metrics,
    };
  }

  private async runAgentBased(
    initialState: Record<string, unknown>,
    config: SimulationConfig,
    scenario: Scenario,
  ): Promise<SimulationResult['outcomes'][0]> {
    // Simplified agent-based model
    const agentCount = (config.parameters.agentCount as number) ?? 100;
    const agents = Array.from({ length: agentCount }, (_, i) => ({
      id: i,
      state: { ...initialState },
    }));

    // Run time steps
    for (let t = 0; t < config.timeHorizon / config.timeStep; t++) {
      // Agent interactions
      for (const agent of agents) {
        // Simple interaction model
        const neighbors = agents.filter((a) => a.id !== agent.id).slice(0, 5);
        for (const [key, value] of Object.entries(agent.state)) {
          if (typeof value === 'number') {
            const neighborMean =
              neighbors.reduce((sum, n) => sum + (n.state[key] as number), 0) /
              neighbors.length;
            const influence = (config.parameters.influence as number) ?? 0.1;
            agent.state[key] = value * (1 - influence) + neighborMean * influence;
          }
        }
      }
    }

    // Aggregate agent states
    const finalState: Record<string, unknown> = {};
    for (const key of Object.keys(initialState)) {
      if (typeof initialState[key] === 'number') {
        finalState[key] =
          agents.reduce((sum, a) => sum + (a.state[key] as number), 0) / agentCount;
      }
    }

    return {
      scenario: scenario.name,
      probability: 1.0,
      stateVector: {
        timestamp: new Date(),
        confidence: 0.75,
        source: 'AGENT_BASED_SIMULATION',
        properties: finalState,
      },
      metrics: { agentCount, convergence: 0.9 },
    };
  }

  private async runSystemDynamics(
    initialState: Record<string, unknown>,
    config: SimulationConfig,
    scenario: Scenario,
  ): Promise<SimulationResult['outcomes'][0]> {
    const state = { ...initialState };

    // System dynamics with stocks and flows
    for (let t = 0; t < config.timeHorizon / config.timeStep; t++) {
      const flows: Record<string, number> = {};

      // Compute flows based on parameters
      for (const [key, value] of Object.entries(state)) {
        if (typeof value === 'number') {
          const inflow = (config.parameters[`${key}_inflow`] as number) ?? 0;
          const outflow = (config.parameters[`${key}_outflow`] as number) ?? 0;
          const feedback = (config.parameters[`${key}_feedback`] as number) ?? 0;
          flows[key] = (inflow - outflow + value * feedback) * config.timeStep;
        }
      }

      // Update states
      for (const [key, flow] of Object.entries(flows)) {
        (state[key] as number) += flow;
      }
    }

    return {
      scenario: scenario.name,
      probability: 1.0,
      stateVector: {
        timestamp: new Date(),
        confidence: 0.85,
        source: 'SYSTEM_DYNAMICS_SIMULATION',
        properties: state,
      },
      metrics: { equilibrium: 1.0 },
    };
  }

  private async runHybrid(
    initialState: Record<string, unknown>,
    config: SimulationConfig,
    scenario: Scenario,
  ): Promise<SimulationResult['outcomes'][0]> {
    // Combine Monte Carlo with System Dynamics
    const mcResult = await this.runMonteCarlo(initialState, config, scenario);
    const sdResult = await this.runSystemDynamics(initialState, config, scenario);

    // Weighted ensemble
    const finalState: Record<string, unknown> = {};
    for (const key of Object.keys(initialState)) {
      const mcVal = mcResult.stateVector.properties[key];
      const sdVal = sdResult.stateVector.properties[key];
      if (typeof mcVal === 'number' && typeof sdVal === 'number') {
        finalState[key] = mcVal * 0.5 + sdVal * 0.5;
      } else {
        finalState[key] = mcVal ?? sdVal;
      }
    }

    return {
      scenario: scenario.name,
      probability: 1.0,
      stateVector: {
        timestamp: new Date(),
        confidence: 0.9,
        source: 'HYBRID_SIMULATION',
        properties: finalState,
      },
      metrics: { ...mcResult.metrics, ...sdResult.metrics },
    };
  }

  private generateInsights(
    outcomes: SimulationResult['outcomes'],
  ): string[] {
    const insights: string[] = [];

    if (outcomes.length > 1) {
      insights.push(`Analyzed ${outcomes.length} scenarios`);

      // Find highest/lowest variance properties
      const firstOutcome = outcomes[0];
      for (const key of Object.keys(firstOutcome.stateVector.properties)) {
        const values = outcomes.map(
          (o) => o.stateVector.properties[key] as number,
        ).filter((v) => typeof v === 'number');

        if (values.length > 1) {
          const variance = this.stdDev(values) / this.mean(values);
          if (variance > 0.2) {
            insights.push(`High scenario sensitivity for ${key} (CV: ${(variance * 100).toFixed(1)}%)`);
          }
        }
      }
    }

    return insights;
  }

  private generateRecommendations(
    twin: DigitalTwin,
    outcomes: SimulationResult['outcomes'],
  ): string[] {
    const recommendations: string[] = [];

    // Check for risk indicators
    for (const outcome of outcomes) {
      for (const [key, value] of Object.entries(outcome.metrics)) {
        if (key.endsWith('_p95') && typeof value === 'number') {
          const baseKey = key.replace('_p95', '');
          const mean = outcome.metrics[`${baseKey}_mean`];
          if (typeof mean === 'number' && value > mean * 1.5) {
            recommendations.push(`Consider hedging strategies for ${baseKey} tail risk`);
          }
        }
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('Twin state appears stable under simulated conditions');
    }

    return recommendations;
  }

  // Helper methods
  private normalRandom(): number {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  private mean(arr: number[]): number {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  private stdDev(arr: number[]): number {
    const m = this.mean(arr);
    return Math.sqrt(arr.reduce((sum, x) => sum + (x - m) ** 2, 0) / arr.length);
  }

  private percentile(arr: number[], p: number): number {
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }
}
