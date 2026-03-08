"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateWorkflow = validateWorkflow;
exports.registerWorkflowCommands = registerWorkflowCommands;
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const fs_1 = __importDefault(require("fs"));
/**
 * Validates a workflow project using the Python-based validator.
 */
async function validateWorkflow(projectPath, options) {
    console.log(chalk_1.default.blue(`\n🔍 Validating ${options.adapter} workflow at ${projectPath}...`));
    const pythonPath = process.env.PYTHON_PATH || 'python3';
    const scriptPath = path_1.default.resolve(process.cwd(), 'summit/workflow/cli.py');
    if (!fs_1.default.existsSync(scriptPath)) {
        console.error(chalk_1.default.red(`❌ Workflow CLI script not found at ${scriptPath}`));
        process.exit(1);
    }
    const args = [scriptPath, 'validate', projectPath, '--adapter', options.adapter];
    if (options.runId) {
        args.push('--run-id', options.runId);
    }
    const result = (0, child_process_1.spawnSync)(pythonPath, args, {
        stdio: 'inherit',
        env: { ...process.env, PYTHONPATH: process.cwd() }
    });
    if (result.status !== 0) {
        console.error(chalk_1.default.red(`\n❌ Validation failed for ${projectPath}`));
        process.exit(1);
    }
    console.log(chalk_1.default.green('✅ Artifacts generated in artifacts/workflow/'));
}
/**
 * Registers the workflow command group.
 */
function registerWorkflowCommands(program) {
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
