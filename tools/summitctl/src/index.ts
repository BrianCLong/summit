#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from './commands/init';
import { checkCommand } from './commands/check';
import { testCommand } from './commands/test';
import { releaseCommand } from './commands/release';
import { localTaskCommand } from './commands/local-task';
import { taskCommand } from './commands/task';

const program = new Command();

program
  .name('summitctl')
  .description('Summit Control Plane CLI')
  .version('0.1.0');

// Register new commands
program.addCommand(initCommand);
program.addCommand(checkCommand);
program.addCommand(testCommand);
program.addCommand(releaseCommand);

// Register task commands
// We keep the old task commands under a "local-task" group to avoid conflicts
// and eventually migrate them.
program.addCommand(localTaskCommand);
// We also expose the new agentic task command
program.addCommand(taskCommand);

program.parse();
