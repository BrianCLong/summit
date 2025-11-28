import { Command } from 'commander';
import axios from 'axios';
import chalk from 'chalk';
import ora from 'ora';

export const taskCommand = new Command('task')
  .description('Manage agent tasks');

const API_URL = process.env.SUMMIT_API_URL || 'http://localhost:4000/agentic';

taskCommand
  .command('submit')
  .description('Submit a new task to the agentic control plane')
  .argument('<description>', 'Description of the task (issue summary)')
  .requiredOption('-r, --repo <repo>', 'Repository name')
  .option('-k, --kind <kind>', 'Task kind (plan, scaffold, implement, test, review, docs)', 'plan')
  .option('-b, --budget <budget>', 'Budget in USD', parseFloat, 10)
  .action(async (description, options) => {
    const spinner = ora('Submitting task...').start();
    try {
      const response = await axios.post(`${API_URL}/tasks`, {
        issue: description,
        repo: options.repo,
        kind: options.kind,
        budgetUSD: options.budget,
        context: {
          cli_version: '0.1.0',
          submitted_at: new Date().toISOString()
        }
      });

      spinner.succeed(chalk.green('Task submitted successfully!'));
      console.log(chalk.bold('\nTask Details:'));
      console.log(`  ID: ${chalk.cyan(response.data.taskId)}`);
      console.log(`  Status: ${chalk.yellow(response.data.status)}`);
      console.log(`  Message: ${response.data.message}`);

    } catch (error: any) {
      spinner.fail(chalk.red('Failed to submit task'));
      if (axios.isAxiosError(error)) {
        console.error(chalk.red(`Error: ${error.response?.data?.error || error.message}`));
        if (error.response?.data?.details) {
          console.error(chalk.yellow('Details:'), error.response.data.details);
        }
      } else {
        console.error(chalk.red(error.message));
      }
    }
  });

taskCommand
  .command('status')
  .description('Get status of a task')
  .argument('<taskId>', 'Task ID')
  .action(async (taskId) => {
    const spinner = ora(`Fetching status for task ${taskId}...`).start();
    try {
      const response = await axios.get(`${API_URL}/tasks/${taskId}`);
      spinner.stop();

      const task = response.data;
      console.log(chalk.bold(`\nTask ${taskId}`));
      console.log(`  State: ${getStateColor(task.state)(task.state)}`);
      console.log(`  Progress: ${task.progress}%`);
      console.log(`  Repo: ${task.data.repo}`);
      console.log(`  Issue: ${task.data.issue}`);

      if (task.failedReason) {
        console.log(chalk.red(`  Failed Reason: ${task.failedReason}`));
      }

      if (task.finishedOn) {
        console.log(`  Finished: ${new Date(task.finishedOn).toLocaleString()}`);
      }

    } catch (error: any) {
      spinner.fail(chalk.red('Failed to get task status'));
      console.error(chalk.red(error.message));
    }
  });

function getStateColor(state: string) {
  switch (state) {
    case 'completed': return chalk.green;
    case 'failed': return chalk.red;
    case 'active': return chalk.blue;
    case 'delayed': return chalk.yellow;
    default: return chalk.white;
  }
}
