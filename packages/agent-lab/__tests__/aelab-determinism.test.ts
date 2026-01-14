import fs from 'fs';
import os from 'os';
import path from 'path';

import { RedQueenEngine } from '../src/aelab/engine';
import { DefaultSafetyGate } from '../src/aelab/safety';
import { AELabRunConfig } from '../src/aelab/types';
import { ToyCandidateFactory, ToyDomain, ToyMutateOperator, ToyNewOperator } from '../src/aelab/toyDomain';

describe('AELab determinism', () => {
  const makeConfig = (runId: string): AELabRunConfig => ({
    runId,
    seed: 7,
    rounds: 2,
    iters: 12,
    nInit: 4,
    nMutate: 4,
    sampleNewPercent: 0.5,
    gridBins: [4, 4],
    descriptorRanges: [
      [0, 6],
      [0, 12],
    ],
    lastKOpponents: 2,
    includeBaselines: true,
    resume: false,
    maxParallel: 1,
    promptTemplates: {
      system: { id: 'aelab-drq-system', version: 'v1', path: 'prompts/aelab/drq-system-v1.md' },
      create: { id: 'aelab-drq-new', version: 'v1', path: 'prompts/aelab/drq-new-v1.md' },
      mutate: { id: 'aelab-drq-mutate', version: 'v1', path: 'prompts/aelab/drq-mutate-v1.md' },
    },
    safety: {
      offline: true,
      allowedTools: [],
      policyVersion: 'offline-default-v1',
    },
  });

  it('produces identical champions for the same seed', async () => {
    const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aelab-'));
    const run = async (runId: string) => {
      const factory = new ToyCandidateFactory();
      const engine = new RedQueenEngine({
        config: makeConfig(runId),
        domain: new ToyDomain(),
        safetyGate: new DefaultSafetyGate(),
        newOperator: new ToyNewOperator(factory),
        mutateOperator: new ToyMutateOperator(factory),
        evidenceDir: baseDir,
      });
      return engine.run();
    };

    const first = await run('run-1');
    const second = await run('run-2');

    const firstHashes = first.map((champ) => champ.candidate.contentHash);
    const secondHashes = second.map((champ) => champ.candidate.contentHash);
    expect(firstHashes).toEqual(secondHashes);
  });
});
