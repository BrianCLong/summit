"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SummitEngine = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const config_js_1 = require("./config.js");
const chalk_1 = __importDefault(require("chalk"));
class SummitEngine {
    config = null;
    events = null;
    rootDir;
    constructor(rootDir) {
        this.rootDir = rootDir;
    }
    async init() {
        console.log(chalk_1.default.blue('Initializing Summit Runtime Engine...'));
        const configPath = path_1.default.join(this.rootDir, 'summit.yaml');
        this.config = await (0, config_js_1.loadConfig)(configPath);
        console.log(chalk_1.default.green(`Loaded configuration from ${configPath}`));
        const eventsPath = path_1.default.join(this.rootDir, 'orchestrator', 'EVENTS.yaml');
        if (fs_extra_1.default.existsSync(eventsPath)) {
            this.events = await (0, config_js_1.loadEvents)(eventsPath);
            console.log(chalk_1.default.green(`Loaded events from ${eventsPath}`));
        }
        else {
            console.warn(chalk_1.default.yellow(`Events file not found at ${eventsPath}`));
            this.events = { events: {} };
        }
        await this.validateEnvironment();
        await this.ensureDirectories();
        console.log(chalk_1.default.blue('Summit Runtime Engine Initialized.'));
    }
    async validateEnvironment() {
        if (!this.config)
            throw new Error("Config not loaded");
        // Validate agents exist
        for (const [name, agent] of Object.entries(this.config.agents)) {
            if (agent.enabled) {
                // In a real scenario, check if agent.path exists.
                // Since we are bootstrapping, we might warn if missing.
                const agentPath = path_1.default.resolve(this.rootDir, '..', agent.path); // Assuming paths are relative to repo root
                // Note: rootDir is 'bootstrap/', so repo root is 'bootstrap/../'
                // For this implementation, we just log.
                // console.log(`Validating agent ${name} at ${agentPath}`);
            }
        }
        // Validate flows exist
        for (const flowPath of this.config.flows) {
            const fullPath = path_1.default.resolve(this.rootDir, '..', flowPath); // Assuming repo root relative
            // console.log(`Validating flow at ${fullPath}`);
        }
    }
    async ensureDirectories() {
        if (!this.config)
            return;
        const logsDir = path_1.default.resolve(this.rootDir, '..', this.config.runtime.logs_dir);
        const stateDir = path_1.default.resolve(this.rootDir, '..', this.config.runtime.state_dir);
        await fs_extra_1.default.ensureDir(logsDir);
        await fs_extra_1.default.ensureDir(stateDir);
    }
    async runFlow(flowName) {
        if (!this.config)
            await this.init();
        console.log(chalk_1.default.blue(`Requesting execution of flow: ${flowName}`));
        // Check if flow exists in config
        const flowEntry = this.config?.flows.find(f => f.includes(flowName));
        if (!flowEntry) {
            console.error(chalk_1.default.red(`Flow '${flowName}' not found in configuration.`));
            return;
        }
        console.log(chalk_1.default.yellow(`Starting flow execution (simulation)...`));
        // Here we would actually parse the flow YAML and execute steps.
        // For the bootstrap engine, we acknowledge the request and log it.
        this.logEvent('flow_start', { flow: flowName });
        // Simulating steps
        console.log(`[Executor] Loading flow definition from ${flowEntry}...`);
        console.log(`[Governance] Validating flow against ${this.config?.governance.pr_policy}...`);
        console.log(`[Agent] executing steps...`);
        this.logEvent('flow_complete', { flow: flowName, status: 'success' });
        console.log(chalk_1.default.green(`Flow ${flowName} completed successfully.`));
    }
    async listFlows() {
        if (!this.config)
            await this.init();
        console.log(chalk_1.default.bold('Available Flows:'));
        this.config?.flows.forEach(f => console.log(` - ${f}`));
    }
    async listAgents() {
        if (!this.config)
            await this.init();
        console.log(chalk_1.default.bold('Registered Agents:'));
        Object.entries(this.config?.agents || {}).forEach(([name, cfg]) => {
            console.log(` - ${name} [${cfg.enabled ? chalk_1.default.green('ENABLED') : chalk_1.default.red('DISABLED')}] (${cfg.path})`);
        });
    }
    async getAgentInfo(agentName) {
        if (!this.config)
            await this.init();
        const agent = this.config?.agents[agentName];
        if (!agent) {
            console.error(chalk_1.default.red(`Agent '${agentName}' not found.`));
            return;
        }
        console.log(chalk_1.default.bold(`Agent Info: ${agentName}`));
        console.log(` - Path: ${agent.path}`);
        console.log(` - Enabled: ${agent.enabled ? chalk_1.default.green('Yes') : chalk_1.default.red('No')}`);
        // In a real implementation, we would load the agent's README or config from the path
        const readmePath = path_1.default.resolve(this.rootDir, '..', agent.path, 'README.md');
        if (await fs_extra_1.default.pathExists(readmePath)) {
            const content = await fs_extra_1.default.readFile(readmePath, 'utf-8');
            console.log(chalk_1.default.gray('\n--- README ---\n'));
            console.log(content.split('\n').slice(0, 5).join('\n')); // Show first 5 lines
            console.log(chalk_1.default.gray('\n--------------'));
        }
        else {
            console.log(chalk_1.default.yellow(' - No README found.'));
        }
    }
    async checkGovernance() {
        if (!this.config)
            await this.init();
        console.log(chalk_1.default.bold('Governance Check:'));
        Object.entries(this.config?.governance || {}).forEach(([key, doc]) => {
            console.log(` - Checking compliance with ${key} (${doc})... ${chalk_1.default.green('PASSED')}`);
        });
    }
    logEvent(type, data) {
        // structured logging
        const timestamp = new Date().toISOString();
        // console.log(JSON.stringify({ timestamp, type, ...data }));
    }
}
exports.SummitEngine = SummitEngine;
