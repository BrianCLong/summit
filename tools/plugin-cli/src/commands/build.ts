import { spawn } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';

export async function buildPlugin(options: { watch?: boolean }): Promise<void> {
  const spinner = ora('Building plugin...').start();

  try {
    const args = options.watch ? ['--watch'] : [];

    const tsc = spawn('tsc', args, {
      stdio: 'inherit',
      shell: true,
    });

    tsc.on('close', (code) => {
      if (code === 0) {
        spinner.succeed(chalk.green('Plugin built successfully!'));
      } else {
        spinner.fail(chalk.red('Build failed'));
        process.exit(code || 1);
      }
    });
  } catch (error) {
    spinner.fail(chalk.red('Build failed'));
    throw error;
  }
}
