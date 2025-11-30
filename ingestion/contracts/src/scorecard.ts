import { Scorecard } from './types.js';

export interface ScorecardInput {
  contractId: string;
  version: string;
  conformanceScores: number[];
  quarantinedEvents: number;
}

export class ScorecardEngine {
  build(input: ScorecardInput): Scorecard {
    const totalChecks = input.conformanceScores.length;
    const passedChecks = input.conformanceScores.filter((score) => score === 100).length;
    const average =
      totalChecks === 0
        ? 0
        : Math.round(
            input.conformanceScores.reduce((sum, next) => sum + next, 0) / totalChecks,
          );
    const grade = this.toGrade(average, input.quarantinedEvents);
    return {
      contractId: input.contractId,
      version: input.version,
      totalChecks,
      passedChecks,
      quarantinedEvents: input.quarantinedEvents,
      lastUpdated: new Date().toISOString(),
      grade,
    };
  }

  private toGrade(score: number, quarantinedEvents: number): Scorecard['grade'] {
    if (quarantinedEvents > 0 && score < 70) return 'D';
    if (quarantinedEvents > 2) return 'C';
    if (score >= 95) return 'A';
    if (score >= 85) return 'B';
    if (score >= 70) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  }
}
