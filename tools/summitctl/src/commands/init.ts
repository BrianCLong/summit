import { Command } from 'commander';
import chalk from 'chalk';
import { runCommandWithStream } from '../utils';

export const initCommand = new Command('init')
  .description('Scaffold dev environment')
  .option('--full', 'Run full setup including smoke tests')
  .option('--start', 'Start services after bootstrap')
  .action(async (options) => {
    console.log(chalk.bold('Initializing Development Environment...'));

    try {
      // 1. Bootstrap
      await runCommandWithStream('make bootstrap', 'Bootstrapping dependencies and environment');

      // 2. Start services (if requested or full)
      if (options.start || options.full) {
          await runCommandWithStream('make up', 'Starting services');
      }

      // 3. Smoke Test (if full)
      if (options.full) {
          await runCommandWithStream('make smoke', 'Running smoke tests');
      }

      console.log(chalk.green('\nDevelopment environment initialized successfully!'));
      console.log(chalk.blue('You can now run:'));
      console.log(chalk.white('  summitctl test      # Run tests'));
      console.log(chalk.white('  summitctl check     # Validate code'));

    } catch (error) {
      console.error(chalk.red('\nInit failed. Please check the logs above.'));
      process.exit(1);
    }
  });
