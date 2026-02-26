import { Command } from 'commander';
import { spawnSync } from 'child_process';
import path from 'path';
import { existsSync } from 'fs';

export function registerWorkflowCommands(program: Command) {
    const workflow = program.command('workflow')
        .description('Workflow orchestration and validation (dbt, Airflow)');

    workflow.command('validate')
        .description('Validate a workflow project (dbt or Airflow)')
        .argument('<path>', 'Path to the project or DAG')
        .option('--output <path>', 'Output directory for evidence', 'artifacts/workflow')
        .action(async (targetPath, options) => {
            console.log(`Validating workflow at ${targetPath}...`);
            try {
                // Find repo root to locate the python module
                let repoRoot: string;
                const gitRootResult = spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf-8' });
                if (gitRootResult.status === 0) {
                    repoRoot = gitRootResult.stdout.trim();
                } else {
                    repoRoot = process.cwd();
                }

                // Find Python interpreter
                let pythonPath = 'python3';
                const venvPython = path.join(repoRoot, '.venv', 'bin', 'python');
                const venvPythonWin = path.join(repoRoot, '.venv', 'Scripts', 'python.exe');

                if (existsSync(venvPython)) {
                    pythonPath = venvPython;
                } else if (existsSync(venvPythonWin)) {
                    pythonPath = venvPythonWin;
                }

                const cliPath = path.join(repoRoot, 'summit', 'workflow', 'cli.py');

                // Ensure we use the right PYTHONPATH
                const env = { ...process.env, PYTHONPATH: repoRoot };

                const args = [cliPath, 'validate', targetPath, '--output', options.output];

                const result = spawnSync(pythonPath, args, { env, encoding: 'utf-8' });

                if (result.stdout) process.stdout.write(result.stdout);
                if (result.stderr) process.stderr.write(result.stderr);

                if (result.status !== 0) {
                    process.exit(result.status || 1);
                }
            } catch (error: any) {
                console.error(`Validation failed: ${error.message}`);
                process.exit(1);
            }
        });
}
