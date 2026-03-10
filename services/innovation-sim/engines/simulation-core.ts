/**
 * Quarterly Simulation Core
 *
 * Tick-based evolution engine with Monte Carlo support.
 */

import type { InnovationGraph } from "../interfaces/innovation-graph.js";
import type { ScenarioBranch, Shock, Intervention } from "../interfaces/scenario.js";
import { applyShock, applyIntervention } from "../interfaces/scenario.js";
import { evaluateBassDiffusion } from "../interfaces/diffusion.js";

export interface SimulationConfig {
  tickDurationDays: number;    // Days per simulation tick (default: 90 = quarterly)
  totalTicks: number;          // Number of ticks to simulate
  randomSeed?: number;         // For reproducible Monte Carlo
  monteCarloRuns?: number;     // Number of MC iterations (1 = deterministic)
}

export const DEFAULT_SIMULATION_CONFIG: SimulationConfig = {
  tickDurationDays: 90,
  totalTicks: 4,              // 1 year = 4 quarters
  monteCarloRuns: 1
};

export interface SimulationState {
  tick: number;
  timestamp: string;
  graph: InnovationGraph;
  nodeStates: Map<string, {
    adoptionRate: number;
    diffusionRate: number;
    lockInStrength: number;
    momentum: number;
  }>;
  events: Array<{
    type: "shock" | "intervention" | "adoption" | "replacement";
    description: string;
    impactedNodes: string[];
    timestamp: string;
  }>;
}

export interface SimulationResult {
  scenarioId: string;
  config: SimulationConfig;
  states: SimulationState[];
  finalMetrics: {
    avgAdoption: number;
    avgLockIn: number;
    avgMomentum: number;
    totalEvents: number;
  };
  timeline: Array<{
    tick: number;
    timestamp: string;
    adoptionRate: number;
    eventCount: number;
  }>;
}

export class SimulationCore {
  private config: SimulationConfig;

  constructor(config: Partial<SimulationConfig> = {}) {
    this.config = { ...DEFAULT_SIMULATION_CONFIG, ...config };
  }

  /**
   * Run deterministic simulation
   */
  simulate(
    initialGraph: InnovationGraph,
    scenario: ScenarioBranch
  ): SimulationResult {
    const states: SimulationState[] = [];

    let currentState = this.initializeState(initialGraph);
    states.push(JSON.parse(JSON.stringify(currentState)));

    for (let tick = 1; tick <= this.config.totalTicks; tick++) {
      currentState = this.advanceTick(currentState, scenario, tick);
      states.push(JSON.parse(JSON.stringify(currentState)));
    }

    const finalMetrics = this.calculateFinalMetrics(states);
    const timeline = this.extractTimeline(states);

    return {
      scenarioId: scenario.id,
      config: this.config,
      states,
      finalMetrics,
      timeline
    };
  }

  /**
   * Run Monte Carlo simulation
   */
  simulateMonteCarlo(
    initialGraph: InnovationGraph,
    scenario: ScenarioBranch
  ): Array<SimulationResult> {
    const results: SimulationResult[] = [];

    for (let run = 0; run < (this.config.monteCarloRuns || 1); run++) {
      const result = this.simulate(initialGraph, scenario);
      results.push(result);
    }

    return results;
  }

  /**
   * Initialize simulation state
   */
  private initializeState(graph: InnovationGraph): SimulationState {
    const nodeStates = new Map();

    for (const node of graph.nodes) {
      nodeStates.set(node.id, {
        adoptionRate: node.attrs.adoptionRate || 0.1,
        diffusionRate: 0.03,
        lockInStrength: 0.0,
        momentum: 0.0
      });
    }

    return {
      tick: 0,
      timestamp: new Date().toISOString(),
      graph: JSON.parse(JSON.stringify(graph)),
      nodeStates,
      events: []
    };
  }

