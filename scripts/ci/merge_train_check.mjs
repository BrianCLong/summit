#!/usr/bin/env node
import { execSync } from 'child_process';
import chalk from 'chalk';

const CHECKS = [
  {
    name: 'Lint',
    command: 'pnpm lint',
  },
  {
    name: 'Typecheck',
    command: 'pnpm typecheck',
  },
  {
    name: 'Validation Middleware Test',
    command: 'pnpm --filter intelgraph-server test:unit -- --runTestsByPath server/src/middleware/__tests__/validation.test.ts',
  },
  {
    name: 'Capacity Futures Test',
    command: 'pnpm --filter intelgraph-server test:unit -- --runTestsByPath server/tests/conductor/capacity-futures.test.ts',
  },
];

function runCheck(name, command) {
  try {
    console.log(chalk.blue(`Running: ${name}...`));
    execSync(command, { stdio: 'inherit' });
    console.log(chalk.green(`✅ ${name} passed.`));
    return true;
  } catch (error) {
    console.error(chalk.red(`❌ ${name} failed.`));
    console.error(chalk.red(`Command failed: ${command}`));
    return false;
  }
}

function main() {
  console.log(chalk.yellow('🚀 Starting merge-train pre-flight checks...'));
  for (const check of CHECKS) {
    if (!runCheck(check.name, check.command)) {
      console.error(chalk.red.bold('\n🔥 Merge-train check failed. Please fix the issues above.'));
      process.exit(1);
    }
  }
  console.log(chalk.green.bold('\n✅ All merge-train checks passed!'));
}

main();
