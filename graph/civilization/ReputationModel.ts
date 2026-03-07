export class ReputationModel {
  scores: Record<string, number> = {};
  update(agentId: string, delta: number) {
    this.scores[agentId] = (this.scores[agentId] || 0) + delta;
  }
}
