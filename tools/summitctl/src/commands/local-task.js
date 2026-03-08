"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.localTaskCommand = void 0;
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const store_1 = require("../store");
const git_ops_1 = require("../git-ops");
const store = new store_1.Store();
exports.localTaskCommand = new commander_1.Command('local-task')
    .description('Manage local tasks');
exports.localTaskCommand
    .command('init')
    .description('Initialize a new local task')
    .argument('<title>', 'Task title')
    .action((title) => {
    const task = store.addTask(title);
    console.log(chalk_1.default.green(`Task created: [${task.id}] ${task.title}`));
});
exports.localTaskCommand
    .command('list')
    .description('List active local tasks')
    .option('-a, --all', 'List all tasks including archived')
    .action((options) => {
    const tasks = store.listTasks(options.all ? undefined : 'active');
    if (tasks.length === 0) {
        console.log(chalk_1.default.yellow('No tasks found.'));
        return;
    }
    console.log(chalk_1.default.blue('Tasks:'));
    tasks.forEach(task => {
        let color = chalk_1.default.white;
        if (task.status === 'ready-for-pr')
            color = chalk_1.default.cyan;
        if (task.status === 'archived')
            color = chalk_1.default.gray;
        console.log(color(`[${task.id}] ${task.status.padEnd(12)} - ${task.title}`));
    });
});
exports.localTaskCommand
    .command('ready')
    .description('Mark a local task as ready for PR')
    .argument('<taskId>', 'Task ID')
    .action((taskId) => {
    const task = store.updateTaskStatus(taskId, 'ready-for-pr');
    if (task) {
        console.log(chalk_1.default.green(`Task ${taskId} marked as ready for PR.`));
    }
    else {
        console.error(chalk_1.default.red(`Task ${taskId} not found.`));
    }
});
exports.localTaskCommand
    .command('archive')
    .description('Archive a local task')
    .argument('<taskId>', 'Task ID')
    .action((taskId) => {
    const task = store.updateTaskStatus(taskId, 'archived');
    if (task) {
        console.log(chalk_1.default.green(`Task ${taskId} archived.`));
    }
    else {
        console.error(chalk_1.default.red(`Task ${taskId} not found.`));
    }
});
exports.localTaskCommand
    .command('velocity')
    .description('Show daily velocity')
    .action(() => {
    const velocity = store.getVelocity();
    console.log(chalk_1.default.blue('Daily Velocity (Tasks Completed):'));
    Object.entries(velocity).forEach(([date, count]) => {
        console.log(`${date}: ${count}`);
    });
});
exports.localTaskCommand
    .command('pr')
    .description('Create a PR for a local task')
    .argument('<taskId>', 'Task ID')
    .action(async (taskId) => {
    await (0, git_ops_1.createPR)(taskId);
});
