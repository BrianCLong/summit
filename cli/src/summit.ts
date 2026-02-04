#!/usr/bin/env node
import chalk from 'chalk';
import { Command } from 'commander';
import { AUTOMATION_WORKFLOWS, runAutomationWorkflow } from './automation.js';
import { registerOpenClawCommands } from './skills/cli.js';
import { DoctorCheckResult, runDoctor } from './summit-doctor.js';
import { registerSeraProxyCommands } from './commands/sera-proxy.js';

function renderResult(result: DoctorCheckResult): void {
  const statusIcon =
    result.status === 'pass' ? '✅' : result.status === 'warn' ? '⚠️ ' : '❌';
  console.log(`${statusIcon} ${chalk.bold(result.name)}: ${result.message}`);
  if (result.fix) {
    console.log(chalk.gray(`   Fix: ${result.fix}`));
  }
  if (result.autoFixed) {
    console.log(chalk.green('   Auto-heal applied'));
  }
}

function renderAutomationReport(report: Awaited<ReturnType<typeof runAutomationWorkflow>>, asJson: boolean) {
  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log(chalk.bold(`\n⚙️  summit ${report.workflow} workflow`));
  console.log('----------------------------------------------');
  report.results.forEach((result) => {
    const icon = result.status === 'success' ? '✅' : '❌';
    const duration = `${result.durationMs}ms`;
    console.log(`${icon} ${chalk.bold(result.name)} (${result.command}) [${duration}]`);
    if (result.stderr.trim()) {
      console.log(chalk.gray(`   stderr: ${result.stderr.trim()}`));
    }
  });

  console.log('\nSummary:');
  console.log(
    `  Success: ${report.summary.successCount}/${report.summary.total} | Failed: ${report.summary.failedCount} | Duration: ${report.summary.durationMs}ms`,
  );
}

async function main() {
  const program = new Command();

  program.name('summit').description('Summit developer toolbox CLI');
  registerSeraProxyCommands(program);

  registerOpenClawCommands(program);

  (['init', 'check', 'test', 'release-dry-run'] as const).forEach((workflowName) => {
    program
      .command(workflowName)
      .description(AUTOMATION_WORKFLOWS[workflowName].map((step) => step.description).join(' → '))
      .option('--json', 'Output JSON instead of human-friendly text', false)
      .action(async (options) => {
        const report = await runAutomationWorkflow(workflowName);
        renderAutomationReport(report, options.json);

        if (report.summary.failedCount > 0) {
          process.exitCode = 1;
        }
      });
  });

  program
    .command('doctor')
    .description('Verify local Summit developer environment and auto-heal common issues')
    .option('--env-file <path>', 'Path to the .env file', '.env')
    .option('--fix', 'Attempt to auto-heal missing dependencies', false)
    .option('--json', 'Output JSON instead of human-friendly text', false)
    .action(async (options) => {
      const report = await runDoctor({
        envFile: options.envFile,
        autoFix: options.fix,
      });

      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        console.log(chalk.bold('\n🩺 Summit Doctor - local environment diagnostics'));
        console.log('----------------------------------------------');
        report.results.forEach(renderResult);
        console.log('\nSummary:');
        console.log(
          `  Passed: ${report.summary.passed}/${report.summary.total} | Warnings: ${report.summary.warnings} | Failed: ${report.summary.failed}`,
        );
        if (report.summary.autoFixed > 0) {
          console.log(`  Auto-healed items: ${report.summary.autoFixed}`);
        }
        console.log(`  Env file: ${report.summary.envPath}`);
      }

      if (report.summary.failed > 0) {
        process.exitCode = 1;
      }
    });

  await program.parseAsync(process.argv);
}

main().catch((error) => {
  console.error(chalk.red(`Summit doctor failed: ${error instanceof Error ? error.message : String(error)}`));
  process.exit(1);
});
