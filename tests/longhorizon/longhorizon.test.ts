import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { MapElitesArchive } from '../../src/longhorizon/map-elites';
import { evaluateCandidate } from '../../src/longhorizon/evaluator';
import { CandidateRecord } from '../../src/longhorizon/types';
import { LongHorizonRunner } from '../../src/longhorizon/run';

function buildCandidate(id: string, score = 50): CandidateRecord {
  return {
    id,
    title: `Candidate ${id}`,
    patch: { id: `patch-${id}`, diff: '+++ b/docs/readme.md', filesTouched: ['docs/readme.md'] },
    metadata: { diffSize: 10, risk: 2, testImpact: 1, locality: 'docs' },
    status: 'evaluated',
    noveltyScore: 1,
    evaluation: {
      id: `eval-${id}`,
      score,
      passed: true,
      runtimeMs: 5,
      coverageDelta: 0,
      policyViolations: [],
      riskFlags: [],
      commandResults: [],
      reviewConsensus: true,
      deterministicReplay: `replay-${id}`,
    },
  };
}

describe('MapElitesArchive', () => {
  it('keeps the best candidate per cell', () => {
    const archive = new MapElitesArchive({
      riskBins: [3, 7, 12],
      diffSizeBins: [20, 80, 200],
      testImpactBins: [1, 3, 6],
    });

    const low = buildCandidate('low', 40);
    const high = buildCandidate('high', 90);

    archive.insert(low);
    archive.insert(high);

    const cell = archive.getCell(archive.cellKey(low));
    expect(cell?.id).toBe('high');
  });
});

describe('LongHorizonRunner', () => {
  it('checkpoints and resumes', async () => {
    const baseDir = mkdtempSync(path.join(tmpdir(), 'longhorizon-'));
    const config = {
      runId: 'run-1',
      tenantId: 'tenant-1',
      taskPrompt: 'Add a feature flag and docs',
      allowedPaths: ['docs/'],
      steps: [
        { id: 'step-1', title: 'Plan', dependsOn: [], role: 'planner' },
      ],
      budgets: { maxTokens: 1000, maxSeconds: 600, maxToolCalls: 10 },
      evaluationProfile: { name: 'fast', commands: [], targetedTests: [] },
      islands: 2,
      migrationInterval: 1,
      candidateSeeds: [
        {
          id: 'seed-1',
          title: 'Doc flag',
          patch: '+++ b/docs/readme.md\n+flag: true',
          metadata: { diffSize: 5, risk: 1, testImpact: 1, locality: 'docs' },
        },
      ],
    };

    const runner = new LongHorizonRunner(config, {
      evaluationProfile: config.evaluationProfile,
      baseArtifactsDir: path.join(baseDir, 'artifacts'),
      checkpointDir: path.join(baseDir, 'checkpoints'),
    });

    const checkpointPath = await runner.checkpoint();
    const resumed = await LongHorizonRunner.resume(checkpointPath, config, {
      evaluationProfile: config.evaluationProfile,
      baseArtifactsDir: path.join(baseDir, 'artifacts'),
      checkpointDir: path.join(baseDir, 'checkpoints'),
    });

    await expect(resumed.run()).resolves.toContain('artifacts');
  });
});

describe('evaluateCandidate', () => {
  it('is deterministic for identical inputs', async () => {
    const candidate = buildCandidate('deterministic', 0);
    const runner = { run: async () => ({ exitCode: 0, output: '', durationMs: 1 }) };
    const profile = { name: 'fast' as const, commands: [], targetedTests: [] };
    const clock = () => new Date('2024-01-01T00:00:00.000Z');

    const first = await evaluateCandidate(candidate, runner, { profile, clock });
    const second = await evaluateCandidate(candidate, runner, { profile, clock });

    expect(first.score).toEqual(second.score);
    expect(first.deterministicReplay).toEqual(second.deterministicReplay);
  });
});