  /**
   * Advance simulation by one tick
   */
  private advanceTick(
    state: SimulationState,
    scenario: ScenarioBranch,
    tick: number
  ): SimulationState {
    const newState: SimulationState = {
      tick,
      timestamp: new Date(Date.now() + tick * this.config.tickDurationDays * 24 * 60 * 60 * 1000).toISOString(),
      graph: JSON.parse(JSON.stringify(state.graph)),
      nodeStates: new Map(state.nodeStates),
      events: []
    };

    // Apply shocks that occur at this tick
    for (const shock of scenario.shocks) {
      if (this.shouldApplyShock(shock, tick)) {
        this.applyShockToState(newState, shock);
        newState.events.push({
          type: "shock",
          description: shock.description,
          impactedNodes: shock.impactedNodes,
          timestamp: newState.timestamp
        });
      }
    }

    // Apply interventions
    for (const intervention of scenario.interventions) {
      if (this.shouldApplyIntervention(intervention, tick)) {
        this.applyInterventionToState(newState, intervention);
        newState.events.push({
          type: "intervention",
          description: intervention.description,
          impactedNodes: intervention.targetNodes,
          timestamp: newState.timestamp
        });
      }
    }

    // Evolve node states (adoption diffusion)
    for (const [nodeId, nodeState] of newState.nodeStates.entries()) {
      const t = tick * this.config.tickDurationDays;

      // Bass diffusion evolution
      const newAdoption = evaluateBassDiffusion(t, { p: 0.03, q: 0.38, m: 1.0 });

      // Update state
      nodeState.adoptionRate = Math.max(nodeState.adoptionRate, newAdoption);
      nodeState.momentum = newAdoption - nodeState.adoptionRate;

      // Lock-in grows with adoption
      nodeState.lockInStrength = Math.min(1.0, nodeState.adoptionRate * 0.5);
    }

    return newState;
  }

  /**
   * Check if shock should be applied at this tick
   */
  private shouldApplyShock(shock: Shock, tick: number): boolean {
    // Simplified: apply at tick 1 (first quarter) or based on probability
    if (tick === 1) {
      return Math.random() < shock.probability;
    }
    return false;
  }

  /**
   * Check if intervention should be applied at this tick
   */
  private shouldApplyIntervention(intervention: Intervention, tick: number): boolean {
    // Apply at tick 0 (beginning)
    return tick === 1;
  }

  /**
   * Apply shock to simulation state
   */
  private applyShockToState(state: SimulationState, shock: Shock): void {
    for (const nodeId of shock.impactedNodes) {
      const nodeState = state.nodeStates.get(nodeId);
      if (nodeState) {
        if (shock.effects.adoptionDelta !== undefined) {
          nodeState.adoptionRate = Math.max(0, Math.min(1,
            nodeState.adoptionRate + shock.effects.adoptionDelta * shock.magnitude
          ));
        }

        if (shock.effects.lockInDelta !== undefined) {
          nodeState.lockInStrength = Math.max(0, Math.min(1,
            nodeState.lockInStrength + shock.effects.lockInDelta * shock.magnitude
          ));
        }
      }
    }
  }

  /**
   * Apply intervention to simulation state
   */
  private applyInterventionToState(state: SimulationState, intervention: Intervention): void {
    if (intervention.actions.increaseAdoption) {
      for (const action of intervention.actions.increaseAdoption) {
        const nodeState = state.nodeStates.get(action.node);
        if (nodeState) {
          nodeState.adoptionRate = Math.max(0, Math.min(1,
            nodeState.adoptionRate + action.amount
          ));
        }
      }
    }

    if (intervention.actions.accelerateDiffusion) {
      for (const action of intervention.actions.accelerateDiffusion) {
        const nodeState = state.nodeStates.get(action.node);
        if (nodeState) {
          nodeState.diffusionRate *= action.multiplier;
        }
      }
    }
  }

  /**
   * Calculate final metrics
   */
  private calculateFinalMetrics(states: SimulationState[]): any {
    const finalState = states[states.length - 1];

    let sumAdoption = 0;
    let sumLockIn = 0;
    let sumMomentum = 0;
    let count = 0;

    for (const [_, nodeState] of finalState.nodeStates.entries()) {
      sumAdoption += nodeState.adoptionRate;
      sumLockIn += nodeState.lockInStrength;
      sumMomentum += nodeState.momentum;
      count++;
    }

    const totalEvents = states.reduce((sum, s) => sum + s.events.length, 0);

    return {
      avgAdoption: count > 0 ? sumAdoption / count : 0,
      avgLockIn: count > 0 ? sumLockIn / count : 0,
      avgMomentum: count > 0 ? sumMomentum / count : 0,
      totalEvents
    };
  }

  /**
   * Extract timeline
   */
  private extractTimeline(states: SimulationState[]): any[] {
    return states.map(state => {
      let sumAdoption = 0;
      let count = 0;

      for (const [_, nodeState] of state.nodeStates.entries()) {
        sumAdoption += nodeState.adoptionRate;
        count++;
      }

      return {
        tick: state.tick,
        timestamp: state.timestamp,
        adoptionRate: count > 0 ? sumAdoption / count : 0,
        eventCount: state.events.length
      };
    });
  }
}
