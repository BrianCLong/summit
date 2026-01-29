import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { appendEvent, OrchestratorEvent } from '@summit/orchestrator';

function getLogPath() {
    const dir = path.join(os.homedir(), '.summit', 'orchestrator');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return path.join(dir, 'events.jsonl');
}

const team = new Command('team')
  .description('Team operations')
  .command('spawn <name>')
  .description('Spawn a new team')
  .action(async (name) => {
    const logPath = getLogPath();
    const event: OrchestratorEvent = {
        evidence_id: `EVID-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        type: 'TEAM_CREATED',
        team_id: name,
        payload: { name, members: [] }
    };
    await appendEvent(logPath, event);
    console.log(chalk.green(`Spawning team: ${name}`));
    console.log(chalk.dim(`Event logged to ${logPath}`));
  });

const task = new Command('task')
  .description('Task operations')
  .command('create <subject>')
  .description('Create a new task')
  .action(async (subject) => {
    const logPath = getLogPath();
    const taskId = `task-${Date.now()}`;
    const event: OrchestratorEvent = {
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
    await appendEvent(logPath, event);
    console.log(chalk.blue(`Creating task: ${subject} (ID: ${taskId})`));
  });

const msg = new Command('msg')
  .description('Messaging operations')
  .command('send <to> <text>')
  .description('Send a message')
  .action(async (to, text) => {
    const logPath = getLogPath();
    const event: OrchestratorEvent = {
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
    await appendEvent(logPath, event);
    console.log(chalk.cyan(`Sending message to ${to}: ${text}`));
  });

export const orchCommands = {
    root: new Command('orch')
        .description('Orchestration commands')
        .addCommand(team)
        .addCommand(task)
        .addCommand(msg)
};
