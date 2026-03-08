"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const engine_js_1 = require("./engine.js");
const path_1 = __importDefault(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const url_1 = require("url");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
// The CLI is running from bootstrap/src/cli.ts, so root of bootstrap is up one level
const bootstrapRoot = path_1.default.resolve(__dirname, '..');
const program = new commander_1.Command();
const engine = new engine_js_1.SummitEngine(bootstrapRoot);
program
    .name('summit')
    .description('Summit Orchestrator CLI')
    .version('1.0.0');
program.command('init')
    .description('Initialize the Summit Runtime')
    .action(async () => {
    try {
        await engine.init();
    }
    catch (e) {
        console.error(chalk_1.default.red('Initialization failed:'), e);
        process.exit(1);
    }
});
program.command('run <flow>')
    .description('Run a specific flow')
    .action(async (flow) => {
    try {
        await engine.runFlow(flow);
    }
    catch (e) {
        console.error(chalk_1.default.red('Flow execution failed:'), e);
        process.exit(1);
    }
});
program.command('flows')
    .description('List available flows')
    .action(async () => {
    await engine.listFlows();
});
program.command('agents')
    .description('List registered agents')
    .action(async () => {
    await engine.listAgents();
});
program.command('agent <name>')
    .description('Get info about a specific agent')
    .action(async (name) => {
    await engine.getAgentInfo(name);
});
program.command('governance')
    .description('Run governance checks')
    .action(async () => {
    await engine.checkGovernance();
});
program.parse();
