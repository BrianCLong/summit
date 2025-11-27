#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { execSync } from 'child_process';
import inquirer from 'inquirer';

const program = new Command();
const TASK_REGISTRY_PATH = path.join(process.cwd(), '.agentic-tasks.yaml');

// Ensure task registry exists
if (!fs.existsSync(TASK_REGISTRY_PATH)) {
  fs.writeFileSync(TASK_REGISTRY_PATH, yaml.dump({ tasks: [] }));
}

interface Task {
  id: string;
  name: string;
  agent: string;
  status: 'pending' | 'in-progress' | 'pr-open' | 'merged' | 'archived';
  branch: string;
  createdAt: string;
  prUrl?: string;
  metrics?: {
    startTime: number;
    prOpenTime?: number;
    mergeTime?: number;
    revisions: number;
  };
}

function loadTasks(): { tasks: Task[] } {
  try {
    return yaml.load(fs.readFileSync(TASK_REGISTRY_PATH, 'utf8')) as any;
  } catch (e) {
    return { tasks: [] };
  }
}

function saveTasks(data: { tasks: Task[] }) {
  fs.writeFileSync(TASK_REGISTRY_PATH, yaml.dump(data));
}

program
  .name('summitctl')
  .description('Agentic Control Plane CLI for Summit')
  .version('0.0.1');

program
  .command('task')
  .description('Manage agentic tasks')
  .argument('<action>', 'init, status, or archive')
  .argument('[arg]', 'Mission name or Task ID')
  .action(async (action, arg) => {
    const data = loadTasks();

    if (action === 'init') {
      const missionName = arg || 'unnamed-mission';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const taskId = `task-${Math.floor(Math.random() * 10000)}`;

      console.log(chalk.blue(`Initializing task ${taskId} for mission: ${missionName}`));

      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'agent',
          message: 'Select an agent for this mission:',
          choices: [
            'claude-code',
            'codex',
            'jules-gemini',
            'summit-intelgraph'
          ]
        },
        {
          type: 'input',
          name: 'description',
          message: 'Brief description of the mission:'
        }
      ]);

      const branchName = `agentic/${answers.agent}/${taskId}-${missionName}`;

      const newTask: Task = {
        id: taskId,
        name: missionName,
        agent: answers.agent,
        status: 'pending',
        branch: branchName,
        createdAt: new Date().toISOString(),
        metrics: {
          startTime: Date.now(),
          revisions: 0
        }
      };

      data.tasks.push(newTask);
      saveTasks(data);

      // Create branch
      try {
        execSync(`git checkout -b ${branchName}`);
        console.log(chalk.green(`✔ Created branch ${branchName}`));

        // Create task file
        const taskDir = path.join(process.cwd(), '.agentic-prompts');
        fs.ensureDirSync(taskDir);
        const taskFile = path.join(taskDir, `${taskId}.md`);

        // Copy prompt template
        const templatePath = path.join(process.cwd(), 'prompts', `${answers.agent}.md`);
        let content = '';
        if (fs.existsSync(templatePath)) {
          content = fs.readFileSync(templatePath, 'utf8');
        } else {
          content = `# Mission: ${missionName}\n\nAgent: ${answers.agent}\n`;
        }

        content += `\n\n## Specific Instructions\n${answers.description}\n`;
        fs.writeFileSync(taskFile, content);

        execSync(`git add ${taskFile}`);
        execSync(`git commit -m "feat: init agentic task ${taskId}"`);
        // execSync(`git push -u origin ${branchName}`); // Commented out for local demo

        console.log(chalk.green(`✔ Task initialized and committed.`));
        console.log(chalk.yellow(`Run 'git push' to trigger the agentic workflow.`));

      } catch (error) {
        console.error(chalk.red('Error creating branch or file:'), error);
      }

    } else if (action === 'status') {
      console.log(chalk.bold('\nActive Tasks:'));
      console.table(data.tasks.filter(t => t.status !== 'archived').map(t => ({
        ID: t.id,
        Name: t.name,
        Agent: t.agent,
        Status: t.status,
        Branch: t.branch
      })));

    } else if (action === 'archive') {
      if (!arg) {
        console.error(chalk.red('Task ID is required for archive.'));
        return;
      }
      const taskIndex = data.tasks.findIndex(t => t.id === arg);
      if (taskIndex === -1) {
        console.error(chalk.red('Task not found.'));
        return;
      }

      data.tasks[taskIndex].status = 'archived';
      if (data.tasks[taskIndex].metrics) {
        data.tasks[taskIndex].metrics!.mergeTime = Date.now();
      }
      saveTasks(data);
      console.log(chalk.green(`✔ Task ${arg} archived.`));
    }
  });

program.parse();
