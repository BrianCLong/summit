import type { Ticket, Commitment } from '../schema/nodes.js';

export interface SimulationConfig { iterations: number; horizonDays: number; velocityMean: number; velocityStdDev: number; riskFactor: number; }
export interface SimulationResult { commitmentId: string; deliveryProbability: number; expectedDeliveryDate: Date; p50DeliveryDate: Date; p90DeliveryDate: Date; riskFactors: string[]; recommendations: string[]; }
export interface PortfolioOutcome { totalCommitments: number; onTrackCount: number; atRiskCount: number; likelyMissCount: number; results: SimulationResult[]; overallConfidence: number; }
export interface GraphStore { getNode<T>(id: string): Promise<T | null>; getNodes<T>(filter?: Partial<T>): Promise<T[]>; getEdges(filter?: { sourceId?: string; targetId?: string; type?: string }): Promise<Array<{ sourceId: string; targetId: string }>>; }

export class PortfolioSimulator {
  private config: SimulationConfig;

  constructor(private graphStore: GraphStore, config: Partial<SimulationConfig> = {}) {
    this.config = { iterations: 1000, horizonDays: 90, velocityMean: 10, velocityStdDev: 3, riskFactor: 0.15, ...config };
  }

  async simulateCommitment(commitmentId: string): Promise<SimulationResult> {
    const commitment = await this.graphStore.getNode<Commitment>(commitmentId);
    if (!commitment) throw new Error('Commitment not found');
    const edges = await this.graphStore.getEdges({ targetId: commitmentId, type: 'drives' });
    const tickets = await Promise.all(edges.map(e => this.graphStore.getNode<Ticket>(e.sourceId)));
    const valid = tickets.filter((t): t is Ticket => t !== null);
    const remaining = valid.filter(t => t.status !== 'done');
    const points = remaining.reduce((s, t) => s + (t.estimate || 3), 0);

    const dates: number[] = [];
    for (let i = 0; i < this.config.iterations; i++) {
      const vel = this.sampleVelocity();
      const sprints = Math.ceil(points / vel);
      const days = sprints * 14;
      const risk = Math.random() < this.config.riskFactor ? Math.random() * 14 : 0;
      dates.push(Date.now() + (days + risk) * 24 * 60 * 60 * 1000);
    }
    dates.sort((a, b) => a - b);

    const onTime = dates.filter(d => d <= commitment.dueDate.getTime()).length;
    const prob = onTime / dates.length;
    const risks: string[] = [];
    const recs: string[] = [];
    if (points > 30) risks.push('High remaining work');
    if (remaining.some(t => t.status === 'blocked')) risks.push('Blocked tickets');
    if (prob < 0.5) risks.push('Low probability');
    if (prob < 0.8) { recs.push('Reduce scope'); recs.push('Add capacity'); }

    return {
      commitmentId, deliveryProbability: prob,
      expectedDeliveryDate: new Date(dates.reduce((a, b) => a + b, 0) / dates.length),
      p50DeliveryDate: new Date(dates[Math.floor(dates.length * 0.5)]),
      p90DeliveryDate: new Date(dates[Math.floor(dates.length * 0.9)]),
      riskFactors: risks, recommendations: recs,
    };
  }

  async simulatePortfolio(): Promise<PortfolioOutcome> {
    const commitments = await this.graphStore.getNodes<Commitment>({ type: 'commitment', status: 'active' } as Partial<Commitment>);
    const results: SimulationResult[] = [];
    let onTrack = 0, atRisk = 0, miss = 0;
    for (const c of commitments) {
      const r = await this.simulateCommitment(c.id);
      results.push(r);
      if (r.deliveryProbability >= 0.8) onTrack++;
      else if (r.deliveryProbability >= 0.5) atRisk++;
      else miss++;
    }
    const overall = commitments.length > 0 ? results.reduce((s, r) => s + r.deliveryProbability, 0) / commitments.length * 100 : 100;
    return { totalCommitments: commitments.length, onTrackCount: onTrack, atRiskCount: atRisk, likelyMissCount: miss, results, overallConfidence: overall };
  }

  private sampleVelocity(): number {
    const u1 = Math.random(), u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return Math.max(1, this.config.velocityMean + z * this.config.velocityStdDev);
  }
}
