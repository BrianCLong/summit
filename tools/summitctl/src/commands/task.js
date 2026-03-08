"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskCommand = void 0;
const commander_1 = require("commander");
const axios_1 = __importDefault(require("axios"));
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
exports.taskCommand = new commander_1.Command('task')
    .description('Manage agent tasks');
const API_URL = process.env.SUMMIT_API_URL || 'http://localhost:4000/agentic';
exports.taskCommand
    .command('submit')
    .description('Submit a new task to the agentic control plane')
    .argument('<description>', 'Description of the task (issue summary)')
    .requiredOption('-r, --repo <repo>', 'Repository name')
    .option('-k, --kind <kind>', 'Task kind (plan, scaffold, implement, test, review, docs)', 'plan')
    .option('-b, --budget <budget>', 'Budget in USD', parseFloat, 10)
    .action(async (description, options) => {
    const spinner = (0, ora_1.default)('Submitting task...').start();
    try {
        const response = await axios_1.default.post(`${API_URL}/tasks`, {
            issue: description,
            repo: options.repo,
            kind: options.kind,
            budgetUSD: options.budget,
            context: {
                cli_version: '0.1.0',
                submitted_at: new Date().toISOString()
            }
        });
        spinner.succeed(chalk_1.default.green('Task submitted successfully!'));
        console.log(chalk_1.default.bold('\nTask Details:'));
        console.log(`  ID: ${chalk_1.default.cyan(response.data.taskId)}`);
        console.log(`  Status: ${chalk_1.default.yellow(response.data.status)}`);
        console.log(`  Message: ${response.data.message}`);
    }
    catch (error) {
        spinner.fail(chalk_1.default.red('Failed to submit task'));
        if (axios_1.default.isAxiosError(error)) {
            console.error(chalk_1.default.red(`Error: ${error.response?.data?.error || error.message}`));
            if (error.response?.data?.details) {
                console.error(chalk_1.default.yellow('Details:'), error.response.data.details);
            }
        }
        else {
            console.error(chalk_1.default.red(error.message));
        }
    }
});
exports.taskCommand
    .command('status')
    .description('Get status of a task')
    .argument('<taskId>', 'Task ID')
    .action(async (taskId) => {
    const spinner = (0, ora_1.default)(`Fetching status for task ${taskId}...`).start();
    try {
        const response = await axios_1.default.get(`${API_URL}/tasks/${taskId}`);
        spinner.stop();
        const task = response.data;
        console.log(chalk_1.default.bold(`\nTask ${taskId}`));
        console.log(`  State: ${getStateColor(task.state)(task.state)}`);
        console.log(`  Progress: ${task.progress}%`);
        console.log(`  Repo: ${task.data.repo}`);
        console.log(`  Issue: ${task.data.issue}`);
        if (task.failedReason) {
            console.log(chalk_1.default.red(`  Failed Reason: ${task.failedReason}`));
        }
        if (task.finishedOn) {
            console.log(`  Finished: ${new Date(task.finishedOn).toLocaleString()}`);
        }
    }
    catch (error) {
        spinner.fail(chalk_1.default.red('Failed to get task status'));
        console.error(chalk_1.default.red(error.message));
    }
});
function getStateColor(state) {
    switch (state) {
        case 'completed': return chalk_1.default.green;
        case 'failed': return chalk_1.default.red;
        case 'active': return chalk_1.default.blue;
        case 'delayed': return chalk_1.default.yellow;
        default: return chalk_1.default.white;
    }
}
