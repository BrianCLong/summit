// server/src/security/soc/store.ts

import { IncidentCandidate, Recommendation, Approval } from './models';

/**
 * A simple in-memory data store for the SOC Copilot service.
 */
export class SocStore {
  private incidentCandidates = new Map<string, IncidentCandidate>();
  private recommendations = new Map<string, Recommendation>();
  private approvals = new Map<string, Approval>();

  // IncidentCandidate methods
  public addIncidentCandidate(candidate: IncidentCandidate): void {
    this.incidentCandidates.set(candidate.id, candidate);
  }

  public getIncidentCandidate(id: string): IncidentCandidate | undefined {
    return this.incidentCandidates.get(id);
  }

  public listIncidentCandidates(): IncidentCandidate[] {
    return Array.from(this.incidentCandidates.values());
  }

  // Recommendation methods
  public addRecommendation(recommendation: Recommendation): void {
    this.recommendations.set(recommendation.id, recommendation);
  }

  public getRecommendation(id: string): Recommendation | undefined {
    return this.recommendations.get(id);
  }

  public listRecommendationsForIncident(incidentId: string): Recommendation[] {
    return Array.from(this.recommendations.values()).filter(
      (rec) => rec.incidentId === incidentId
    );
  }

  // Approval methods
  public addApproval(approval: Approval): void {
    this.approvals.set(approval.id, approval);
  }

  public getApproval(id: string): Approval | undefined {
    return this.approvals.get(id);
  }
}

export const socStore = new SocStore();
