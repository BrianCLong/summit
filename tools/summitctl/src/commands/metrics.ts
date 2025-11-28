import { Command } from 'commander';
import axios from 'axios';
import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';

export const metricsCommand = new Command('metrics')
  .description('View agentic system metrics');

const API_URL = process.env.SUMMIT_API_URL || 'http://localhost:4000/agentic';

metricsCommand
  .action(async () => {
    const spinner = ora('Fetching metrics...').start();
    try {
      const response = await axios.get(`${API_URL}/metrics`);
      spinner.stop();

      const metrics = response.data;

      console.log(chalk.bold.blue('\n🚀 Agentic Velocity Metrics'));

      const velocityTable = new Table({
        head: ['Metric', 'Value'],
        style: { head: ['cyan'] }
      });

      velocityTable.push(
        ['Daily Tasks Completed', metrics.velocity.daily_tasks_completed],
        ['Avg Task Duration', `${(metrics.velocity.avg_task_duration_ms / 1000).toFixed(1)}s`],
        ['Success Rate', `${(metrics.velocity.success_rate * 100).toFixed(1)}%`]
      );

      console.log(velocityTable.toString());

      console.log(chalk.bold.blue('\n🤖 Agent Status'));
      const agentTable = new Table({
        head: ['Agent', 'Active', 'Queued'],
        style: { head: ['cyan'] }
      });

      Object.entries(metrics.agents).forEach(([name, stats]: [string, any]) => {
        agentTable.push([name, stats.active, stats.queued]);
      });

      console.log(agentTable.toString());

      console.log(chalk.bold.blue('\n💰 Budget & Health'));
      console.log(`  Daily Spend: ${chalk.green('$' + metrics.budget.daily_spend)} / $${metrics.budget.limit}`);
      console.log(`  SLO Status: ${metrics.slo.status === 'healthy' ? chalk.green('HEALTHY') : chalk.red(metrics.slo.status)}`);
      console.log(`  Latency P95: ${metrics.slo.latency_p95}ms`);

    } catch (error: any) {
      spinner.fail(chalk.red('Failed to fetch metrics'));
      console.error(chalk.red(error.message));
    }
  });
