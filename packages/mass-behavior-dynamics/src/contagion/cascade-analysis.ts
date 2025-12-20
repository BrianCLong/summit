/**
 * Information Cascade Analysis
 *
 * Models Bayesian information cascades where agents learn from others
 */

export interface CascadeState {
  history: Decision[];
  currentProbability: number;
  cascadeFormed: boolean;
  cascadeDirection?: 'ADOPT' | 'REJECT';
}

export interface Decision {
  agent: number;
  action: 'ADOPT' | 'REJECT';
  privateSignal: boolean;
  basedOn: 'SIGNAL' | 'CASCADE';
}

/**
 * Simulate Bayesian information cascade
 *
 * Agents receive private signals and observe predecessors' actions.
 * Eventually, public information overwhelms private signals -> cascade.
 */
export class InformationCascadeSimulator {
  private trueState: boolean;
  private signalAccuracy: number;
  private priorProbability: number;

  constructor(config: CascadeConfig) {
    this.trueState = config.trueState;
    this.signalAccuracy = config.signalAccuracy;
    this.priorProbability = config.priorProbability || 0.5;
  }

  /**
   * Generate private signal for agent
   */
  private generateSignal(): boolean {
    if (Math.random() < this.signalAccuracy) {
      return this.trueState;
    }
    return !this.trueState;
  }

  /**
   * Calculate posterior probability given history
   */
  private calculatePosterior(history: Decision[]): number {
    let logOdds = Math.log(this.priorProbability / (1 - this.priorProbability));

    for (const decision of history) {
      if (decision.action === 'ADOPT') {
        logOdds += Math.log(this.signalAccuracy / (1 - this.signalAccuracy));
      } else {
        logOdds -= Math.log(this.signalAccuracy / (1 - this.signalAccuracy));
      }
    }

    return 1 / (1 + Math.exp(-logOdds));
  }

  /**
   * Determine if cascade has formed
   */
  private checkCascade(posterior: number): { formed: boolean; direction?: 'ADOPT' | 'REJECT' } {
    const cascadeThreshold = this.signalAccuracy;

    if (posterior > cascadeThreshold) {
      return { formed: true, direction: 'ADOPT' };
    }
    if (posterior < 1 - cascadeThreshold) {
      return { formed: true, direction: 'REJECT' };
    }
    return { formed: false };
  }

  /**
   * Simulate one agent's decision
   */
  simulateAgent(state: CascadeState): Decision {
    const signal = this.generateSignal();
    const posterior = this.calculatePosterior(state.history);
    const { formed, direction } = this.checkCascade(posterior);

    let action: 'ADOPT' | 'REJECT';
    let basedOn: 'SIGNAL' | 'CASCADE';

    if (formed && direction) {
      // Follow cascade, ignore private signal
      action = direction;
      basedOn = 'CASCADE';
    } else {
      // Follow private signal
      action = signal ? 'ADOPT' : 'REJECT';
      basedOn = 'SIGNAL';
    }

    return {
      agent: state.history.length,
      action,
      privateSignal: signal,
      basedOn,
    };
  }

  /**
   * Run full cascade simulation
   */
  simulate(numAgents: number): CascadeSimulationResult {
    const state: CascadeState = {
      history: [],
      currentProbability: this.priorProbability,
      cascadeFormed: false,
    };

    let cascadeStartAgent: number | null = null;

    for (let i = 0; i < numAgents; i++) {
      const decision = this.simulateAgent(state);
      state.history.push(decision);
      state.currentProbability = this.calculatePosterior(state.history);

      const { formed, direction } = this.checkCascade(state.currentProbability);
      if (formed && !state.cascadeFormed) {
        state.cascadeFormed = true;
        state.cascadeDirection = direction;
        cascadeStartAgent = i;
      }
    }

    // Calculate accuracy
    const correctDecisions = state.history.filter(
      (d) => (d.action === 'ADOPT') === this.trueState
    ).length;

    return {
      finalState: state,
      cascadeFormed: state.cascadeFormed,
      cascadeDirection: state.cascadeDirection,
      cascadeStartAgent,
      cascadeCorrect: state.cascadeDirection === 'ADOPT' ? this.trueState : !this.trueState,
      decisionAccuracy: correctDecisions / numAgents,
      history: state.history,
    };
  }

  /**
   * Analyze cascade fragility
   *
   * How easily can cascade be broken by contrarian signal?
   */
  analyzeCascadeFragility(state: CascadeState): FragilityAnalysis {
    if (!state.cascadeFormed) {
      return { fragile: false, reason: 'NO_CASCADE' };
    }

    const posterior = state.currentProbability;
    const cascadeThreshold = this.signalAccuracy;
    const margin = state.cascadeDirection === 'ADOPT'
      ? posterior - cascadeThreshold
      : (1 - cascadeThreshold) - posterior;

    // Number of contrary signals needed to break cascade
    const signalStrength = Math.log(this.signalAccuracy / (1 - this.signalAccuracy));
    const contrariansNeeded = Math.ceil(margin / signalStrength);

    return {
      fragile: contrariansNeeded <= 2,
      contrariansNeeded,
      margin,
      reason: contrariansNeeded <= 2 ? 'NEAR_THRESHOLD' : 'STABLE_CASCADE',
    };
  }
}

interface CascadeConfig {
  trueState: boolean;
  signalAccuracy: number;
  priorProbability?: number;
}

interface CascadeSimulationResult {
  finalState: CascadeState;
  cascadeFormed: boolean;
  cascadeDirection?: 'ADOPT' | 'REJECT';
  cascadeStartAgent: number | null;
  cascadeCorrect: boolean;
  decisionAccuracy: number;
  history: Decision[];
}

interface FragilityAnalysis {
  fragile: boolean;
  contrariansNeeded?: number;
  margin?: number;
  reason: string;
}
