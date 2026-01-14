import fs from 'fs';
import os from 'os';
import path from 'path';

import { RedQueenEngine } from '../src/aelab/engine';
import { DefaultSafetyGate } from '../src/aelab/safety';
import { AELabRunConfig } from '../src/aelab/types';
import { ToyCandidateFactory, ToyDomain, ToyMutateOperator, ToyNewOperator } from '../src/aelab/toyDomain';

describe('AELab checkpoint resume', () => {
  it('resumes from checkpoint without changing champions', async () => {
    const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aelab-checkpoint-'));
    const config: AELabRunConfig = {
      runId: 'checkpoint-run',
      seed: 5,
      rounds: 1,
      iters: 8,
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
      resume: true,
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
    };

    const runOnce = async () => {
      const factory = new ToyCandidateFactory();
      const engine = new RedQueenEngine({
        config,
        domain: new ToyDomain(),
        safetyGate: new DefaultSafetyGate(),
        newOperator: new ToyNewOperator(factory),
        mutateOperator: new ToyMutateOperator(factory),
        evidenceDir: baseDir,
      });
      return engine.run();
    };

    const first = await runOnce();
    const second = await runOnce();

    expect(second.map((c) => c.candidate.id)).toEqual(first.map((c) => c.candidate.id));
  });
});
