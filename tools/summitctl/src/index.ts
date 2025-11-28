#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { taskCommand } from './commands/task.js';
import { metricsCommand } from './commands/metrics.js';
import { policyCommand } from './commands/policy.js';

const program = new Command();

program
  .name('summitctl')
  .description('Summit Agentic Control Plane CLI')
  .version('0.1.0');

program.addCommand(taskCommand);
program.addCommand(metricsCommand);
program.addCommand(policyCommand);

program.parse(process.argv);
