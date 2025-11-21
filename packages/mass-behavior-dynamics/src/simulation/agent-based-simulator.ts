/**
 * Agent-Based Mass Behavior Simulator
 *
 * Large-scale simulation of heterogeneous agent populations
 */

import { PopulationState, Scenario, ExternalShock } from '../index.js';

export interface SimulationConfig {
  populationSize: number;
  timeSteps: number;
  dt: number;
  seed?: number;
}

export interface Agent {
  id: string;
  position: number[];
  beliefs: Map<string, number>;
  threshold: number;
  susceptibility: number;
  neighbors: string[];
  state: 'INACTIVE' | 'ACTIVE' | 'RECOVERED';
}

export interface SimulationState {
  t: number;
  agents: Agent[];
  activeCount: number;
  networkState: NetworkState;
  aggregateBeliefs: Map<string, Distribution>;
}

interface NetworkState {
  clusters: string[][];
  bridgeNodes: string[];
  averageDegree: number;
}

interface Distribution {
  mean: number;
  variance: number;
  min: number;
  max: number;
}

/**
 * Agent-Based Simulator
 */
export class AgentBasedSimulator {
  private config: SimulationConfig;
  private agents: Map<string, Agent>;
  private rng: () => number;

  constructor(config: SimulationConfig) {
    this.config = config;
    this.agents = new Map();
    this.rng = this.createRNG(config.seed);
  }

