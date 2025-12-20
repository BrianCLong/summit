import { Command } from 'commander';
import chalk from 'chalk';
import { runCommandWithStream } from '../utils';

export const releaseCommand = new Command('release-dry-run')
  .description('Simulate release process locally')
  .action(async () => {
    console.log(chalk.bold('Simulating Release Process...'));

    try {
      // 1. Build
      await runCommandWithStream('npm run build', 'Building artifacts');

      // 2. Semantic Release Dry Run
      await runCommandWithStream('npx semantic-release --dry-run', 'Semantic Release Dry Run');

      console.log(chalk.green('\nRelease simulation completed successfully!'));
      console.log(chalk.blue('No changes were pushed.'));

    } catch (error) {
      console.error(chalk.red('\nRelease simulation failed.'));
      process.exit(1);
    }
  });
