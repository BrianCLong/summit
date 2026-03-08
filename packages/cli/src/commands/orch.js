"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.orchCommands = void 0;
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const fs_1 = __importDefault(require("fs"));
const orchestrator_1 = require("@summit/orchestrator");
function getLogPath() {
    const dir = path_1.default.join(os_1.default.homedir(), '.summit', 'orchestrator');
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
    }
    return path_1.default.join(dir, 'events.jsonl');
}
const team = new commander_1.Command('team')
    .description('Team operations')
    .command('spawn <name>')
    .description('Spawn a new team')
    .action(async (name) => {
    const logPath = getLogPath();
    const event = {
        evidence_id: `EVID-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        type: 'TEAM_CREATED',
        team_id: name,
        payload: { name, members: [] }
    };
    await (0, orchestrator_1.appendEvent)(logPath, event);
    console.log(chalk_1.default.green(`Spawning team: ${name}`));
    console.log(chalk_1.default.dim(`Event logged to ${logPath}`));
});
const task = new commander_1.Command('task')
    .description('Task operations')
    .command('create <subject>')
    .description('Create a new task')
    .action(async (subject) => {
    const logPath = getLogPath();
    const taskId = `task-${Date.now()}`;
    const event = {
        evidence_id: `EVID-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        type: 'TASK_CREATED',
        team_id: 'default',
        payload: {
            id: taskId,
            subject,
            status: 'pending',
            blockedBy: [],
            blocks: [],
            timestamps: { created: new Date().toISOString() }
        }
    };
    await (0, orchestrator_1.appendEvent)(logPath, event);
    console.log(chalk_1.default.blue(`Creating task: ${subject} (ID: ${taskId})`));
});
const msg = new commander_1.Command('msg')
    .description('Messaging operations')
    .command('send <to> <text>')
    .description('Send a message')
    .action(async (to, text) => {
    const logPath = getLogPath();
    const event = {
        evidence_id: `EVID-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        type: 'MESSAGE_SENT',
        team_id: 'default',
        payload: {
            message_id: `msg-${Date.now()}`,
            to,
            text,
            created_at: new Date().toISOString()
        }
    };
    await (0, orchestrator_1.appendEvent)(logPath, event);
    console.log(chalk_1.default.cyan(`Sending message to ${to}: ${text}`));
});
exports.orchCommands = {
    root: new commander_1.Command('orch')
        .description('Orchestration commands')
        .addCommand(team)
        .addCommand(task)
        .addCommand(msg)
};
