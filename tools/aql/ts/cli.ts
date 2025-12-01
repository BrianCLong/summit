import { Command } from 'commander';
import chalk from 'chalk';
import { execa } from 'execa';
import fs from 'node:fs';
import path from 'node:path';

interface ExecutionResult {
  records: Array<{
    key: string;
    subject: string;
    action: string;
    timestamp: string;
    evidence: Array<{
      connector: string;
      id: string;
      timestamp: string;
    }>;
    proofs: Array<{
      connector: string;
      digest: string;
    }>;
  }>;
  trace: {
    steps: Array<{
      step: string;
      detail: string;
    }>;
  };
}

const program = new Command();

program
  .name('aql')
  .description('TypeScript CLI for the Summit Audit Query Language (AQL) engine')
  .option('-q, --query <query>', 'Inline AQL query to execute')
  .option('-f, --file <file>', 'Path to file containing an AQL query')
  .option('-F, --fixtures <dir>', 'Fixture directory for connectors', 'fixtures')
  .option('-c, --compiler <path>', 'Path to the compiled aqlc binary')
  .option('--verify <file>', 'Replay provenance against a saved execution result')
  .option('-o, --output <file>', 'Write the compiler JSON output to file')
  .option('--json', 'Emit raw JSON to stdout')
  .option('--show-trace', 'Render execution trace steps');

program.action(async (options) => {
  if (!options.query && !options.file) {
    program.error('Specify either --query or --file');
  }

  const compiler = resolveCompiler(options.compiler);
  const args = buildCompilerArgs(compiler, options);

  try {
    const { stdout } = await runCompiler(compiler, args);
    if (options.output) {
      fs.writeFileSync(options.output, stdout, 'utf8');
    }

    if (options.json) {
      process.stdout.write(`${stdout}\n`);
      return;
    }

    const parsed: ExecutionResult = JSON.parse(stdout);
    renderResult(parsed, options.showTrace ?? false);
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red(`aql execution failed: ${error.message}`));
    } else {
      console.error(chalk.red('aql execution failed'));
    }
    process.exitCode = 1;
  }
});

program.parseAsync(process.argv);

function resolveCompiler(override?: string): string {
  if (override) {
    return override;
  }
  const envPath = process.env.AQLC_PATH;
  if (envPath) {
    return envPath;
  }
  const local = path.join(process.cwd(), 'target', 'release', 'aqlc');
  if (fs.existsSync(local)) {
    return local;
  }
  return 'cargo';
}

function buildCompilerArgs(compiler: string, options: any): { command: string; args: string[] } {
  const baseArgs: string[] = [];
  if (options.query) {
    baseArgs.push('--query', options.query);
  }
  if (options.file) {
    baseArgs.push('--file', options.file);
  }
  baseArgs.push('--fixtures', options.fixtures);
  if (options.verify) {
    baseArgs.push('--verify', options.verify);
  }

  if (compiler === 'cargo') {
    return {
      command: 'cargo',
      args: ['run', '--quiet', '--bin', 'aqlc', '--', ...baseArgs],
    };
  }

  return { command: compiler, args: baseArgs };
}

async function runCompiler(compiler: string, wrapper: { command: string; args: string[] }) {
  const { command, args } = wrapper;
  return execa(command, args, { stdout: 'pipe', stderr: 'pipe' });
}

function renderResult(result: ExecutionResult, showTrace: boolean) {
  if (!result.records.length) {
    console.log(chalk.yellow('No records matched the query.'));
    if (showTrace) {
      renderTrace(result);
    }
    return;
  }

  console.log(chalk.bold(`Matched ${result.records.length} result(s):`));
  for (const record of result.records) {
    console.log(`\n${chalk.cyan(record.subject)} ${chalk.green(record.action)} @ ${chalk.magenta(record.timestamp)}`);
    console.log(`  key: ${record.key}`);
    console.log('  connectors:');
    for (const evidence of record.evidence) {
      console.log(`    • ${evidence.connector} :: ${evidence.id} (${evidence.timestamp})`);
    }
    if (record.proofs.length) {
      console.log('  proofs:');
      for (const proof of record.proofs) {
        console.log(`    • ${proof.connector} :: ${proof.digest}`);
      }
    }
  }

  if (showTrace) {
    renderTrace(result);
  }
}

function renderTrace(result: ExecutionResult) {
  if (!result.trace || !result.trace.steps.length) {
    console.log(chalk.dim('\nNo execution trace emitted.'));
    return;
  }
  console.log(chalk.bold('\nExecution trace:'));
  for (const step of result.trace.steps) {
    console.log(`  ${chalk.blue(step.step)} — ${step.detail}`);
  }
}
