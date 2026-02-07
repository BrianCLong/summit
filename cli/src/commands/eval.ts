import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { Command } from 'commander';

const DEFAULT_REGIMES = 'instruction_only,concepts,related_only,full_set';

function runDer2(args: string[], envOverrides: NodeJS.ProcessEnv = {}): void {
  const result = spawnSync('python3', args, {
    stdio: 'inherit',
    env: {
      ...process.env,
      DER2_NETWORK_DISABLED: '1',
      ...envOverrides,
    },
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
  }
}

export function registerEvalCommands(program: Command): void {
  const evalCommand = program.command('eval').description('Run Summit benchmark evaluations');

  evalCommand
    .command('der2_smoke')
    .description('Run DeR2 smoke benchmark with synthetic fixtures')
    .option('--model <model>', 'Model name', 'dummy')
    .option('--output-dir <path>', 'Output directory', 'artifacts/der2_smoke')
    .option('--regimes <list>', 'Comma-separated regimes', DEFAULT_REGIMES)
    .option('--validation-mode', 'Enable leakage validation gate', false)
    .action((options) => {
      const repoRoot = process.cwd();
      const fixturesRoot = path.resolve(repoRoot, 'benchmarks/der2/fixtures');
      const scriptPath = path.resolve(repoRoot, 'scripts/bench/run_der2.py');

      runDer2([
        scriptPath,
        '--bench-id',
        'der2_smoke',
        '--model',
        options.model,
        '--frozen_library_dir',
        path.resolve(fixturesRoot, 'frozen_library'),
        '--tasks',
        path.resolve(fixturesRoot, 'tasks.jsonl'),
        '--concepts',
        path.resolve(fixturesRoot, 'concepts.jsonl'),
        '--output-dir',
        path.resolve(repoRoot, options.outputDir),
        '--regimes',
        options.regimes,
        ...(options.validationMode ? ['--validation-mode'] : []),
      ]);
    });

  evalCommand
    .command('der2')
    .description('Run DeR2 benchmark with explicit frozen library inputs')
    .requiredOption('--frozen_library_dir <path>', 'Frozen library directory')
    .requiredOption('--tasks <path>', 'Tasks JSONL')
    .requiredOption('--concepts <path>', 'Concepts JSONL')
    .option('--bench-id <id>', 'Benchmark ID', 'der2_custom')
    .option('--model <model>', 'Model name', 'dummy')
    .option('--output-dir <path>', 'Output directory', 'artifacts/der2_custom')
    .option('--regimes <list>', 'Comma-separated regimes', DEFAULT_REGIMES)
    .option('--validation-mode', 'Enable leakage validation gate', false)
    .action((options) => {
      const repoRoot = process.cwd();
      const scriptPath = path.resolve(repoRoot, 'scripts/bench/run_der2.py');

      runDer2([
        scriptPath,
        '--bench-id',
        options.benchId,
        '--model',
        options.model,
        '--frozen_library_dir',
        path.resolve(options.frozen_library_dir),
        '--tasks',
        path.resolve(options.tasks),
        '--concepts',
        path.resolve(options.concepts),
        '--output-dir',
        path.resolve(repoRoot, options.outputDir),
        '--regimes',
        options.regimes,
        ...(options.validationMode ? ['--validation-mode'] : []),
      ]);
    });
}
