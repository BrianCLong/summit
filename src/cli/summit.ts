#!/usr/bin/env node

import { Command } from 'commander';
import { registerFlowsCommands } from './commands/flows';

const program = new Command();

program.name('summit').description('Summit CLI').version('0.1.0');

registerFlowsCommands(program);

program.parse(process.argv);
