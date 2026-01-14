import crypto from 'crypto';
import path from 'path';

import { RedQueenEngine } from './engine';
import { DefaultSafetyGate } from './safety';
import { AELabRunConfig } from './types';
import { ToyCandidateFactory, ToyDomain, ToyMutateOperator, ToyNewOperator } from './toyDomain';

const argValue = (args: string[], flag: string) => {
  const idx = args.indexOf(flag);
  if (idx >= 0) {
    return args[idx + 1];
  }
  return undefined;
};

export const runDrq = async (args: string[]) => {
  const domainName = argValue(args, '--domain') ?? 'toy';
  if (domainName !== 'toy') {
    throw new Error(`Unsupported domain ${domainName}. Only "toy" is available.`);
  }

  const seed = Number(argValue(args, '--seed') ?? 0);
  const rounds = Number(argValue(args, '--rounds') ?? 4);
  const iters = Number(argValue(args, '--iters') ?? 60);
  const runId = argValue(args, '--run-id') ?? crypto.randomUUID();
  const resume = args.includes('--resume');

  const config: AELabRunConfig = {
    runId,
    seed,
    rounds,
    iters,
    nInit: Number(argValue(args, '--n-init') ?? 10),
    nMutate: Number(argValue(args, '--n-mutate') ?? 10),
    sampleNewPercent: Number(argValue(args, '--new-percent') ?? 0.4),
    gridBins: [4, 4],
    descriptorRanges: [
      [0, 6],
      [0, 12],
    ],
    lastKOpponents: Number(argValue(args, '--last-k') ?? 3),
    includeBaselines: !args.includes('--no-baselines'),
    resume,
    maxParallel: Number(argValue(args, '--parallel') ?? 1),
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

  const evidenceDir = path.join(process.cwd(), 'artifacts', 'agent-lab', 'aelab', 'runs');
  const factory = new ToyCandidateFactory();
  const domain = new ToyDomain();
  const engine = new RedQueenEngine({
    config,
    domain,
    safetyGate: new DefaultSafetyGate(),
    newOperator: new ToyNewOperator(factory),
    mutateOperator: new ToyMutateOperator(factory),
    evidenceDir,
  });

  await engine.run();

  const runRoot = path.join(evidenceDir, config.runId);
  console.log(`AELab run ${config.runId} complete. Evidence at ${runRoot}`);
};
