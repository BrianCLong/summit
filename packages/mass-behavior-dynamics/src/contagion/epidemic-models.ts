/**
 * Epidemic-Inspired Information Contagion Models
 *
 * Adapts SIR/SEIR/SEIRS models for information spreading
 */

export interface CompartmentState {
  susceptible: number;
  exposed: number;
  infected: number;
  recovered: number;
  resistant: number;
}

export interface EpidemicParameters {
  beta: number; // Transmission rate
  sigma: number; // Incubation rate (E -> I)
  gamma: number; // Recovery rate
  delta: number; // Immunity waning rate
  mu: number; // Natural immunity rate
}

/**
 * SEIRS Model for Information Spreading
 *
 * Compartments:
 * - Susceptible: Haven't encountered the narrative
 * - Exposed: Encountered but not yet "infected" (sharing)
 * - Infected: Actively spreading the narrative
 * - Recovered: No longer spreading, temporary immunity
 * - (loops back to Susceptible with immunity waning)
 */
export class SEIRSInformationModel {
  private state: CompartmentState;
  private params: EpidemicParameters;

  constructor(initialState: CompartmentState, params: EpidemicParameters) {
    this.state = { ...initialState };
    this.params = params;
  }

  /**
   * Simulate one time step
   */
  step(dt: number = 1): CompartmentState {
    const { susceptible, exposed, infected, recovered } = this.state;
    const { beta, sigma, gamma, delta } = this.params;
    const N = susceptible + exposed + infected + recovered;

    // Differential equations
    const dS = -beta * susceptible * infected / N + delta * recovered;
    const dE = beta * susceptible * infected / N - sigma * exposed;
    const dI = sigma * exposed - gamma * infected;
    const dR = gamma * infected - delta * recovered;

    // Update state
    this.state = {
      susceptible: Math.max(0, susceptible + dS * dt),
      exposed: Math.max(0, exposed + dE * dt),
      infected: Math.max(0, infected + dI * dt),
      recovered: Math.max(0, recovered + dR * dt),
      resistant: this.state.resistant,
    };

    return { ...this.state };
  }

  /**
   * Calculate basic reproduction number R0
   */
  calculateR0(): number {
    return this.params.beta / this.params.gamma;
  }

  /**
   * Calculate effective reproduction number Rt
   */
  calculateRt(): number {
    const N = Object.values(this.state).reduce((a, b) => a + b, 0);
    const susceptibleFraction = this.state.susceptible / N;
    return this.calculateR0() * susceptibleFraction;
  }

  /**
   * Run simulation for specified time
   */
  simulate(duration: number, dt: number = 0.1): CompartmentState[] {
    const trajectory: CompartmentState[] = [{ ...this.state }];
    const steps = Math.ceil(duration / dt);

    for (let i = 0; i < steps; i++) {
      trajectory.push(this.step(dt));
    }

    return trajectory;
  }
}

/**
 * Network-Based Contagion Model
 *
 * Extends epidemic model to account for network structure
 */
export class NetworkContagionModel {
  private network: Map<string, string[]>;
  private nodeStates: Map<string, NodeState>;
  private params: NetworkContagionParams;

  constructor(
    network: Map<string, string[]>,
    params: NetworkContagionParams
  ) {
    this.network = network;
    this.params = params;
    this.nodeStates = new Map();

    // Initialize all nodes as susceptible
    for (const node of network.keys()) {
      this.nodeStates.set(node, {
        state: 'S',
        exposureCount: 0,
        infectionTime: null,
      });
    }
  }

  /**
   * Seed initial infected nodes
   */
  seed(nodes: string[]): void {
    for (const node of nodes) {
      const state = this.nodeStates.get(node);
      if (state) {
        state.state = 'I';
        state.infectionTime = 0;
      }
    }
  }

  /**
   * Run one time step
   */
  step(t: number): StepResult {
    const newInfections: string[] = [];
    const recoveries: string[] = [];

    // Process each node
    for (const [node, state] of this.nodeStates.entries()) {
      if (state.state === 'S') {
        // Check for infection
        const neighbors = this.network.get(node) || [];
        const infectedNeighbors = neighbors.filter(
          (n) => this.nodeStates.get(n)?.state === 'I'
        ).length;

        if (this.params.contagionType === 'SIMPLE') {
          // Simple contagion: each exposure has independent probability
          const infectionProb = 1 - Math.pow(1 - this.params.beta, infectedNeighbors);
          if (Math.random() < infectionProb) {
            newInfections.push(node);
          }
        } else {
          // Complex contagion: requires threshold of exposures
          state.exposureCount = infectedNeighbors;
          const threshold = this.params.threshold || 0.25;
          if (infectedNeighbors / neighbors.length >= threshold) {
            newInfections.push(node);
          }
        }
      } else if (state.state === 'I') {
        // Check for recovery
        if (state.infectionTime !== null && t - state.infectionTime > 1 / this.params.gamma) {
          recoveries.push(node);
        }
      }
    }

    // Apply state changes
    for (const node of newInfections) {
      const state = this.nodeStates.get(node)!;
      state.state = 'I';
      state.infectionTime = t;
    }

    for (const node of recoveries) {
      const state = this.nodeStates.get(node)!;
      state.state = 'R';
    }

    return {
      t,
      newInfections: newInfections.length,
      totalInfected: this.countByState('I'),
      totalRecovered: this.countByState('R'),
    };
  }

  private countByState(state: 'S' | 'E' | 'I' | 'R'): number {
    let count = 0;
    for (const ns of this.nodeStates.values()) {
      if (ns.state === state) count++;
    }
    return count;
  }
}

interface NodeState {
  state: 'S' | 'E' | 'I' | 'R';
  exposureCount: number;
  infectionTime: number | null;
}

interface NetworkContagionParams {
  beta: number;
  gamma: number;
  contagionType: 'SIMPLE' | 'COMPLEX';
  threshold?: number;
}

interface StepResult {
  t: number;
  newInfections: number;
  totalInfected: number;
  totalRecovered: number;
}
