import { Command } from 'commander';
import chalk from 'chalk';
import { runCommandWithStream } from '../utils';

export const testAction = async (options: any) => {
    // Logic:
    // If --all is passed, run everything.
    // If specific flags are passed, run only those.
    // If NO flags are passed, run everything (default behavior).

    const hasSpecificFlag = options.unit || options.integration || options.e2e || options.smoke;
    const runAll = options.all || !hasSpecificFlag;

    console.log(chalk.bold('Running Tests...'));
    let hasError = false;

    if (runAll || options.unit) {
        try {
            await runCommandWithStream('npm run test:unit', 'Unit Tests');
        } catch (e) { hasError = true; }
    }

    if (runAll || options.integration) {
        try {
            await runCommandWithStream('npm run test:integration', 'Integration Tests');
        } catch (e) { hasError = true; }
    }

    if (runAll || options.smoke) {
        try {
             await runCommandWithStream('make smoke', 'Smoke Tests');
        } catch (e) { hasError = true; }
    }

    if (runAll || options.e2e) {
        try {
            await runCommandWithStream('npm run test:e2e', 'E2E Tests');
        } catch (e) { hasError = true; }
    }

    if (hasError) {
        console.error(chalk.red('\nSome tests failed.'));
        process.exit(1);
    } else {
        console.log(chalk.green('\nAll executed test suites passed!'));
    }
};

export const testCommand = new Command('test')
  .description('Run tests')
  .option('--unit', 'Run unit tests')
  .option('--integration', 'Run integration tests')
  .option('--e2e', 'Run E2E tests')
  .option('--smoke', 'Run smoke tests')
  .option('--all', 'Run all tests')
  .action(testAction);
