#!/usr/bin/env node

import { runCommand } from './commands/run';

const args = process.argv.slice(2);
if (args[0] === 'run') {
  runCommand(args[1], args[2]);
} else {
  console.log('Usage: summit run <type> <id/path>');
}
