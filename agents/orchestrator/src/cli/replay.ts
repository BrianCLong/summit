#!/usr/bin/env node
import { replayEvidenceBundle } from '../evidence/replay.js';

function parseArgs(argv: string[]): { bundle?: string; strict: boolean } {
  const args = argv.slice(2);
  let bundle: string | undefined;
  let strict = false;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--bundle') {
      bundle = args[i + 1];
      i += 1;
    } else if (arg === '--strict') {
      strict = true;
    }
  }

  return { bundle, strict };
}

async function main(): Promise<void> {
  const { bundle, strict } = parseArgs(process.argv);
  if (!bundle) {
    console.error('Usage: orchestrator-replay --bundle <path> [--strict]');
    process.exit(1);
  }

  const report = await replayEvidenceBundle({ bundlePath: bundle, strict });
  if (!report.ok) {
    console.error('Replay mismatch detected');
    if (report.diff) {
      console.error(report.diff);
    }
    process.exit(1);
  }

  console.log('Replay successful');
}

main().catch((error) => {
  console.error('Replay failed', error);
  process.exit(1);
});
