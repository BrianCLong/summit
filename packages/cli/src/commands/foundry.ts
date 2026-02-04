import { Command } from 'commander';
import { FoundryRunner, FoundryRunOptions } from '@summit/foundry';
import chalk from 'chalk';

export const foundryCommands = {
  loop: new Command('loop')
    .description('Run an agent loop')
    .argument('<prompt>', 'The prompt for the agent')
    .option('--model <name>', 'Model to use')
    .option('--min-iterations <number>', 'Minimum number of iterations', '0')
    .option('-m, --max-iterations <number>', 'Maximum number of iterations', '10')
    .option('-p, --promise <token>', 'Completion promise token', '<promise>COMPLETE</promise>')
    .option('--agent <name>', 'Agent to use', 'mock')
    .action(async (prompt, options) => {
      console.log(chalk.bold('Starting Foundry Loop...'));

      const runOptions: FoundryRunOptions = {
        prompt,
        model: options.model,
        minIterations: parseInt(options.minIterations, 10),
        maxIterations: parseInt(options.maxIterations, 10),
        completionPromise: options.promise,
        agent: options.agent,
        cwd: process.cwd()
      };

      const runner = new FoundryRunner(runOptions);
      try {
        const result = await runner.run();
        console.log(chalk.bold(`Loop finished with status: ${result.status}`));
        if (result.status === 'completed') {
            process.exit(0);
        } else {
            process.exit(1);
        }
      } catch (error) {
        console.error(chalk.red('Error running loop:'), error);
        process.exit(1);
      }
    }),
};
