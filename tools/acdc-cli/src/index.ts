#!/usr/bin/env node
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const manifestPath = process.env.ACDC_MANIFEST ?? path.resolve(__dirname, '../../..', 'acdc', 'Cargo.toml');

function resolvePath(input?: string): string | undefined {
  if (!input) {
    return undefined;
  }
  return path.isAbsolute(input) ? input : path.resolve(process.cwd(), input);
}

function runAcDc(args: string[]): number {
  const binary = process.env.ACDC_BIN;
  if (binary) {
    const result = spawnSync(binary, args, { stdio: 'inherit' });
    return result.status ?? 1;
  }

  const cargoArgs = ['run'];
  if (process.env.ACDC_USE_RELEASE === '1') {
    cargoArgs.push('--release');
  }
  cargoArgs.push('--manifest-path', manifestPath);
  const extra = process.env.ACDC_CARGO_ARGS;
  if (extra) {
    cargoArgs.push(...extra.split(' ').filter(Boolean));
  }
  cargoArgs.push('--');
  cargoArgs.push(...args);

  const result = spawnSync('cargo', cargoArgs, { stdio: 'inherit' });
  return result.status ?? 1;
}

function forwardToCompiler(args: string[]) {
  const code = runAcDc(args);
  if (code !== 0) {
    process.exit(code);
  }
}

yargs(hideBin(process.argv))
  .scriptName('acdc-cli')
  .command(
    'compile <dsl> <policy>',
    'Compile a DSL into a guarded execution plan',
    builder =>
      builder
        .positional('dsl', {
          type: 'string',
          describe: 'Path to the ACDC DSL file',
          demandOption: true,
        })
        .positional('policy', {
          type: 'string',
          describe: 'Policy definition JSON/YAML',
          demandOption: true,
        })
        .option('consent', {
          type: 'string',
          describe: 'Optional consent overrides JSON/YAML',
        })
        .option('output', {
          type: 'string',
          describe: 'Where to write the resulting plan (defaults to stdout)',
        })
        .option('format', {
          choices: ['json', 'pretty'] as const,
          default: 'pretty',
          describe: 'Serialization format to request from the compiler',
        }),
    argv => {
      const args = [
        'compile',
        '--dsl',
        resolvePath(argv.dsl as string)!,
        '--policy',
        resolvePath(argv.policy as string)!,
      ];
      const consentPath = resolvePath(argv.consent as string | undefined);
      if (consentPath) {
        args.push('--consent', consentPath);
      }
      const outputPath = resolvePath(argv.output as string | undefined);
      if (outputPath) {
        args.push('--output', outputPath);
      }
      if (argv.format) {
        args.push('--format', argv.format as string);
      }
      forwardToCompiler(args);
    }
  )
  .command(
    'simulate <dsl> <policy>',
    'Show plan deltas for consent or policy changes',
    builder =>
      builder
        .positional('dsl', {
          type: 'string',
          describe: 'Path to the ACDC DSL file',
          demandOption: true,
        })
        .positional('policy', {
          type: 'string',
          describe: 'Baseline policy definition',
          demandOption: true,
        })
        .option('consent', {
          type: 'string',
          describe: 'Baseline consent definition',
        })
        .option('updated-policy', {
          type: 'string',
          describe: 'Updated policy definition to compare',
        })
        .option('updated-consent', {
          type: 'string',
          describe: 'Updated consent definition to compare',
        })
        .option('output', {
          type: 'string',
          describe: 'Where to write the simulation result',
        })
        .option('format', {
          choices: ['json', 'pretty'] as const,
          default: 'pretty',
          describe: 'Serialization format to request from the compiler',
        }),
    argv => {
      const args = [
        'simulate',
        '--dsl',
        resolvePath(argv.dsl as string)!,
        '--policy',
        resolvePath(argv.policy as string)!,
      ];
      const baselineConsent = resolvePath(argv.consent as string | undefined);
      if (baselineConsent) {
        args.push('--consent', baselineConsent);
      }
      const updatedPolicy = resolvePath(argv['updated-policy'] as string | undefined);
      if (updatedPolicy) {
        args.push('--updated-policy', updatedPolicy);
      }
      const updatedConsent = resolvePath(argv['updated-consent'] as string | undefined);
      if (updatedConsent) {
        args.push('--updated-consent', updatedConsent);
      }
      const outputPath = resolvePath(argv.output as string | undefined);
      if (outputPath) {
        args.push('--output', outputPath);
      }
      if (argv.format) {
        args.push('--format', argv.format as string);
      }
      forwardToCompiler(args);
    }
  )
  .demandCommand(1)
  .strict()
  .help()
  .parse();
