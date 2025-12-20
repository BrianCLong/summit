import { spawn } from 'child_process';
import chalk from 'chalk';

export async function testPlugin(options: { coverage?: boolean }): Promise<void> {
  console.log(chalk.blue('Running tests...'));

  const args = ['test'];
  if (options.coverage) {
    args.push('--coverage');
  }

  const jest = spawn('npx', ['jest', ...args], {
    stdio: 'inherit',
    shell: true,
  });

  jest.on('close', (code) => {
    if (code === 0) {
      console.log(chalk.green('Tests passed!'));
    } else {
      console.log(chalk.red('Tests failed'));
      process.exit(code || 1);
    }
  });
}
