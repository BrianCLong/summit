#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { Store } from './store';
import { createPR } from './git-ops';

const program = new Command();
const store = new Store();

program
  .name('summitctl')
  .description('Summit Control Plane CLI')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize a new task')
  .argument('<title>', 'Task title')
  .action((title) => {
    const task = store.addTask(title);
    console.log(chalk.green(`Task created: [${task.id}] ${task.title}`));
  });

program
  .command('list')
  .description('List active tasks')
  .option('-a, --all', 'List all tasks including archived')
  .action((options) => {
    const tasks = store.listTasks(options.all ? undefined : 'active');
    if (tasks.length === 0) {
      console.log(chalk.yellow('No tasks found.'));
      return;
    }
    console.log(chalk.blue('Tasks:'));
    tasks.forEach(task => {
      let color = chalk.white;
      if (task.status === 'ready-for-pr') color = chalk.cyan;
      if (task.status === 'archived') color = chalk.gray;
      console.log(color(`[${task.id}] ${task.status.padEnd(12)} - ${task.title}`));
    });
  });

program
  .command('ready')
  .description('Mark a task as ready for PR')
  .argument('<taskId>', 'Task ID')
  .action((taskId) => {
    const task = store.updateTaskStatus(taskId, 'ready-for-pr');
    if (task) {
      console.log(chalk.green(`Task ${taskId} marked as ready for PR.`));
    } else {
      console.error(chalk.red(`Task ${taskId} not found.`));
    }
  });

program
  .command('archive')
  .description('Archive a task')
  .argument('<taskId>', 'Task ID')
  .action((taskId) => {
    const task = store.updateTaskStatus(taskId, 'archived');
    if (task) {
      console.log(chalk.green(`Task ${taskId} archived.`));
    } else {
      console.error(chalk.red(`Task ${taskId} not found.`));
    }
  });

program
  .command('velocity')
  .description('Show daily velocity')
  .action(() => {
    const velocity = store.getVelocity();
    console.log(chalk.blue('Daily Velocity (Tasks Completed):'));
    Object.entries(velocity).forEach(([date, count]) => {
      console.log(`${date}: ${count}`);
    });
  });

program
  .command('pr')
  .description('Create a PR for a task')
  .argument('<taskId>', 'Task ID')
  .action(async (taskId) => {
    await createPR(taskId);
  });

program.parse();
