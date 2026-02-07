#!/usr/bin/env node
import chalk from 'chalk';
import { Command } from 'commander';
import { AUTOMATION_WORKFLOWS, runAutomationWorkflow } from './automation.js';
import { registerOpenClawCommands } from './skills/cli.js';
import { DoctorCheckResult, runDoctor } from './summit-doctor.js';
import { initAgentScaffold } from './adk/init.js';
import { validateManifestCommand } from './adk/validate.js';
import { runAgent } from './adk/run.js';
import { packAgent } from './adk/pack.js';
import { registerEvalCommands } from './commands/eval.js';

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

  registerOpenClawCommands(program);
  registerEvalCommands(program);

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

  const adk = program
    .command('adk')
    .description('Summit Agent Development Kit (S-ADK) workflows');

  adk
    .command('init')
    .description('Create a new S-ADK agent scaffold')
    .requiredOption('--name <name>', 'Agent name')
    .action(async (options) => {
      const { manifestPath } = await initAgentScaffold(options.name, process.cwd());
      console.log(`Scaffold created: ${manifestPath}`);
    });

  adk
    .command('validate')
    .description('Validate an S-ADK agent manifest')
    .argument('<manifestPath>', 'Path to agent.yaml or agent.json')
    .action(async (manifestPath) => {
      const { reportPath, ok } = await validateManifestCommand(manifestPath);
      console.log(`Validation report: ${reportPath}`);
      if (!ok) {
        process.exitCode = 1;
      }
    });

  adk
    .command('run')
    .description('Run an S-ADK agent locally against a fixture')
    .argument('<agentPath>', 'Path to agent directory or manifest file')
    .requiredOption('--fixture <path>', 'Fixture JSON file')
    .action(async (agentPath, options) => {
      const { evidenceId, outputDir } = await runAgent(agentPath, options.fixture);
      console.log(`Evidence ID: ${evidenceId}`);
      console.log(`Artifacts: ${outputDir}`);
    });

  adk
    .command('pack')
    .description('Package an S-ADK agent into a tarball')
    .argument('<agentDir>', 'Agent directory to package')
    .option('--output <path>', 'Output archive path')
    .action(async (agentDir, options) => {
      const archive = await packAgent(agentDir, options.output);
      console.log(`Packed archive: ${archive}`);
    });

  await program.parseAsync(process.argv);
}

main().catch((error) => {
  console.error(chalk.red(`Summit doctor failed: ${error instanceof Error ? error.message : String(error)}`));
  process.exit(1);
});
