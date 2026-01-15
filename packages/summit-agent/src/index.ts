#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { getPackageVersion } from './lib/version.js';
import { runPlan } from './commands/plan.js';
import { runExecution } from './commands/run.js';
import { runVerify } from './commands/verify.js';
import { runShip } from './commands/ship.js';

const program = new Command();

program
  .name('summit-agent')
  .description('Summit-native agentic coding CLI with governance receipts')
  .version(getPackageVersion());

program
  .command('plan')
  .description('Create plan and acceptance checklist for a task')
  .argument('<task>', 'Task to plan')
  .option('-s, --session <id>', 'Reuse a session id for deterministic runs')
  .action((task, options) => {
    const session = runPlan({ task, session: options.session });
    process.stdout.write(
      `${chalk.green(`Plan created in ${session.baseDir}`)}\n`,
    );
  });

program
  .command('run')
  .description('Execute declared steps with Switchboard receipts')
  .option('-s, --session <id>', 'Reuse a session id for deterministic runs')
  .option('-c, --command <cmd>', 'Command to execute via Switchboard')
  .action((options) => {
    const result = runExecution({
      session: options.session,
      command: options.command,
    });
    process.exitCode = result.exitCode;
  });

program
  .command('verify')
  .description('Run checklist verifiers and emit evidence reports')
  .option('-s, --session <id>', 'Reuse a session id for deterministic runs')
  .action((options) => {
    const result = runVerify({ session: options.session });
    process.exitCode = result.exitCode;
  });

program
  .command('ship')
  .description('Block shipping until verify passes')
  .option('-s, --session <id>', 'Reuse a session id for deterministic runs')
  .action((options) => {
    const result = runShip({ session: options.session });
    process.exitCode = result.exitCode;

    if (result.exitCode !== 0) {
      process.stderr.write(
        `${chalk.red('Ship blocked: checklist verification failed.')}\n`,
      );
    } else {
      process.stdout.write(
        `${chalk.green('Ship gate passed. Ready to open PR.')}\n`,
      );
    }
  });

program.parse();
