import { Command } from 'commander';
import { spawnSync } from 'child_process';
import path from 'path';
import chalk from 'chalk';
import fs from 'fs';

/**
 * Validates a workflow project using the Python-based validator.
 */
export async function validateWorkflow(projectPath: string, options: { adapter: string, runId?: string }) {
  console.log(chalk.blue(`\n🔍 Validating ${options.adapter} workflow at ${projectPath}...`));

  const pythonPath = process.env.PYTHON_PATH || 'python3';
  const scriptPath = path.resolve(process.cwd(), 'summit/workflow/cli.py');

  if (!fs.existsSync(scriptPath)) {
    console.error(chalk.red(`❌ Workflow CLI script not found at ${scriptPath}`));
    process.exit(1);
  }

  const args = [scriptPath, 'validate', projectPath, '--adapter', options.adapter];
  if (options.runId) {
    args.push('--run-id', options.runId);
  }

  const result = spawnSync(pythonPath, args, {
    stdio: 'inherit',
    env: { ...process.env, PYTHONPATH: process.cwd() }
  });

  if (result.status !== 0) {
    console.error(chalk.red(`\n❌ Validation failed for ${projectPath}`));
    process.exit(1);
  }

  console.log(chalk.green('✅ Artifacts generated in artifacts/workflow/'));
}

/**
 * Registers the workflow command group.
 */
export function registerWorkflowCommands(program: Command) {
  const workflow = program
    .command('workflow')
    .description('Manage and validate dbt and Airflow workflows');

  workflow
    .command('validate')
    .description('Validate a dbt or Airflow project and produce evidence')
    .argument('<path>', 'Path to the project directory')
    .requiredOption('--adapter <type>', 'Adapter type (dbt, airflow)')
    .option('--run-id <id>', 'Unique run identifier')
    .action(async (projectPath, options) => {
      await validateWorkflow(projectPath, options);
    });
}
