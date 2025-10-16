export interface Challenge {
  challenger: string;
  hypothesis: string;
  mutation: { envVar?: string; flag?: string; dependency?: string };
  expectedOutcome: 'pass' | 'fail';
}

export interface ChallengeOutcome {
  challenge: Challenge;
  passed: boolean;
  evidence: string;
}

export interface ChallengeSummary {
  outcomes: ChallengeOutcome[];
  confidence: number;
}

export function runCausalChallenge(
  challenges: Challenge[],
  evaluator: (challenge: Challenge) => boolean,
): ChallengeSummary {
  const outcomes: ChallengeOutcome[] = challenges.map((challenge) => {
    const passed = evaluator(challenge);
    return {
      challenge,
      passed,
      evidence: passed
        ? 'Challenge passed: failure reproduced'
        : 'Challenge failed: triggered repair',
    };
  });
  const success = outcomes.filter((o) => o.passed).length;
  const confidence = Math.min(1, success / Math.max(1, challenges.length));
  return { outcomes, confidence };
}
