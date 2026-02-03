/**
 * Summit Work Graph - Portfolio Simulator
 */

import type { Ticket, Commitment } from '../schema/nodes.js';

export interface SimulationConfig {
  iterations: number;
  horizonDays: number;
  velocityMean: number;
  velocityStdDev: number;
  riskFactor: number;
}

export interface SimulationResult {
  commitmentId: string;
  deliveryProbability: number;
  expectedDeliveryDate: Date;
  p50DeliveryDate: Date;
  p90DeliveryDate: Date;
  riskFactors: string[];
  recommendations: string[];
}

export interface PortfolioOutcome {
  totalCommitments: number;
  onTrackCount: number;
  atRiskCount: number;
  likelyMissCount: number;
  results: SimulationResult[];
  overallConfidence: number;
}

export interface GraphStore {
  getNode<T>(id: string): Promise<T | null>;
  getNodes<T>(filter?: Partial<T>): Promise<T[]>;
  getEdges(filter?: { sourceId?: string; targetId?: string; type?: string }): Promise<Array<{ sourceId: string; targetId: string }>>;
}

const DEFAULT_CONFIG: SimulationConfig = {
  iterations: 1000,
  horizonDays: 90,
  velocityMean: 10,
  velocityStdDev: 3,
  riskFactor: 0.15,
};

export class PortfolioSimulator {
  private config: SimulationConfig;
  private graphStore: GraphStore;

  constructor(graphStore: GraphStore, config: Partial<SimulationConfig> = {}) {
    this.graphStore = graphStore;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async simulateCommitment(commitmentId: string): Promise<SimulationResult> {
    const commitment = await this.graphStore.getNode<Commitment>(commitmentId);
    if (!commitment) throw new Error('Commitment not found');

    // Get linked tickets
    const edges = await this.graphStore.getEdges({ targetId: commitmentId, type: 'drives' });
    const ticketIds = edges.map(e => e.sourceId);
    const tickets = await Promise.all(ticketIds.map(id => this.graphStore.getNode<Ticket>(id)));
    const validTickets = tickets.filter((t): t is Ticket => t !== null);

    // Calculate remaining work
    const remainingTickets = validTickets.filter(t => t.status !== 'done');
    const remainingPoints = remainingTickets.reduce((sum, t) => sum + (t.estimate || 3), 0);

    // Monte Carlo simulation
    const deliveryDates: number[] = [];

    for (let i = 0; i < this.config.iterations; i++) {
      const velocity = this.sampleVelocity();
      const sprintsNeeded = Math.ceil(remainingPoints / velocity);
      const daysNeeded = sprintsNeeded * 14; // 2-week sprints

      // Add risk factor
      const riskDays = Math.random() < this.config.riskFactor ? Math.random() * 14 : 0;

      const deliveryDate = Date.now() + (daysNeeded + riskDays) * 24 * 60 * 60 * 1000;
      deliveryDates.push(deliveryDate);
    }

    // Calculate statistics
    deliveryDates.sort((a, b) => a - b);
    const p50Index = Math.floor(deliveryDates.length * 0.5);
    const p90Index = Math.floor(deliveryDates.length * 0.9);

    const onTimeCount = deliveryDates.filter(d => d <= commitment.dueDate.getTime()).length;
    const deliveryProbability = onTimeCount / deliveryDates.length;

    // Identify risk factors
    const riskFactors: string[] = [];
    if (remainingPoints > 30) riskFactors.push('High remaining work volume');
    if (remainingTickets.some(t => t.status === 'blocked')) riskFactors.push('Blocked tickets in path');
    if (deliveryProbability < 0.5) riskFactors.push('Low delivery probability');

    // Generate recommendations
    const recommendations: string[] = [];
    if (deliveryProbability < 0.8) {
      recommendations.push('Consider reducing scope');
      recommendations.push('Add capacity or extend deadline');
    }
    if (remainingTickets.some(t => t.agentEligible && !t.assignee)) {
      recommendations.push('Assign agent-eligible tickets to agents');
    }

    return {
      commitmentId,
      deliveryProbability,
      expectedDeliveryDate: new Date(deliveryDates.reduce((a, b) => a + b, 0) / deliveryDates.length),
      p50DeliveryDate: new Date(deliveryDates[p50Index]),
      p90DeliveryDate: new Date(deliveryDates[p90Index]),
      riskFactors,
      recommendations,
    };
  }

  async simulatePortfolio(): Promise<PortfolioOutcome> {
    const commitments = await this.graphStore.getNodes<Commitment>({ type: 'commitment', status: 'active' } as Partial<Commitment>);

    const results: SimulationResult[] = [];
    let onTrackCount = 0;
    let atRiskCount = 0;
    let likelyMissCount = 0;

    for (const commitment of commitments) {
      const result = await this.simulateCommitment(commitment.id);
      results.push(result);

      if (result.deliveryProbability >= 0.8) {
        onTrackCount++;
      } else if (result.deliveryProbability >= 0.5) {
        atRiskCount++;
      } else {
        likelyMissCount++;
      }
    }

    const overallConfidence = commitments.length > 0
      ? results.reduce((sum, r) => sum + r.deliveryProbability, 0) / commitments.length * 100
      : 100;

    return {
      totalCommitments: commitments.length,
      onTrackCount,
      atRiskCount,
      likelyMissCount,
      results,
      overallConfidence,
    };
  }

  async whatIfAnalysis(scenario: { addCapacity?: number; reduceScope?: string[]; extendDeadline?: number }): Promise<PortfolioOutcome> {
    // Clone current config
    const originalConfig = { ...this.config };

    // Apply scenario adjustments
    if (scenario.addCapacity) {
      this.config.velocityMean += scenario.addCapacity;
    }

    // Run simulation with modified parameters
    const result = await this.simulatePortfolio();

    // Restore original config
    this.config = originalConfig;

    return result;
  }

  private sampleVelocity(): number {
    // Box-Muller transform for normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return Math.max(1, this.config.velocityMean + z * this.config.velocityStdDev);
  }
}
