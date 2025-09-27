#!/usr/bin/env node

/**
 * DR Drill CLI Tool
 *
 * Command-line interface for managing disaster recovery drills,
 * change freezes, and operational readiness testing.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import inquirer from 'inquirer';
import { DrillOrchestrator } from './orchestrator';
import { logger } from '../utils/logger';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const program = new Command();
const runbookPath = resolve(__dirname, '../../runbooks');
const drillOrchestrator = new DrillOrchestrator(runbookPath);

// Configure CLI
program
  .name('dr-drill')
  .description('Disaster Recovery Drill and Change Management CLI')
  .version('1.0.0');

// List available scenarios
program
  .command('scenarios')
  .description('List available drill scenarios')
  .option('-f, --format <format>', 'Output format (table|json)', 'table')
  .action(async (options) => {
    try {
      const scenarios = await drillOrchestrator.getScenarios();

      if (options.format === 'json') {
        console.log(JSON.stringify(scenarios, null, 2));
        return;
      }

      const table = new Table({
        head: ['ID', 'Name', 'Type', 'Severity', 'Duration', 'Steps'],
        colWidths: [20, 30, 15, 12, 12, 10]
      });

      scenarios.forEach(scenario => {
        table.push([
          scenario.id,
          scenario.name,
          scenario.type,
          getSeverityColor(scenario.severity),
          `${scenario.duration}m`,
          scenario.steps.length
        ]);
      });

      console.log('\n📋 Available DR Scenarios\n');
      console.log(table.toString());

    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

// Execute drill
program
  .command('execute')
  .description('Execute a disaster recovery drill')
  .requiredOption('-s, --scenario <id>', 'Scenario ID to execute')
  .option('-d, --dry-run', 'Perform dry run without executing commands', false)
  .option('-y, --yes', 'Skip confirmation prompts', false)
  .option('--report <path>', 'Path to save execution report')
  .action(async (options) => {
    try {
      const scenario = await drillOrchestrator.getScenario(options.scenario);
      if (!scenario) {
        throw new Error(`Scenario not found: ${options.scenario}`);
      }

      // Show scenario details
      console.log(chalk.bold('\n🎯 Drill Scenario Details\n'));
      console.log(`Name: ${scenario.name}`);
      console.log(`Description: ${scenario.description}`);
      console.log(`Type: ${scenario.type}`);
      console.log(`Severity: ${getSeverityColor(scenario.severity)}`);
      console.log(`Duration: ${scenario.duration} minutes`);
      console.log(`Steps: ${scenario.steps.length}`);

      if (scenario.prerequisites.length > 0) {
        console.log('\n📋 Prerequisites:');
        scenario.prerequisites.forEach(prereq => {
          console.log(`  • ${prereq}`);
        });
      }

      if (scenario.risks.length > 0) {
        console.log('\n⚠️  Risks:');
        scenario.risks.forEach(risk => {
          console.log(`  • ${chalk.yellow(risk)}`);
        });
      }

      // Confirmation
      if (!options.yes && !options.dryRun) {
        const { confirmed } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirmed',
            message: chalk.red('This will execute a live disaster recovery drill. Continue?'),
            default: false
          }
        ]);

        if (!confirmed) {
          console.log('Drill execution cancelled.');
          return;
        }
      }

      const spinner = ora('Starting drill execution...').start();

      // Set up event listeners
      drillOrchestrator.on('stepCompleted', ({ step, result }) => {
        const status = result.status === 'completed' ? '✅' : '❌';
        spinner.text = `${status} ${step.name} (${result.duration}ms)`;
      });

      // Execute drill
      const executionId = await drillOrchestrator.executeDrill(
        options.scenario,
        options.dryRun
      );

      spinner.stop();

      console.log(chalk.green(`\n✅ Drill execution completed`));
      console.log(`Execution ID: ${executionId}`);

      // Get execution results
      const execution = await drillOrchestrator.getExecution(executionId);
      displayExecutionSummary(execution);

      // Save report if requested
      if (options.report && execution.report) {
        writeFileSync(options.report, JSON.stringify(execution.report, null, 2));
        console.log(`\n📄 Report saved to: ${options.report}`);
      }

    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

// List executions
program
  .command('executions')
  .description('List recent drill executions')
  .option('-l, --limit <number>', 'Number of executions to show', '10')
  .option('-f, --format <format>', 'Output format (table|json)', 'table')
  .action(async (options) => {
    try {
      const executions = await drillOrchestrator.getExecutions(parseInt(options.limit));

      if (options.format === 'json') {
        console.log(JSON.stringify(executions, null, 2));
        return;
      }

      const table = new Table({
        head: ['Execution ID', 'Scenario', 'Status', 'Duration', 'Success Rate', 'Started'],
        colWidths: [15, 25, 12, 12, 15, 20]
      });

      executions.forEach(execution => {
        const duration = execution.metrics.totalDuration / 1000 / 60; // minutes
        const successRate = (execution.metrics.completedSteps / execution.metrics.totalSteps) * 100;

        table.push([
          execution.id.substring(0, 12),
          execution.scenarioId,
          getStatusColor(execution.status),
          `${duration.toFixed(1)}m`,
          `${successRate.toFixed(1)}%`,
          execution.startTime.toLocaleString()
        ]);
      });

      console.log('\n📊 Recent Drill Executions\n');
      console.log(table.toString());

    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

// Show execution details
program
  .command('show')
  .description('Show detailed execution results')
  .requiredOption('-e, --execution <id>', 'Execution ID')
  .option('-f, --format <format>', 'Output format (table|json)', 'table')
  .action(async (options) => {
    try {
      const execution = await drillOrchestrator.getExecution(options.execution);
      if (!execution) {
        throw new Error(`Execution not found: ${options.execution}`);
      }

      if (options.format === 'json') {
        console.log(JSON.stringify(execution, null, 2));
        return;
      }

      displayExecutionDetails(execution);

    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

// Change freeze commands
const freezeCmd = program
  .command('freeze')
  .description('Manage change freeze periods');

// Start change freeze
freezeCmd
  .command('start')
  .description('Start a change freeze period')
  .requiredOption('-s, --start <datetime>', 'Start date/time (ISO format)')
  .requiredOption('-e, --end <datetime>', 'End date/time (ISO format)')
  .option('--services <services...>', 'Services to include in freeze')
  .option('--environments <envs...>', 'Environments to include in freeze')
  .option('--allow-hotfixes', 'Allow hotfix deployments', false)
  .option('--allow-security', 'Allow security deployments', false)
  .option('--allow-rollbacks', 'Allow rollback deployments', false)
  .action(async (options) => {
    try {
      const config = {
        enabled: true,
        startTime: new Date(options.start),
        endTime: new Date(options.end),
        scope: {
          services: options.services || [],
          environments: options.environments || [],
          operations: []
        },
        exceptions: {
          hotfixes: options.allowHotfixes,
          security: options.allowSecurity,
          rollbacks: options.allowRollbacks
        },
        approvers: [],
        notifications: {
          channels: ['slack', 'email'],
          reminders: [24, 4, 1] // Hours before start
        }
      };

      await drillOrchestrator.startChangeFreeze(config);

      console.log(chalk.yellow('\n🧊 Change freeze initiated'));
      console.log(`Start: ${config.startTime.toLocaleString()}`);
      console.log(`End: ${config.endTime.toLocaleString()}`);
      console.log(`Duration: ${((config.endTime.getTime() - config.startTime.getTime()) / (1000 * 60 * 60)).toFixed(1)} hours`);

      if (config.scope.services.length > 0) {
        console.log(`Services: ${config.scope.services.join(', ')}`);
      }

      if (config.scope.environments.length > 0) {
        console.log(`Environments: ${config.scope.environments.join(', ')}`);
      }

    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

// End change freeze
freezeCmd
  .command('end')
  .description('End the current change freeze')
  .action(async () => {
    try {
      await drillOrchestrator.endChangeFreeze();
      console.log(chalk.green('\n✅ Change freeze ended'));

    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

// Check change freeze status
freezeCmd
  .command('status')
  .description('Show current change freeze status')
  .action(async () => {
    try {
      const status = await drillOrchestrator.getChangeFreezeStatus();

      if (!status.active) {
        console.log(chalk.green('\n✅ No active change freeze'));
        return;
      }

      console.log(chalk.yellow('\n🧊 Active Change Freeze'));
      console.log(`Start: ${status.startTime.toLocaleString()}`);
      console.log(`End: ${status.endTime.toLocaleString()}`);

      const now = new Date();
      const remaining = status.endTime.getTime() - now.getTime();
      const hoursRemaining = remaining / (1000 * 60 * 60);

      if (hoursRemaining > 0) {
        console.log(`Remaining: ${hoursRemaining.toFixed(1)} hours`);
      } else {
        console.log(chalk.red('⚠️  Freeze period has expired'));
      }

      if (status.scope.services.length > 0) {
        console.log(`Services: ${status.scope.services.join(', ')}`);
      }

    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

// Validate change during freeze
freezeCmd
  .command('validate')
  .description('Check if a change is allowed during freeze')
  .requiredOption('-t, --type <type>', 'Change type (deployment|hotfix|security|rollback)')
  .requiredOption('-s, --service <service>', 'Target service')
  .requiredOption('-e, --environment <env>', 'Target environment')
  .action(async (options) => {
    try {
      const changeRequest = {
        type: options.type,
        service: options.service,
        environment: options.environment
      };

      const allowed = drillOrchestrator.isChangeAllowed(changeRequest);

      if (allowed) {
        console.log(chalk.green('\n✅ Change is allowed'));
      } else {
        console.log(chalk.red('\n❌ Change is blocked by freeze'));
        process.exit(1);
      }

    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

// Runbook commands
program
  .command('runbook')
  .description('Generate runbook documentation')
  .option('-o, --output <path>', 'Output file path', 'dr-runbook.md')
  .option('-f, --format <format>', 'Output format (markdown|html|pdf)', 'markdown')
  .action(async (options) => {
    try {
      const spinner = ora('Generating runbook...').start();

      const runbook = await generateRunbook(options.format);

      writeFileSync(options.output, runbook);

      spinner.stop();
      console.log(chalk.green(`\n✅ Runbook generated: ${options.output}`));

    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

// Schedule drill
program
  .command('schedule')
  .description('Schedule automatic drill execution')
  .requiredOption('-s, --scenario <id>', 'Scenario ID')
  .requiredOption('-c, --cron <expression>', 'Cron expression for schedule')
  .option('-d, --dry-run', 'Schedule as dry run only', false)
  .option('--notify <channels...>', 'Notification channels')
  .action(async (options) => {
    try {
      const schedule = {
        scenarioId: options.scenario,
        cron: options.cron,
        dryRun: options.dryRun,
        notifications: options.notify || ['slack']
      };

      await drillOrchestrator.scheduleDrill(schedule);

      console.log(chalk.green('\n✅ Drill scheduled'));
      console.log(`Scenario: ${options.scenario}`);
      console.log(`Schedule: ${options.cron}`);
      console.log(`Mode: ${options.dryRun ? 'Dry Run' : 'Live'}`);

    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

// Helper functions
function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'low': return chalk.green(severity);
    case 'medium': return chalk.yellow(severity);
    case 'high': return chalk.orange(severity);
    case 'critical': return chalk.red(severity);
    default: return severity;
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'completed': return chalk.green(status);
    case 'running': return chalk.blue(status);
    case 'failed': return chalk.red(status);
    case 'cancelled': return chalk.gray(status);
    case 'paused': return chalk.yellow(status);
    default: return status;
  }
}

function displayExecutionSummary(execution: any): void {
  console.log('\n📊 Execution Summary\n');

  const table = new Table({
    head: ['Metric', 'Value'],
    colWidths: [25, 20]
  });

  const duration = execution.metrics.totalDuration / 1000 / 60;
  const successRate = (execution.metrics.completedSteps / execution.metrics.totalSteps) * 100;

  table.push(
    ['Status', getStatusColor(execution.status)],
    ['Duration', `${duration.toFixed(1)} minutes`],
    ['Total Steps', execution.metrics.totalSteps],
    ['Completed Steps', chalk.green(execution.metrics.completedSteps)],
    ['Failed Steps', execution.metrics.failedSteps > 0 ? chalk.red(execution.metrics.failedSteps) : '0'],
    ['Success Rate', `${successRate.toFixed(1)}%`]
  );

  console.log(table.toString());

  if (execution.report && execution.report.objectives) {
    console.log('\n🎯 Objectives\n');

    const objTable = new Table({
      head: ['Objective', 'Target', 'Actual', 'Status'],
      colWidths: [20, 15, 15, 10]
    });

    Object.entries(execution.report.objectives).forEach(([key, obj]: [string, any]) => {
      objTable.push([
        key.toUpperCase(),
        `${obj.target} ${obj.unit || ''}`,
        `${obj.actual} ${obj.unit || ''}`,
        obj.met ? chalk.green('✓') : chalk.red('✗')
      ]);
    });

    console.log(objTable.toString());
  }
}

function displayExecutionDetails(execution: any): void {
  displayExecutionSummary(execution);

  console.log('\n📋 Step Details\n');

  const stepTable = new Table({
    head: ['Step', 'Status', 'Duration', 'Output/Error'],
    colWidths: [25, 12, 12, 40]
  });

  execution.results.forEach((result: any) => {
    const output = result.error ? chalk.red(result.error) :
                   (result.output ? result.output.substring(0, 35) + '...' : '');

    stepTable.push([
      result.stepId,
      getStatusColor(result.status),
      `${result.duration}ms`,
      output
    ]);
  });

  console.log(stepTable.toString());

  if (execution.report && execution.report.findings.length > 0) {
    console.log('\n🔍 Findings\n');

    execution.report.findings.forEach((finding: any) => {
      const icon = finding.type === 'issue' ? '❌' :
                   finding.type === 'improvement' ? '💡' : '✅';

      console.log(`${icon} ${getSeverityColor(finding.severity)} - ${finding.description}`);
      if (finding.impact) {
        console.log(`   Impact: ${finding.impact}`);
      }
    });
  }

  if (execution.report && execution.report.recommendations.length > 0) {
    console.log('\n💡 Recommendations\n');

    execution.report.recommendations.forEach((rec: any) => {
      console.log(`• ${chalk.bold(rec.title)}`);
      console.log(`  ${rec.description}`);
      console.log(`  Priority: ${getSeverityColor(rec.priority)}, Effort: ${rec.effort}, Timeline: ${rec.timeline}`);
      console.log();
    });
  }
}

async function generateRunbook(format: string): Promise<string> {
  const scenarios = await drillOrchestrator.getScenarios();

  let content = '# Disaster Recovery Runbook\n\n';
  content += 'This document contains procedures for disaster recovery scenarios.\n\n';
  content += '## Table of Contents\n\n';

  // Table of contents
  scenarios.forEach(scenario => {
    content += `- [${scenario.name}](#${scenario.id})\n`;
  });

  content += '\n## Scenarios\n\n';

  // Scenario details
  scenarios.forEach(scenario => {
    content += `### ${scenario.name} {#${scenario.id}}\n\n`;
    content += `**Type:** ${scenario.type}  \n`;
    content += `**Severity:** ${scenario.severity}  \n`;
    content += `**Duration:** ${scenario.duration} minutes\n\n`;
    content += `${scenario.description}\n\n`;

    if (scenario.prerequisites.length > 0) {
      content += '#### Prerequisites\n\n';
      scenario.prerequisites.forEach(prereq => {
        content += `- ${prereq}\n`;
      });
      content += '\n';
    }

    if (scenario.risks.length > 0) {
      content += '#### Risks\n\n';
      scenario.risks.forEach(risk => {
        content += `- ⚠️ ${risk}\n`;
      });
      content += '\n';
    }

    content += '#### Steps\n\n';
    scenario.steps.forEach((step, index) => {
      content += `${index + 1}. **${step.name}**\n`;
      content += `   ${step.description}\n`;
      if (step.command) {
        content += `   \`\`\`bash\n   ${step.command}\n   \`\`\`\n`;
      }
      content += '\n';
    });

    if (scenario.rollbackSteps.length > 0) {
      content += '#### Rollback Steps\n\n';
      scenario.rollbackSteps.forEach((step, index) => {
        content += `${index + 1}. **${step.name}**\n`;
        content += `   ${step.description}\n`;
        if (step.command) {
          content += `   \`\`\`bash\n   ${step.command}\n   \`\`\`\n`;
        }
        content += '\n';
      });
    }

    content += '---\n\n';
  });

  return content;
}

// Run CLI
if (require.main === module) {
  program.parse();
}