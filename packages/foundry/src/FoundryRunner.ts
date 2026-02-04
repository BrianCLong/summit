import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { FoundryRunOptions, RunState } from './types.js';

export class FoundryRunner {
  private options: FoundryRunOptions;
  private state: RunState;

  constructor(options: FoundryRunOptions) {
    this.options = options;
    this.state = {
      iteration: 0,
      completed: false,
      status: 'running',
      logs: [],
    };
  }

  async run(): Promise<RunState> {
    const cwd = this.options.cwd || process.cwd();
    const stateFile = path.join(cwd, 'run_state.json');

    console.log(chalk.blue(`Foundry Loop started in ${cwd}`));
    console.log(chalk.dim(`Prompt: ${this.options.prompt}`));
    console.log(chalk.dim(`Promise Token: ${this.options.completionPromise}`));

    while (this.state.iteration < this.options.maxIterations && !this.state.completed) {
      this.state.iteration++;
      console.log(chalk.yellow(`\nIteration ${this.state.iteration}/${this.options.maxIterations}`));

      // Simulate agent work (for skeleton)
      this.state.logs.push(`Iteration ${this.state.iteration}: running...`);

      // Check for completion promise
      const isComplete = this.checkCompletion(cwd);
      if (isComplete) {
        if (this.state.iteration >= (this.options.minIterations || 0)) {
          this.state.completed = true;
          this.state.status = 'completed';
          console.log(chalk.green('Completion promise found! Stopping loop.'));
        } else {
          console.log(chalk.yellow(`Completion found but min iterations (${this.options.minIterations}) not met. Continuing...`));
        }
      }

      await this.saveState(stateFile);

      if (this.state.completed) break;

      // Simulate delay or work
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (!this.state.completed) {
      this.state.status = 'stopped';
      console.log(chalk.red('Max iterations reached.'));
    }

    await this.saveState(stateFile);
    return this.state;
  }

  private checkCompletion(cwd: string): boolean {
    const promiseFile = path.join(cwd, 'PROMISE');
    if (fs.existsSync(promiseFile)) {
        const content = fs.readFileSync(promiseFile, 'utf-8');
        return content.includes(this.options.completionPromise);
    }
    return false;
  }

  private async saveState(filepath: string) {
    fs.writeFileSync(filepath, JSON.stringify(this.state, null, 2));
  }
}
