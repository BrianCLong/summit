import { CorrectnessScorecard, DomainName, ExceptionWaiver, newIdentifier } from './types';

export class GovernanceTracker {
  private scorecards = new Map<DomainName, CorrectnessScorecard>();
  private waivers: ExceptionWaiver[] = [];

  updateScorecard(domain: DomainName, driftRate: number, invariantViolations: number, mttrHours: number) {
    const card: CorrectnessScorecard = {
      domain,
      driftRate,
      invariantViolations,
      mttrHours,
      updatedAt: new Date(),
    };
    this.scorecards.set(domain, card);
    return card;
  }

  getScorecards(): CorrectnessScorecard[] {
    return Array.from(this.scorecards.values());
  }

  addWaiver(domain: DomainName, description: string, expiresAt: Date, owner: string) {
    const waiver: ExceptionWaiver = { id: newIdentifier(), domain, description, expiresAt, owner };
    this.waivers.push(waiver);
    return waiver;
  }

  activeWaivers() {
    const now = Date.now();
    return this.waivers.filter((waiver) => waiver.expiresAt.getTime() > now);
  }
}
