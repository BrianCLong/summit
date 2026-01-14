import fs from 'fs';
import os from 'os';
import path from 'path';

import { RedQueenEngine } from '../src/aelab/engine';
import { DefaultSafetyGate } from '../src/aelab/safety';
import { AELabRunConfig } from '../src/aelab/types';
import { ToyCandidateFactory, ToyDomain, ToyMutateOperator, ToyNewOperator } from '../src/aelab/toyDomain';

describe('AELab integration', () => {
  it('runs toy domain and emits evidence bundle artifacts', async () => {
    const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aelab-integration-'));
    const config: AELabRunConfig = {
      runId: 'integration-run',
      seed: 11,
      rounds: 2,
      iters: 16,
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
    };

    const factory = new ToyCandidateFactory();
    const engine = new RedQueenEngine({
      config,
      domain: new ToyDomain(),
      safetyGate: new DefaultSafetyGate(),
      newOperator: new ToyNewOperator(factory),
      mutateOperator: new ToyMutateOperator(factory),
      evidenceDir: baseDir,
    });

    const champions = await engine.run();

    expect(champions).toHaveLength(2);
    const firstAccuracy = champions[0].metrics.accuracy ?? 0;
    const finalAccuracy = champions[champions.length - 1].metrics.accuracy ?? 0;
    expect(finalAccuracy).toBeGreaterThanOrEqual(firstAccuracy - 0.05);

    const runRoot = path.join(baseDir, config.runId);
    expect(fs.existsSync(path.join(runRoot, 'manifest.json'))).toBe(true);
    expect(fs.existsSync(path.join(runRoot, 'champions.jsonl'))).toBe(true);
    expect(fs.existsSync(path.join(runRoot, 'archive', 'round-1.json'))).toBe(true);
  });
});
