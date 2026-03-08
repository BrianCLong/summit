#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const init_1 = require("./commands/init");
const check_1 = require("./commands/check");
const test_1 = require("./commands/test");
const release_1 = require("./commands/release");
const local_task_1 = require("./commands/local-task");
const task_1 = require("./commands/task");
const capability_1 = require("./commands/capability");
const program = new commander_1.Command();
program
    .name('summitctl')
    .description('Summit Control Plane CLI')
    .version('0.1.0');
// Register new commands
program.addCommand(init_1.initCommand);
program.addCommand(check_1.checkCommand);
program.addCommand(test_1.testCommand);
program.addCommand(release_1.releaseCommand);
// Register task commands
// We keep the old task commands under a "local-task" group to avoid conflicts
// and eventually migrate them.
program.addCommand(local_task_1.localTaskCommand);
// We also expose the new agentic task command
program.addCommand(task_1.taskCommand);
program.addCommand(capability_1.capabilityCommand);
program.parse();
