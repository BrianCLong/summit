#!/usr/bin/env node
import { doctor, runSpec } from './playwright-cli-runner.mjs';

function usage() {
  console.error('Usage:\n  node scripts/summit-playwright-cli.mjs doctor\n  node scripts/summit-playwright-cli.mjs run-spec <specPath>');
}

const [, , command, arg] = process.argv;

try {
  if (command === 'doctor') {
    const result = await doctor();
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.exit_code === 0 ? 0 : 1);
  }

  if (command === 'run-spec') {
    if (!arg) {
      usage();
      process.exit(2);
    }
    const result = await runSpec({ specPath: arg });
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  }

  usage();
  process.exit(2);
} catch (error) {
  console.error(JSON.stringify({ status: 'error', message: error.message }, null, 2));
  process.exit(1);
}