  private createRNG(seed?: number): () => number {
    if (!seed) return Math.random;

    // Simple seeded RNG (Mulberry32)
    let state = seed;
    return () => {
      state |= 0;
      state = (state + 0x6d2b79f5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Initialize simulation from population state
   */
  initialize(populationState: PopulationState): void {
    this.agents.clear();

    // Create agents based on population segments
    let agentId = 0;
    for (const segment of populationState.segments) {
      const segmentAgentCount = Math.round(
        (segment.size / populationState.totalPopulation) * this.config.populationSize
      );

      for (let i = 0; i < segmentAgentCount; i++) {
        const agent: Agent = {
          id: `agent_${agentId++}`,
          position: [this.rng(), this.rng()],
          beliefs: new Map(),
          threshold: this.sampleThreshold(segment.susceptibilityProfile),
          susceptibility: segment.susceptibilityProfile.disinformation,
          neighbors: [],
          state: 'INACTIVE',
        };

        // Initialize beliefs from segment psychographics
        agent.beliefs.set('trust_government', segment.psychographics.institutionalTrust.government);
        agent.beliefs.set('trust_media', segment.psychographics.institutionalTrust.media);

        this.agents.set(agent.id, agent);
      }
    }

    // Build network based on topology
    this.buildNetwork(populationState.networkTopology);
  }

  private sampleThreshold(profile: { disinformation: number }): number {
    // Higher susceptibility -> lower threshold
    const base = 1 - profile.disinformation;
    return Math.max(0.05, Math.min(0.95, base + (this.rng() - 0.5) * 0.2));
  }

  private buildNetwork(topology: PopulationState['networkTopology']): void {
    const agentList = Array.from(this.agents.values());
    const n = agentList.length;
    const targetDegree = topology.averageDegree;

    // Build small-world network (Watts-Strogatz inspired)
    const k = Math.floor(targetDegree);
    const rewiringProb = 0.1;

    // Initial ring lattice
    for (let i = 0; i < n; i++) {
      for (let j = 1; j <= k / 2; j++) {
        const neighbor1 = agentList[(i + j) % n];
        const neighbor2 = agentList[(i - j + n) % n];

        agentList[i].neighbors.push(neighbor1.id, neighbor2.id);
      }
    }

    // Rewiring
    for (const agent of agentList) {
      const newNeighbors: string[] = [];
      for (const neighborId of agent.neighbors) {
        if (this.rng() < rewiringProb) {
          // Rewire to random node
          const randomAgent = agentList[Math.floor(this.rng() * n)];
          if (randomAgent.id !== agent.id && !newNeighbors.includes(randomAgent.id)) {
            newNeighbors.push(randomAgent.id);
          } else {
            newNeighbors.push(neighborId);
          }
        } else {
          newNeighbors.push(neighborId);
        }
      }
      agent.neighbors = [...new Set(newNeighbors)];
    }
  }

  /**
   * Run simulation
   */
  run(scenario: Scenario, onStep?: (state: SimulationState) => void): SimulationResult {
    const trajectory: SimulationState[] = [];

    // Apply initial activations from scenario
    this.applyScenarioSeeds(scenario);

    for (let t = 0; t < this.config.timeSteps; t++) {
      // Apply external shocks
      const shocksAtT = scenario.events.filter(
        (e) => Math.abs(e.timing.getTime() - t) < 1
      );
      for (const shock of shocksAtT) {
        this.applyShock(shock);
      }

      // Simulate dynamics
      this.step(t);

      // Record state
      const state = this.getState(t);
      trajectory.push(state);

      if (onStep) onStep(state);
    }

    return {
      scenario,
      trajectory,
      finalState: trajectory[trajectory.length - 1],
      summary: this.summarize(trajectory),
    };
  }

  private applyScenarioSeeds(scenario: Scenario): void {
    // Activate initial seed agents
    const seedCount = Math.max(1, Math.floor(this.config.populationSize * 0.01));
    const agentList = Array.from(this.agents.values());

    for (let i = 0; i < seedCount; i++) {
      const idx = Math.floor(this.rng() * agentList.length);
      agentList[idx].state = 'ACTIVE';
    }
  }

  private applyShock(shock: ExternalShock): void {
    // Modify agent states based on shock
    for (const agent of this.agents.values()) {
      if (shock.affectedSegments.length === 0 || this.rng() < 0.5) {
        agent.susceptibility *= 1 + shock.magnitude * 0.1;
      }
    }
  }

  private step(t: number): void {
    const agentList = Array.from(this.agents.values());
    const activations: string[] = [];
    const recoveries: string[] = [];

    for (const agent of agentList) {
      if (agent.state === 'INACTIVE') {
        // Check for activation
        const activeNeighbors = agent.neighbors.filter(
          (nid) => this.agents.get(nid)?.state === 'ACTIVE'
        ).length;

        const activeFraction = agent.neighbors.length > 0
          ? activeNeighbors / agent.neighbors.length
          : 0;

        if (activeFraction >= agent.threshold) {
          activations.push(agent.id);
        }
      } else if (agent.state === 'ACTIVE') {
        // Random recovery
        if (this.rng() < 0.05) {
          recoveries.push(agent.id);
        }
      }
    }

    // Apply changes
    for (const id of activations) {
      this.agents.get(id)!.state = 'ACTIVE';
    }
    for (const id of recoveries) {
      this.agents.get(id)!.state = 'RECOVERED';
    }
  }

  private getState(t: number): SimulationState {
    const agents = Array.from(this.agents.values());
    const activeCount = agents.filter((a) => a.state === 'ACTIVE').length;

    return {
      t,
      agents: agents.map((a) => ({ ...a, beliefs: new Map(a.beliefs) })),
      activeCount,
      networkState: {
        clusters: [],
        bridgeNodes: [],
        averageDegree: agents.reduce((sum, a) => sum + a.neighbors.length, 0) / agents.length,
      },
      aggregateBeliefs: this.aggregateBeliefs(agents),
    };
  }

  private aggregateBeliefs(agents: Agent[]): Map<string, Distribution> {
    const result = new Map<string, Distribution>();
    const beliefKeys = new Set<string>();

    for (const agent of agents) {
      for (const key of agent.beliefs.keys()) {
        beliefKeys.add(key);
      }
    }

    for (const key of beliefKeys) {
      const values = agents.map((a) => a.beliefs.get(key) || 0);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;

      result.set(key, {
        mean,
        variance,
        min: Math.min(...values),
        max: Math.max(...values),
      });
    }

    return result;
  }

  private summarize(trajectory: SimulationState[]): SimulationSummary {
    const peakActive = Math.max(...trajectory.map((s) => s.activeCount));
    const finalActive = trajectory[trajectory.length - 1].activeCount;
    const totalActivated = new Set(
      trajectory.flatMap((s) =>
        s.agents.filter((a) => a.state !== 'INACTIVE').map((a) => a.id)
      )
    ).size;

    return {
      peakActive,
      finalActive,
      totalActivated,
      activationRate: totalActivated / this.config.populationSize,
      cascadeOccurred: peakActive > this.config.populationSize * 0.1,
    };
  }
}

export interface SimulationResult {
  scenario: Scenario;
  trajectory: SimulationState[];
  finalState: SimulationState;
  summary: SimulationSummary;
}

interface SimulationSummary {
  peakActive: number;
  finalActive: number;
  totalActivated: number;
  activationRate: number;
  cascadeOccurred: boolean;
}
