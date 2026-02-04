import { CandidateRecord, EvaluationProfile, EvaluationRecord } from './types';
import { Clock, defaultClock, sha256, stableStringify } from './utils';

export interface EvaluatorOptions {
  profile: EvaluationProfile;
  clock?: Clock;
  riskHeuristics?: (candidate: CandidateRecord) => string[];
  policyGate?: (candidate: CandidateRecord) => string[];
  reviewers?: Array<(candidate: CandidateRecord) => boolean>;
}

export interface CommandRunner {
  run: (command: string) => Promise<{
    exitCode: number;
    output: string;
    durationMs: number;
  }>;
}

export async function evaluateCandidate(
  candidate: CandidateRecord,
  runner: CommandRunner,
  options: EvaluatorOptions,
): Promise<EvaluationRecord> {
  const clock = options.clock ?? defaultClock;
  const start = clock().getTime();
  const policyViolations = options.policyGate?.(candidate) ?? [];
  const riskFlags = options.riskHeuristics?.(candidate) ?? [];
  const commandResults = [] as EvaluationRecord['commandResults'];

  for (const command of options.profile.commands) {
    const result = await runner.run(command);
    commandResults.push({
      command,
      exitCode: result.exitCode,
      durationMs: result.durationMs,
      output: result.output,
    });
  }
  for (const command of options.profile.targetedTests) {
    const result = await runner.run(command);
    commandResults.push({
      command,
      exitCode: result.exitCode,
      durationMs: result.durationMs,
      output: result.output,
    });
  }

  const passed =
    policyViolations.length === 0 &&
    commandResults.every((result) => result.exitCode === 0);
  const coverageDelta = candidate.metadata.testImpact * -0.1;
  const runtimeMs = clock().getTime() - start;
  const reviewConsensus = (options.reviewers ?? [])
    .map((reviewer) => reviewer(candidate))
    .every(Boolean);
  const score = computeScore({
    candidate,
    passed,
    coverageDelta,
    runtimeMs,
    policyViolations,
    riskFlags,
  });

  const deterministicReplay = sha256(
    stableStringify({
      candidateId: candidate.id,
      score,
      passed,
      policyViolations,
      riskFlags,
      commandResults,
    }),
  );

  return {
    id: sha256(`${candidate.id}:${score}`),
    score,
    passed: passed && reviewConsensus,
    runtimeMs,
    coverageDelta,
    policyViolations,
    riskFlags,
    commandResults,
    reviewConsensus,
    deterministicReplay,
  };
}

function computeScore(input: {
  candidate: CandidateRecord;
  passed: boolean;
  coverageDelta: number;
  runtimeMs: number;
  policyViolations: string[];
  riskFlags: string[];
}): number {
  const base = input.passed ? 100 : 25;
  const riskPenalty = input.candidate.metadata.risk * 2 + input.riskFlags.length * 5;
  const diffPenalty = input.candidate.metadata.diffSize * 0.5;
  const coveragePenalty = Math.abs(input.coverageDelta) * 2;
  const policyPenalty = input.policyViolations.length * 15;
  const runtimePenalty = input.runtimeMs / 1000;
  return Math.max(
    0,
    base - riskPenalty - diffPenalty - coveragePenalty - policyPenalty - runtimePenalty,
  );
}
